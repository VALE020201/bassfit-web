<?php
/**
 * Plugin Name: Bassfit — Gestión de Inventario
 * Description: Inventario centralizado sobre WooCommerce (única fuente de verdad): indicadores de disponibilidad, validación de stock en el checkout con bloqueo anti-sobreventa, devolución de unidades al cancelar/reembolsar y registro de movimientos con responsable.
 * Version: 1.0.0
 * Author: Bassfit Perú
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( ! class_exists( 'Bassfit_Inventory' ) ) :

class Bassfit_Inventory {

    const DB_VERSION        = '1.1';
    const MAX_QTY_PER_LINE  = 50;   // Tope de unidades de un mismo producto por pedido web.
    const RATE_LIMIT_IP     = 8;    // Pedidos web por IP cada 10 minutos.
    const RATE_LIMIT_GLOBAL = 40;   // Pedidos web totales cada 10 minutos (protección contra vaciado de stock).
    const DEFAULT_HOLD_MINS = 20;   // Ventana de espera por defecto (20 minutos) para verificar el pago en pasarela.

    /** @var array|null Contexto del movimiento en curso (motivo, pedido, nota). */
    private static $context = null;

    /** @var array product_id => id del último registro creado en esta petición. */
    private static $last_log_ids = array();

    public static function init() {
        add_action( 'init', array( __CLASS__, 'maybe_install' ), 30 );

        // Registro de movimientos (captura todas las vías: panel, editor WooCommerce, edición rápida, pedidos).
        add_action( 'woocommerce_product_set_stock', array( __CLASS__, 'on_stock_set' ), 10, 1 );
        add_action( 'woocommerce_variation_set_stock', array( __CLASS__, 'on_stock_set' ), 10, 1 );
        add_action( 'woocommerce_update_product', array( __CLASS__, 'on_product_saved' ), 20, 2 );
        add_action( 'woocommerce_new_product', array( __CLASS__, 'on_product_saved' ), 20, 2 );

        // Anotar el motivo cuando el cambio proviene de un pedido.
        add_action( 'woocommerce_reduce_order_item_stock', array( __CLASS__, 'on_order_item_reduced' ), 10, 3 );
        add_action( 'woocommerce_restore_order_item_stock', array( __CLASS__, 'on_order_item_restored' ), 10, 4 );
        add_action( 'woocommerce_restock_refunded_item', array( __CLASS__, 'on_refund_restock' ), 10, 5 );

        // Devolución de unidades al marcar un pedido como Reembolsado (Cancelado y Fallido ya los gestiona WooCommerce).
        add_action( 'woocommerce_order_status_refunded', array( __CLASS__, 'restore_on_refunded' ), 5 );

        // Configuración y ejecución de la cancelación automática a los 20 minutos (liberación de stock por falta de pago).
        add_filter( 'woocommerce_cancel_unpaid_order', array( __CLASS__, 'filter_cancel_unpaid_order' ), 10, 2 );
        add_action( 'bassfit_cancel_expired_unpaid_orders_event', array( __CLASS__, 'run_expired_orders_cleanup' ) );
        add_action( 'init', array( __CLASS__, 'maybe_schedule_cleanup_cron' ), 35 );
        add_action( 'template_redirect', array( __CLASS__, 'maybe_opportunistic_cleanup' ), 5 );
        add_action( 'admin_init', array( __CLASS__, 'maybe_opportunistic_cleanup' ), 5 );

        // Panel administrativo.
        add_action( 'admin_menu', array( __CLASS__, 'register_menu' ), 20 );
        add_action( 'admin_post_bassfit_inventory_update', array( __CLASS__, 'handle_admin_update' ) );
        add_action( 'admin_post_bassfit_inventory_settings', array( __CLASS__, 'handle_admin_settings' ) );
    }

    /* ======================================================================
     * INSTALACIÓN
     * ==================================================================== */

    public static function table() {
        global $wpdb;
        return $wpdb->prefix . 'bassfit_inventory_log';
    }

    public static function maybe_install() {
        if ( get_option( 'bassfit_inventory_db_version' ) === self::DB_VERSION || ! function_exists( 'wc_get_products' ) ) {
            return;
        }
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $table   = self::table();
        $charset = $wpdb->get_charset_collate();
        dbDelta( "CREATE TABLE {$table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            product_id bigint(20) unsigned NOT NULL,
            product_name varchar(255) NOT NULL DEFAULT '',
            sku varchar(100) NOT NULL DEFAULT '',
            old_qty int(11) NULL,
            new_qty int(11) NULL,
            change_qty int(11) NOT NULL DEFAULT 0,
            reason varchar(255) NOT NULL DEFAULT '',
            note text NULL,
            order_id bigint(20) unsigned NULL,
            user_id bigint(20) unsigned NOT NULL DEFAULT 0,
            user_login varchar(100) NOT NULL DEFAULT '',
            created_at datetime NOT NULL,
            PRIMARY KEY  (id),
            KEY product_id (product_id),
            KEY created_at (created_at)
        ) {$charset};" );

        // La gestión de inventario de WooCommerce debe estar activa para descontar stock en los pedidos.
        if ( 'yes' !== get_option( 'woocommerce_manage_stock' ) ) {
            update_option( 'woocommerce_manage_stock', 'yes' );
        }
        if ( false === get_option( 'bassfit_inventory_restock_on_refund' ) ) {
            add_option( 'bassfit_inventory_restock_on_refund', 'yes' );
        }
        if ( false === get_option( 'bassfit_inventory_hold_minutes' ) ) {
            add_option( 'bassfit_inventory_hold_minutes', self::DEFAULT_HOLD_MINS );
        }
        // Ajustar también la opción oficial de WooCommerce para pedidos pendientes
        update_option( 'woocommerce_hold_stock_minutes', (int) get_option( 'bassfit_inventory_hold_minutes', self::DEFAULT_HOLD_MINS ) );

        // Línea base: guarda la cantidad actual de cada producto (sin inventar cantidades, sin registrar movimiento).
        $ids = wc_get_products( array( 'limit' => -1, 'status' => array( 'publish', 'draft', 'pending', 'private' ), 'return' => 'ids' ) );
        foreach ( $ids as $pid ) {
            if ( metadata_exists( 'post', $pid, '_bassfit_last_logged_stock' ) ) {
                continue;
            }
            $product = wc_get_product( $pid );
            if ( ! $product ) {
                continue;
            }
            $qty = ( $product->managing_stock() && null !== $product->get_stock_quantity() ) ? (string) (int) $product->get_stock_quantity() : '';
            update_post_meta( $pid, '_bassfit_last_logged_stock', $qty );
        }

        update_option( 'bassfit_inventory_db_version', self::DB_VERSION );
    }

    /* ======================================================================
     * DISPONIBILIDAD (única fuente: WooCommerce)
     * ==================================================================== */

    public static function low_threshold( $product = null ) {
        if ( $product && method_exists( $product, 'get_low_stock_amount' ) ) {
            $own = $product->get_low_stock_amount();
            if ( '' !== $own && null !== $own ) {
                return max( 0, (int) $own );
            }
        }
        return max( 0, (int) get_option( 'woocommerce_notify_low_stock_amount', 2 ) );
    }

    /**
     * @return array{key:string,label:string,qty:int|null,purchasable:bool,threshold:int}
     */
    public static function availability( $product ) {
        $threshold = self::low_threshold( $product );
        if ( ! $product || ! $product->managing_stock() || null === $product->get_stock_quantity() ) {
            return array( 'key' => 'sin_cargar', 'label' => 'Stock por confirmar', 'qty' => null, 'purchasable' => false, 'threshold' => $threshold );
        }
        $qty = (int) $product->get_stock_quantity();
        if ( $qty <= 0 ) {
            return array( 'key' => 'agotado', 'label' => 'Agotado', 'qty' => 0, 'purchasable' => false, 'threshold' => $threshold );
        }
        if ( $qty <= $threshold ) {
            return array( 'key' => 'ultimas', 'label' => 'Últimas unidades', 'qty' => $qty, 'purchasable' => true, 'threshold' => $threshold );
        }
        return array( 'key' => 'disponible', 'label' => 'Disponible', 'qty' => $qty, 'purchasable' => true, 'threshold' => $threshold );
    }

    /** Lectura directa de BD (sin caché de objetos) para validar dentro del bloqueo. */
    private static function read_stock_fresh( $product_id ) {
        global $wpdb;
        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key IN ('_manage_stock','_stock')",
            $product_id
        ), OBJECT_K );
        $managed = isset( $rows['_manage_stock'] ) && 'yes' === $rows['_manage_stock']->meta_value;
        $qty     = ( isset( $rows['_stock'] ) && '' !== $rows['_stock']->meta_value && null !== $rows['_stock']->meta_value ) ? (int) $rows['_stock']->meta_value : null;
        return array( 'managed' => $managed, 'qty' => $qty );
    }

    /* ======================================================================
     * BLOQUEO ANTI-SOBREVENTA
     * ==================================================================== */

    private static function lock_name() {
        global $wpdb;
        return 'bassfit_inv_' . $wpdb->prefix;
    }

    private static function acquire_lock( $timeout = 10 ) {
        global $wpdb;
        return 1 === (int) $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, %d)', self::lock_name(), $timeout ) );
    }

    private static function release_lock() {
        global $wpdb;
        $wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', self::lock_name() ) );
    }

    /* ======================================================================
     * CHECKOUT WEB: validación + creación de pedido + descuento atómico
     * ==================================================================== */

    private static function client_fingerprint() {
        $remote = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
        $fwd    = '';
        if ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
            $parts = explode( ',', sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) );
            $fwd   = trim( $parts[0] );
        }
        return md5( $remote . '|' . $fwd );
    }

    private static function rate_limited() {
        $ip_key     = 'bf_co_ip_' . self::client_fingerprint();
        $global_key = 'bf_co_global';
        $ip_hits     = (int) get_transient( $ip_key );
        $global_hits = (int) get_transient( $global_key );
        if ( $ip_hits >= self::RATE_LIMIT_IP || $global_hits >= self::RATE_LIMIT_GLOBAL ) {
            return true;
        }
        set_transient( $ip_key, $ip_hits + 1, 10 * MINUTE_IN_SECONDS );
        set_transient( $global_key, $global_hits + 1, 10 * MINUTE_IN_SECONDS );
        return false;
    }

    private static function error( $status, $code, $message, $extra = array() ) {
        return array(
            'status' => $status,
            'body'   => array_merge( array( 'success' => false, 'code' => $code, 'error' => $message ), $extra ),
        );
    }

    /**
     * @param array    $data              Cuerpo JSON recibido.
     * @param callable $is_consultative   Callback que indica si un producto es de venta consultiva.
     */
    public static function process_checkout( array $data, $is_consultative ) {
        if ( ! function_exists( 'wc_create_order' ) ) {
            return self::error( 503, 'woocommerce_inactive', 'WooCommerce no está activo.' );
        }

        // Honeypot opcional: si un bot rellena el campo oculto, se descarta.
        if ( ! empty( $data['website'] ) ) {
            return self::error( 400, 'invalid_request', 'Solicitud no válida.' );
        }

        $items = ( isset( $data['items'] ) && is_array( $data['items'] ) ) ? $data['items'] : array();
        if ( empty( $items ) || count( $items ) > 60 ) {
            return self::error( 400, 'empty_cart', 'El carrito está vacío o no es válido.' );
        }

        if ( self::rate_limited() ) {
            return self::error( 429, 'rate_limited', 'Recibimos demasiados pedidos en poco tiempo. Espera unos minutos o escríbenos por WhatsApp.' );
        }

        // 1. Normalizar y agrupar líneas por producto (las variedades comparten el mismo stock).
        $requested = array();
        $invalid   = array();
        foreach ( $items as $item ) {
            if ( ! is_array( $item ) ) {
                continue;
            }
            $pid = 0;
            if ( ! empty( $item['sku'] ) ) {
                $pid = (int) wc_get_product_id_by_sku( sanitize_text_field( $item['sku'] ) );
            }
            if ( ! $pid && ! empty( $item['wcId'] ) ) {
                $candidate = absint( $item['wcId'] );
                if ( $candidate && wc_get_product( $candidate ) ) {
                    $pid = $candidate;
                }
            }
            $qty = isset( $item['quantity'] ) ? (int) $item['quantity'] : 0;
            if ( ! $pid ) {
                $invalid[] = array(
                    'sku'  => isset( $item['sku'] ) ? sanitize_text_field( $item['sku'] ) : '',
                    'name' => isset( $item['name'] ) ? sanitize_text_field( $item['name'] ) : '',
                );
                continue;
            }
            if ( $qty < 1 ) {
                continue;
            }
            if ( ! isset( $requested[ $pid ] ) ) {
                $requested[ $pid ] = array( 'qty' => 0, 'variants' => array() );
            }
            $requested[ $pid ]['qty'] += $qty;
            if ( ! empty( $item['variant'] ) ) {
                $vname = sanitize_text_field( mb_substr( (string) $item['variant'], 0, 120 ) );
                $requested[ $pid ]['variants'][ $vname ] = ( isset( $requested[ $pid ]['variants'][ $vname ] ) ? $requested[ $pid ]['variants'][ $vname ] : 0 ) + $qty;
            }
        }

        if ( ! empty( $invalid ) ) {
            return self::error( 409, 'invalid_product', 'Algunos productos del carrito ya no existen en el catálogo.', array( 'items' => $invalid ) );
        }
        if ( empty( $requested ) ) {
            return self::error( 400, 'empty_cart', 'No hay productos válidos en el carrito.' );
        }

        // 2. Validaciones de catálogo (fuera del bloqueo).
        $products = array();
        foreach ( $requested as $pid => $r ) {
            $product = wc_get_product( $pid );
            if ( ! $product || 'publish' !== $product->get_status() ) {
                return self::error( 409, 'invalid_product', 'Un producto del carrito ya no está disponible.', array( 'items' => array( array( 'wcId' => $pid ) ) ) );
            }
            if ( is_callable( $is_consultative ) && call_user_func( $is_consultative, $pid ) ) {
                return self::error( 403, 'consultative_product', 'Uno de los productos requiere Venta Consultiva vía WhatsApp.' );
            }
            if ( $r['qty'] > self::MAX_QTY_PER_LINE ) {
                return self::error( 409, 'max_quantity', 'Para más de ' . self::MAX_QTY_PER_LINE . ' unidades de un mismo producto, coordina tu pedido por WhatsApp.', array(
                    'items' => array( array( 'wcId' => $pid, 'sku' => $product->get_sku(), 'name' => $product->get_name(), 'requested' => $r['qty'], 'available' => self::MAX_QTY_PER_LINE ) ),
                ) );
            }
            $products[ $pid ] = $product;
        }

        // 3. Sección crítica: verificar stock real y descontar dentro de un bloqueo exclusivo.
        if ( ! self::acquire_lock( 10 ) ) {
            return self::error( 503, 'busy', 'La tienda está procesando otros pedidos. Intenta nuevamente en unos segundos.' );
        }

        try {
            $problems = array();
            foreach ( $requested as $pid => $r ) {
                $stock = self::read_stock_fresh( $pid );
                if ( ! $stock['managed'] || null === $stock['qty'] ) {
                    $problems[] = array( 'wcId' => $pid, 'sku' => $products[ $pid ]->get_sku(), 'name' => $products[ $pid ]->get_name(), 'requested' => $r['qty'], 'available' => 0, 'reason' => 'sin_stock_cargado' );
                } elseif ( $stock['qty'] < $r['qty'] ) {
                    $problems[] = array( 'wcId' => $pid, 'sku' => $products[ $pid ]->get_sku(), 'name' => $products[ $pid ]->get_name(), 'requested' => $r['qty'], 'available' => max( 0, $stock['qty'] ), 'reason' => 'stock_insuficiente' );
                }
            }
            if ( ! empty( $problems ) ) {
                return self::error( 409, 'insufficient_stock', 'No hay stock suficiente para algunos productos.', array( 'items' => $problems ) );
            }

            $order = wc_create_order( array( 'created_via' => 'bassfit-web' ) );
            if ( is_wp_error( $order ) ) {
                return self::error( 500, 'order_error', 'No se pudo registrar el pedido.' );
            }
            foreach ( $requested as $pid => $r ) {
                $item_id = $order->add_product( wc_get_product( $pid ), $r['qty'] );
                if ( $item_id && ! empty( $r['variants'] ) ) {
                    $labels = array();
                    foreach ( $r['variants'] as $vname => $vqty ) {
                        $labels[] = $vname . ' x' . $vqty;
                    }
                    wc_add_order_item_meta( $item_id, 'Variedad', implode( ', ', $labels ) );
                }
            }

            if ( ! empty( $data['customer'] ) && is_array( $data['customer'] ) ) {
                $c = $data['customer'];
                $order->set_billing_first_name( sanitize_text_field( $c['fullName'] ?? '' ) );
                $order->set_billing_email( sanitize_email( $c['email'] ?? '' ) );
                $order->set_billing_phone( sanitize_text_field( $c['phone'] ?? '' ) );
                $order->set_billing_address_1( sanitize_text_field( $c['address'] ?? '' ) );
                $order->set_billing_city( sanitize_text_field( $c['city'] ?? 'Lima' ) );
                $order->set_billing_country( 'PE' );
            }

            // Asociar automáticamente el pedido al cliente autenticado si tiene sesión activa
            $auth_customer = null;
            if ( class_exists( 'Bassfit_Customer_Auth' ) ) {
                if ( ! empty( $data['customerToken'] ) ) {
                    $auth_customer = Bassfit_Customer_Auth::validate_token( $data['customerToken'] );
                }
                if ( ! $auth_customer ) {
                    $auth_customer = Bassfit_Customer_Auth::get_current_customer();
                }
            }
            if ( $auth_customer && $auth_customer instanceof WP_User ) {
                $order->set_customer_id( $auth_customer->ID );
                if ( empty( $order->get_billing_email() ) ) {
                    $order->set_billing_email( $auth_customer->user_email );
                }
                if ( empty( $order->get_billing_first_name() ) ) {
                    $order->set_billing_first_name( get_user_meta( $auth_customer->ID, 'first_name', true ) ?: $auth_customer->display_name );
                    $order->set_billing_last_name( get_user_meta( $auth_customer->ID, 'last_name', true ) ?: '' );
                }
                if ( empty( $order->get_billing_phone() ) ) {
                    $order->set_billing_phone( get_user_meta( $auth_customer->ID, 'billing_phone', true ) ?: '' );
                }
            }

            $order->calculate_totals();
            $order->save();
            $order_id = $order->get_id();

            self::$context = array( 'reason' => 'Venta web — pedido #' . $order_id . ' (en espera de pago)', 'order_id' => $order_id );
            wc_reduce_stock_levels( $order_id );
            $order->get_data_store()->set_stock_reduced( $order_id, true );
            self::$context = null;

            $order = wc_get_order( $order_id );
            $hold_minutes = max( 1, (int) get_option( 'bassfit_inventory_hold_minutes', self::DEFAULT_HOLD_MINS ) );
            $order->update_meta_data( '_bassfit_hold_expires_at', time() + ( $hold_minutes * MINUTE_IN_SECONDS ) );
            $order->save();

            $order->update_status(
                'on-hold',
                sprintf( 'Pedido web #%d generado. Se reservaron las unidades del inventario durante una ventana de %d minutos. Si el pago no es verificado antes de vencer el plazo, el pedido se cancelará automáticamente y las unidades regresarán al stock disponible.', $order_id, $hold_minutes )
            );

            $lines = array();
            foreach ( $order->get_items() as $item ) {
                $p   = $item->get_product();
                $qty = (int) $item->get_quantity();
                $lines[] = array(
                    'wcId'      => $p ? $p->get_id() : 0,
                    'sku'       => $p ? $p->get_sku() : '',
                    'name'      => $item->get_name(),
                    'quantity'  => $qty,
                    'unitPrice' => $qty > 0 ? round( (float) $item->get_total() / $qty, 2 ) : 0,
                    'lineTotal' => round( (float) $item->get_total(), 2 ),
                    'stockLeft' => $p ? (int) wc_get_product( $p->get_id() )->get_stock_quantity() : null,
                );
            }

            return array(
                'status' => 200,
                'body'   => array(
                    'success' => true,
                    'orderId' => $order_id,
                    'total'   => (float) $order->get_total(),
                    'items'   => $lines,
                ),
            );
        } finally {
            self::$context = null;
            self::release_lock();
        }
    }

    /* ======================================================================
     * REGISTRO DE MOVIMIENTOS
     * ==================================================================== */

    private static function current_actor() {
        $uid = get_current_user_id();
        if ( $uid ) {
            $u = get_userdata( $uid );
            return array( $uid, $u ? $u->user_login : ( 'usuario #' . $uid ) );
        }
        return array( 0, 'Sistema / Cliente web' );
    }

    private static function default_reason() {
        if ( wp_doing_ajax() && isset( $_POST['action'] ) && 'bassfit_quick_save_product' === $_POST['action'] ) { // phpcs:ignore WordPress.Security.NonceVerification
            return 'Edición rápida Bassfit (editor de producto)';
        }
        if ( is_admin() && get_current_user_id() ) {
            return 'Edición en WordPress (editor de producto)';
        }
        if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
            return 'Actualización vía API';
        }
        return 'Actualización del sistema';
    }

    private static function insert_log( $product, $old, $new, $reason = null, $note = null, $order_id = null ) {
        global $wpdb;
        list( $uid, $login ) = self::current_actor();
        $ctx = self::$context;
        $wpdb->insert( self::table(), array(
            'product_id'   => $product->get_id(),
            'product_name' => mb_substr( $product->get_name(), 0, 255 ),
            'sku'          => mb_substr( (string) $product->get_sku(), 0, 100 ),
            'old_qty'      => $old,
            'new_qty'      => $new,
            'change_qty'   => (int) $new - (int) $old,
            'reason'       => mb_substr( $reason ?: ( $ctx['reason'] ?? self::default_reason() ), 0, 255 ),
            'note'         => $note ?: ( $ctx['note'] ?? null ),
            'order_id'     => $order_id ?: ( $ctx['order_id'] ?? null ),
            'user_id'      => $uid,
            'user_login'   => $login,
            'created_at'   => current_time( 'mysql' ),
        ) );
        self::$last_log_ids[ $product->get_id() ] = (int) $wpdb->insert_id;
    }

    public static function on_stock_set( $product ) {
        if ( ! is_object( $product ) ) {
            return;
        }
        $pid = $product->get_id();
        // Releer desde BD para obtener el valor definitivo.
        $fresh = self::read_stock_fresh( $pid );
        $new   = $fresh['managed'] ? $fresh['qty'] : null;

        $had     = metadata_exists( 'post', $pid, '_bassfit_last_logged_stock' );
        $old_raw = get_post_meta( $pid, '_bassfit_last_logged_stock', true );
        $old     = ( $had && '' !== $old_raw ) ? (int) $old_raw : null;

        if ( $old === $new ) {
            return;
        }
        self::insert_log( $product, $old, $new );
        update_post_meta( $pid, '_bassfit_last_logged_stock', null === $new ? '' : (string) $new );

        // Un cambio hecho por un administrador (no por un pedido) cuenta como stock verificado.
        if ( empty( self::$context['order_id'] ) && get_current_user_id() && current_user_can( 'manage_woocommerce' ) ) {
            update_post_meta( $pid, '_bassfit_stock_verified', current_time( 'mysql' ) );
        }
    }

    public static function on_product_saved( $product_id, $product = null ) {
        $product = $product && is_object( $product ) ? $product : wc_get_product( $product_id );
        if ( $product ) {
            self::on_stock_set( $product );
        }
    }

    private static function annotate( $product_id, $reason, $order_id ) {
        global $wpdb;
        if ( empty( self::$last_log_ids[ $product_id ] ) ) {
            return;
        }
        $wpdb->update( self::table(), array( 'reason' => mb_substr( $reason, 0, 255 ), 'order_id' => $order_id ), array( 'id' => self::$last_log_ids[ $product_id ] ) );
    }

    private static function status_label( $order ) {
        $status = $order->get_status();
        $names  = function_exists( 'wc_get_order_statuses' ) ? wc_get_order_statuses() : array();
        return isset( $names[ 'wc-' . $status ] ) ? $names[ 'wc-' . $status ] : $status;
    }

    public static function on_order_item_reduced( $item, $change, $order ) {
        $product = ( is_array( $change ) && isset( $change['product'] ) ) ? $change['product'] : $item->get_product();
        if ( $product && empty( self::$context ) ) {
            self::annotate( $product->get_id(), 'Venta — pedido #' . $order->get_id() . ' (' . self::status_label( $order ) . ')', $order->get_id() );
        }
    }

    public static function on_order_item_restored( $item, $new_stock, $old_stock, $order ) {
        $product = $item->get_product();
        if ( $product ) {
            self::annotate( $product->get_id(), 'Devolución al inventario — pedido #' . $order->get_id() . ' (' . self::status_label( $order ) . ')', $order->get_id() );
        }
    }

    public static function on_refund_restock( $product_id, $old_stock, $new_stock, $order, $product ) {
        self::annotate( $product_id, 'Reposición por reembolso — pedido #' . $order->get_id(), $order->get_id() );
    }

    public static function restore_on_refunded( $order_id ) {
        if ( 'yes' === get_option( 'bassfit_inventory_restock_on_refund', 'yes' ) && function_exists( 'wc_maybe_increase_stock_levels' ) ) {
            wc_maybe_increase_stock_levels( $order_id );
        }
    }

    /* ======================================================================
     * CANCELACIÓN AUTOMÁTICA POR VENCIMIENTO DE TIEMPO (20 MINUTOS)
     * ==================================================================== */

    public static function hold_minutes() {
        return max( 1, (int) get_option( 'bassfit_inventory_hold_minutes', self::DEFAULT_HOLD_MINS ) );
    }

    public static function filter_cancel_unpaid_order( $should_cancel, $order ) {
        if ( ! $order instanceof WC_Order ) {
            return $should_cancel;
        }
        if ( 'bassfit-web' === $order->get_created_via() ) {
            return true;
        }
        return $should_cancel;
    }

    public static function maybe_schedule_cleanup_cron() {
        if ( ! wp_next_scheduled( 'bassfit_cancel_expired_unpaid_orders_event' ) ) {
            wp_schedule_event( time(), 'every_minute_or_hourly', 'bassfit_cancel_expired_unpaid_orders_event' );
        }
    }

    /**
     * Limpieza oportunista: corre cada 2 minutos máximo ante peticiones normales
     * para asegurar que la cancelación ocurra a los 20 minutos exactos incluso
     * si WP-Cron tiene retrasos por tráfico.
     */
    public static function maybe_opportunistic_cleanup() {
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }
        $last = (int) get_transient( 'bassfit_last_orders_cleanup' );
        if ( time() - $last < 90 ) {
            return; // Throttle: evaluar máximo cada 90 segundos
        }
        set_transient( 'bassfit_last_orders_cleanup', time(), 120 );
        self::run_expired_orders_cleanup();
    }

    public static function run_expired_orders_cleanup() {
        if ( ! function_exists( 'wc_get_orders' ) ) {
            return;
        }
        $hold_mins = self::hold_minutes();
        $cutoff    = time() - ( $hold_mins * MINUTE_IN_SECONDS );

        // 1. Buscar pedidos generados desde la web que sigan 'on-hold' o 'pending'
        $orders = wc_get_orders( array(
            'limit'        => 30,
            'status'       => array( 'on-hold', 'pending' ),
            'created_via'  => 'bassfit-web',
            'date_created' => '<' . ( $cutoff + 30 ), // con margen pequeño
            'return'       => 'objects',
        ) );

        if ( empty( $orders ) ) {
            return;
        }

        foreach ( $orders as $order ) {
            if ( ! $order instanceof WC_Order ) {
                continue;
            }

            $expires_at = (int) $order->get_meta( '_bassfit_hold_expires_at', true );
            if ( ! $expires_at ) {
                // Si no tiene meta específico, basarse en la fecha de creación
                $date_created = $order->get_date_created();
                $expires_at   = $date_created ? $date_created->getTimestamp() + ( $hold_mins * MINUTE_IN_SECONDS ) : 0;
            }

            if ( time() >= $expires_at ) {
                $order_id = $order->get_id();
                // Cancelar pedido: dispara woocommerce_order_status_cancelled -> wc_maybe_increase_stock_levels() -> devuelve stock automáticamente
                $order->update_status(
                    'cancelled',
                    sprintf( 'Pedido cancelado automáticamente por el sistema: se cumplió el tiempo límite de espera (%d minutos) sin verificación de pago en la pasarela. Las unidades reservadas regresaron automáticamente al inventario disponible.', $hold_mins )
                );
            }
        }
    }

    /* ======================================================================
     * PANEL ADMINISTRATIVO: "Gestión de inventario"
     * ==================================================================== */

    public static function register_menu() {
        add_menu_page(
            'Gestión de inventario',
            '📊 Gestión de inventario',
            'manage_woocommerce',
            'bassfit-inventario',
            array( __CLASS__, 'render_page' ),
            'dashicons-clipboard',
            56
        );
    }

    public static function handle_admin_update() {
        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_die( 'No tienes permisos para modificar el inventario.', 403 );
        }
        check_admin_referer( 'bassfit_inventory_update' );

        $pid     = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
        $mode    = isset( $_POST['mode'] ) ? sanitize_key( $_POST['mode'] ) : 'set';
        $qty_raw = isset( $_POST['qty'] ) ? trim( (string) wp_unslash( $_POST['qty'] ) ) : '';
        $note    = isset( $_POST['note'] ) ? sanitize_text_field( wp_unslash( $_POST['note'] ) ) : '';
        $back    = wp_get_referer() ? wp_get_referer() : admin_url( 'admin.php?page=bassfit-inventario' );
        $product = $pid ? wc_get_product( $pid ) : null;

        if ( ! $product || ! in_array( $mode, array( 'set', 'add', 'sub', 'confirm' ), true ) ) {
            wp_safe_redirect( add_query_arg( 'bf_msg', 'error_producto', $back ) );
            exit;
        }
        if ( 'confirm' !== $mode && ( '' === $qty_raw || ! preg_match( '/^\d+$/', $qty_raw ) ) ) {
            wp_safe_redirect( add_query_arg( 'bf_msg', 'error_cantidad', $back ) );
            exit;
        }
        $qty = (int) $qty_raw;

        if ( ! self::acquire_lock( 10 ) ) {
            wp_safe_redirect( add_query_arg( 'bf_msg', 'error_ocupado', $back ) );
            exit;
        }
        try {
            $fresh   = self::read_stock_fresh( $pid );
            $current = ( $fresh['managed'] && null !== $fresh['qty'] ) ? $fresh['qty'] : null;

            if ( 'confirm' === $mode ) {
                if ( null === $current ) {
                    wp_safe_redirect( add_query_arg( 'bf_msg', 'error_sin_stock', $back ) );
                    exit;
                }
                $new = $current;
            } elseif ( 'set' === $mode ) {
                $new = $qty;
            } elseif ( 'add' === $mode ) {
                $new = (int) $current + $qty;
            } else {
                $new = (int) $current - $qty;
                if ( $new < 0 ) {
                    wp_safe_redirect( add_query_arg( 'bf_msg', 'error_negativo', $back ) );
                    exit;
                }
            }

            $labels = array(
                'set'     => 'Ajuste manual (establecer cantidad)',
                'add'     => 'Ingreso de mercadería (+' . $qty . ')',
                'sub'     => 'Salida / merma manual (−' . $qty . ')',
                'confirm' => 'Conteo físico confirmado (sin cambios)',
            );
            self::$context = array( 'reason' => $labels[ $mode ], 'note' => $note );

            if ( $new === $current ) {
                // Sin cambio de cantidad: se registra la confirmación del conteo.
                self::insert_log( $product, $current, $new, $labels['confirm'], $note );
            } elseif ( ! $product->managing_stock() ) {
                $product->set_manage_stock( true );
                $product->set_backorders( 'no' );
                $product->set_stock_quantity( $new );
                $product->save();
                self::on_stock_set( wc_get_product( $pid ) );
            } else {
                wc_update_product_stock( $product, $new, 'set' );
            }
            update_post_meta( $pid, '_bassfit_stock_verified', current_time( 'mysql' ) );
        } finally {
            self::$context = null;
            self::release_lock();
        }

        wp_safe_redirect( add_query_arg( array( 'bf_msg' => 'ok', 'bf_pid' => $pid ), $back ) );
        exit;
    }

    public static function handle_admin_settings() {
        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_die( 'No tienes permisos.', 403 );
        }
        check_admin_referer( 'bassfit_inventory_settings' );
        $threshold = isset( $_POST['low_threshold'] ) ? max( 0, absint( $_POST['low_threshold'] ) ) : 2;
        $hold_mins = isset( $_POST['hold_minutes'] ) ? max( 1, absint( $_POST['hold_minutes'] ) ) : self::DEFAULT_HOLD_MINS;
        update_option( 'woocommerce_notify_low_stock_amount', $threshold );
        update_option( 'bassfit_inventory_hold_minutes', $hold_mins );
        update_option( 'woocommerce_hold_stock_minutes', $hold_mins );
        update_option( 'bassfit_inventory_restock_on_refund', ! empty( $_POST['restock_on_refund'] ) ? 'yes' : 'no' );
        wp_safe_redirect( add_query_arg( 'bf_msg', 'ajustes_ok', admin_url( 'admin.php?page=bassfit-inventario' ) ) );
        exit;
    }

    private static function badge( $key, $label ) {
        $styles = array(
            'disponible' => 'background:#dcfce7;color:#166534;border:1px solid #86efac;',
            'ultimas'    => 'background:#fef3c7;color:#92400e;border:1px solid #fcd34d;',
            'agotado'    => 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;',
            'sin_cargar' => 'background:#e2e8f0;color:#334155;border:1px solid #cbd5e1;',
        );
        return '<span style="display:inline-block;padding:3px 9px;border-radius:999px;font-weight:700;font-size:11px;' . esc_attr( $styles[ $key ] ?? '' ) . '">' . esc_html( $label ) . '</span>';
    }

    public static function render_page() {
        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_die( 'No tienes permisos.', 403 );
        }
        $tab = isset( $_GET['tab'] ) && 'movimientos' === $_GET['tab'] ? 'movimientos' : 'stock'; // phpcs:ignore WordPress.Security.NonceVerification
        $base = admin_url( 'admin.php?page=bassfit-inventario' );
        $msgs = array(
            'ok'              => array( 'success', '✅ Inventario actualizado y movimiento registrado.' ),
            'ajustes_ok'      => array( 'success', '✅ Ajustes de inventario guardados.' ),
            'error_cantidad'  => array( 'error', 'Ingresa una cantidad válida (número entero, 0 o mayor).' ),
            'error_negativo'  => array( 'error', 'La salida supera el stock actual. El inventario no puede quedar en negativo.' ),
            'error_producto'  => array( 'error', 'Producto no válido.' ),
            'error_ocupado'   => array( 'error', 'Se está procesando un pedido en este momento. Intenta de nuevo en unos segundos.' ),
            'error_sin_stock' => array( 'error', 'Este producto aún no tiene stock cargado. Usa "Establecer" para cargar la cantidad real.' ),
        );
        $msg = isset( $_GET['bf_msg'] ) ? sanitize_key( $_GET['bf_msg'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
        ?>
        <div class="wrap" style="max-width:1280px;">
            <div style="background:#0f172a;color:#fff;padding:18px 22px;border-radius:14px;border-bottom:4px solid #ff5500;margin:14px 0 16px;">
                <h1 style="color:#fff;margin:0;font-size:21px;font-weight:800;">📊 Gestión de inventario — Bassfit Perú</h1>
                <p style="color:#cbd5e1;margin:6px 0 0;font-size:13px;">Fuente única de stock de la tienda. Los cambios se reflejan automáticamente en bassfitperu.com y cada movimiento queda registrado con fecha y responsable.</p>
            </div>
            <?php if ( isset( $msgs[ $msg ] ) ) : ?>
                <div class="notice notice-<?php echo esc_attr( $msgs[ $msg ][0] ); ?> is-dismissible"><p><strong><?php echo esc_html( $msgs[ $msg ][1] ); ?></strong></p></div>
            <?php endif; ?>
            <h2 class="nav-tab-wrapper" style="margin-bottom:14px;">
                <a href="<?php echo esc_url( $base ); ?>" class="nav-tab <?php echo 'stock' === $tab ? 'nav-tab-active' : ''; ?>">📦 Stock de productos</a>
                <a href="<?php echo esc_url( add_query_arg( 'tab', 'movimientos', $base ) ); ?>" class="nav-tab <?php echo 'movimientos' === $tab ? 'nav-tab-active' : ''; ?>">🧾 Movimientos de inventario</a>
            </h2>
            <?php
            if ( 'movimientos' === $tab ) {
                self::render_movements();
            } else {
                self::render_stock_table();
            }
            ?>
        </div>
        <?php
    }

    private static function render_stock_table() {
        $search = isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
        $filter = isset( $_GET['estado'] ) ? sanitize_key( $_GET['estado'] ) : 'todos'; // phpcs:ignore WordPress.Security.NonceVerification
        $hl     = isset( $_GET['bf_pid'] ) ? absint( $_GET['bf_pid'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification

        $products = wc_get_products( array( 'limit' => -1, 'status' => array( 'publish', 'draft', 'private', 'pending' ), 'orderby' => 'title', 'order' => 'ASC' ) );
        $rows     = array();
        $counts   = array( 'todos' => 0, 'disponible' => 0, 'ultimas' => 0, 'agotado' => 0, 'sin_cargar' => 0, 'pendiente' => 0 );
        foreach ( $products as $p ) {
            $a        = self::availability( $p );
            $verified = get_post_meta( $p->get_id(), '_bassfit_stock_verified', true );
            $counts['todos']++;
            $counts[ $a['key'] ]++;
            if ( ! $verified ) {
                $counts['pendiente']++;
            }
            if ( '' !== $search && false === mb_stripos( $p->get_name() . ' ' . $p->get_sku(), $search ) ) {
                continue;
            }
            if ( 'todos' !== $filter ) {
                if ( 'pendiente' === $filter ? (bool) $verified : $a['key'] !== $filter ) {
                    continue;
                }
            }
            $rows[] = array( $p, $a, $verified );
        }
        $base    = admin_url( 'admin.php?page=bassfit-inventario' );
        $filters = array(
            'todos'      => 'Todos',
            'disponible' => '🟢 Disponibles',
            'ultimas'    => '🟡 Últimas unidades',
            'agotado'    => '🔴 Agotados',
            'sin_cargar' => '⚪ Sin stock cargado',
            'pendiente'  => '⚠️ Pendientes de verificar',
        );
        ?>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
            <?php foreach ( $filters as $key => $label ) : ?>
                <a href="<?php echo esc_url( add_query_arg( array( 'estado' => $key, 's' => $search ), $base ) ); ?>" style="text-decoration:none;padding:7px 12px;border-radius:10px;font-weight:700;font-size:12px;<?php echo $filter === $key ? 'background:#ff5500;color:#fff;' : 'background:#fff;color:#0f172a;border:1px solid #cbd5e1;'; ?>">
                    <?php echo esc_html( $label ); ?> (<?php echo (int) $counts[ $key ]; ?>)
                </a>
            <?php endforeach; ?>
        </div>

        <?php if ( $counts['pendiente'] > 0 ) : ?>
            <div class="notice notice-warning inline" style="margin:0 0 12px;"><p>
                <strong>⚠️ <?php echo (int) $counts['pendiente']; ?> producto(s) pendientes de verificar.</strong>
                Sus cantidades provienen del catálogo inicial cargado en la web y no han sido confirmadas por un administrador. Revisa el conteo físico y usa <em>Establecer</em> (si cambia) o <em>Confirmar conteo</em> (si es correcto).
            </p></div>
        <?php endif; ?>

        <form method="get" style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
            <input type="hidden" name="page" value="bassfit-inventario" />
            <input type="hidden" name="estado" value="<?php echo esc_attr( $filter ); ?>" />
            <input type="search" name="s" value="<?php echo esc_attr( $search ); ?>" placeholder="Buscar por nombre o SKU..." style="min-width:300px;padding:6px 10px;border-radius:8px;" />
            <button class="button">🔍 Buscar</button>
            <?php if ( '' !== $search ) : ?><a class="button-link" href="<?php echo esc_url( add_query_arg( 'estado', $filter, $base ) ); ?>">Limpiar</a><?php endif; ?>
        </form>

        <table class="widefat striped" style="border-radius:10px;overflow:hidden;">
            <thead><tr>
                <th style="width:52px;"></th>
                <th>Producto</th>
                <th>SKU</th>
                <th style="text-align:center;">Stock actual</th>
                <th>Disponibilidad</th>
                <th>Verificación</th>
                <th style="min-width:420px;">Actualizar inventario</th>
            </tr></thead>
            <tbody>
            <?php if ( empty( $rows ) ) : ?>
                <tr><td colspan="7" style="padding:18px;text-align:center;">No se encontraron productos con este filtro.</td></tr>
            <?php endif; ?>
            <?php foreach ( $rows as $row ) :
                list( $p, $a, $verified ) = $row;
                $pid = $p->get_id();
                ?>
                <tr<?php echo $hl === $pid ? ' style="outline:2px solid #22c55e;"' : ''; ?>>
                    <td><?php echo wp_kses_post( $p->get_image( array( 44, 44 ) ) ); ?></td>
                    <td>
                        <strong><a href="<?php echo esc_url( get_edit_post_link( $pid ) ); ?>"><?php echo esc_html( $p->get_name() ); ?></a></strong>
                        <?php if ( 'publish' !== $p->get_status() ) : ?><br><small style="color:#64748b;">(<?php echo esc_html( $p->get_status() ); ?>)</small><?php endif; ?>
                    </td>
                    <td><code><?php echo esc_html( $p->get_sku() ?: '—' ); ?></code></td>
                    <td style="text-align:center;font-size:18px;font-weight:800;"><?php echo null === $a['qty'] ? '—' : (int) $a['qty']; ?></td>
                    <td><?php echo self::badge( $a['key'], $a['label'] ); // phpcs:ignore WordPress.Security.EscapeOutput ?><br><small style="color:#64748b;">Aviso de últimas: ≤ <?php echo (int) $a['threshold']; ?></small></td>
                    <td>
                        <?php if ( $verified ) : ?>
                            <span style="color:#166534;font-weight:700;">✔ Verificado</span><br><small style="color:#64748b;"><?php echo esc_html( mysql2date( 'd/m/Y H:i', $verified ) ); ?></small>
                        <?php else : ?>
                            <span style="color:#b45309;font-weight:700;">⚠️ Pendiente</span><br><small style="color:#64748b;"><?php echo null === $a['qty'] ? 'Cargar stock' : 'Cantidad del catálogo inicial'; ?></small>
                        <?php endif; ?>
                    </td>
                    <td>
                        <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                            <?php wp_nonce_field( 'bassfit_inventory_update' ); ?>
                            <input type="hidden" name="action" value="bassfit_inventory_update" />
                            <input type="hidden" name="product_id" value="<?php echo (int) $pid; ?>" />
                            <select name="mode" style="border-radius:8px;">
                                <option value="set">Establecer en</option>
                                <option value="add">Ingreso (+)</option>
                                <option value="sub">Salida (−)</option>
                            </select>
                            <input type="number" name="qty" min="0" step="1" required style="width:80px;border-radius:8px;" placeholder="Cant." />
                            <input type="text" name="note" maxlength="200" placeholder="Nota (opcional)" style="width:140px;border-radius:8px;" />
                            <button class="button button-primary" style="background:#ff5500;border-color:#e04a00;">Guardar</button>
                        </form>
                        <?php if ( ! $verified && null !== $a['qty'] ) : ?>
                            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-top:6px;">
                                <?php wp_nonce_field( 'bassfit_inventory_update' ); ?>
                                <input type="hidden" name="action" value="bassfit_inventory_update" />
                                <input type="hidden" name="product_id" value="<?php echo (int) $pid; ?>" />
                                <input type="hidden" name="mode" value="confirm" />
                                <button class="button button-small">✔ Confirmar conteo (<?php echo (int) $a['qty']; ?> unid.)</button>
                            </form>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>

        <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-top:18px;background:#fff;border:1px solid #cbd5e1;border-radius:12px;padding:14px 16px;display:flex;flex-wrap:wrap;gap:16px;align-items:center;">
            <?php wp_nonce_field( 'bassfit_inventory_settings' ); ?>
            <input type="hidden" name="action" value="bassfit_inventory_settings" />
            <strong>⚙️ Ajustes:</strong>
            <label>Mostrar "Últimas unidades" cuando queden
                <input type="number" name="low_threshold" min="0" step="1" value="<?php echo (int) get_option( 'woocommerce_notify_low_stock_amount', 2 ); ?>" style="width:70px;" /> o menos
            </label>
            <label>⏱️ Tiempo de espera para pago en pasarela:
                <input type="number" name="hold_minutes" min="1" max="180" step="1" value="<?php echo (int) get_option( 'bassfit_inventory_hold_minutes', self::DEFAULT_HOLD_MINS ); ?>" style="width:70px;" /> minutos
            </label>
            <label><input type="checkbox" name="restock_on_refund" value="1" <?php checked( 'yes', get_option( 'bassfit_inventory_restock_on_refund', 'yes' ) ); ?> /> Devolver unidades al inventario cuando un pedido se marque como <em>Reembolsado</em></label>
            <button class="button">Guardar ajustes</button>
        </form>
        <p style="color:#64748b;font-size:12px;margin-top:10px;">
            ℹ️ <strong>Tiempo límite para pago (20 min):</strong> Cuando el cliente inicia la compra o checkout, las unidades quedan reservadas y descontadas del catálogo. Si en <strong><?php echo (int) get_option( 'bassfit_inventory_hold_minutes', self::DEFAULT_HOLD_MINS ); ?> minutos</strong> la pasarela no confirma el pago exitoso, el pedido pasa automáticamente a <strong>Cancelado</strong> y las unidades regresan al stock disponible de la tienda sin necesidad de intervención manual.
        </p>
        <?php
    }

    private static function render_movements() {
        global $wpdb;
        $table  = self::table();
        $search = isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
        $paged  = isset( $_GET['paged'] ) ? max( 1, absint( $_GET['paged'] ) ) : 1; // phpcs:ignore WordPress.Security.NonceVerification
        $per    = 50;
        $where  = '1=1';
        $args   = array();
        if ( '' !== $search ) {
            $like   = '%' . $wpdb->esc_like( $search ) . '%';
            $where .= ' AND (product_name LIKE %s OR sku LIKE %s OR reason LIKE %s OR user_login LIKE %s)';
            $args   = array( $like, $like, $like, $like );
        }
        $total_sql = "SELECT COUNT(*) FROM {$table} WHERE {$where}";
        $total     = (int) ( $args ? $wpdb->get_var( $wpdb->prepare( $total_sql, $args ) ) : $wpdb->get_var( $total_sql ) ); // phpcs:ignore WordPress.DB.PreparedSQL
        $list_sql  = "SELECT * FROM {$table} WHERE {$where} ORDER BY id DESC LIMIT %d OFFSET %d";
        $rows      = $wpdb->get_results( $wpdb->prepare( $list_sql, array_merge( $args, array( $per, ( $paged - 1 ) * $per ) ) ) ); // phpcs:ignore WordPress.DB.PreparedSQL
        $pages     = max( 1, (int) ceil( $total / $per ) );
        $base      = add_query_arg( 'tab', 'movimientos', admin_url( 'admin.php?page=bassfit-inventario' ) );
        ?>
        <form method="get" style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
            <input type="hidden" name="page" value="bassfit-inventario" />
            <input type="hidden" name="tab" value="movimientos" />
            <input type="search" name="s" value="<?php echo esc_attr( $search ); ?>" placeholder="Buscar producto, SKU, motivo o usuario..." style="min-width:320px;padding:6px 10px;border-radius:8px;" />
            <button class="button">🔍 Buscar</button>
            <span style="color:#64748b;"><?php echo (int) $total; ?> movimiento(s)</span>
        </form>
        <table class="widefat striped">
            <thead><tr>
                <th>Fecha</th><th>Producto</th><th>SKU</th>
                <th style="text-align:center;">Anterior</th><th style="text-align:center;">Nueva</th><th style="text-align:center;">Cambio</th>
                <th>Motivo</th><th>Pedido</th><th>Responsable</th><th>Nota</th>
            </tr></thead>
            <tbody>
            <?php if ( empty( $rows ) ) : ?>
                <tr><td colspan="10" style="padding:18px;text-align:center;">Aún no hay movimientos registrados. Se registrarán a partir de ahora.</td></tr>
            <?php endif; ?>
            <?php foreach ( $rows as $r ) :
                $chg   = (int) $r->change_qty;
                $color = $chg > 0 ? '#166534' : ( $chg < 0 ? '#991b1b' : '#475569' );
                ?>
                <tr>
                    <td><?php echo esc_html( mysql2date( 'd/m/Y H:i', $r->created_at ) ); ?></td>
                    <td><a href="<?php echo esc_url( get_edit_post_link( (int) $r->product_id ) ); ?>"><?php echo esc_html( $r->product_name ); ?></a></td>
                    <td><code><?php echo esc_html( $r->sku ); ?></code></td>
                    <td style="text-align:center;"><?php echo null === $r->old_qty ? '—' : (int) $r->old_qty; ?></td>
                    <td style="text-align:center;font-weight:700;"><?php echo null === $r->new_qty ? '—' : (int) $r->new_qty; ?></td>
                    <td style="text-align:center;font-weight:800;color:<?php echo esc_attr( $color ); ?>;"><?php echo ( $chg > 0 ? '+' : '' ) . (int) $chg; ?></td>
                    <td><?php echo esc_html( $r->reason ); ?></td>
                    <td><?php
                    if ( $r->order_id ) {
                        $o   = wc_get_order( (int) $r->order_id );
                        $url = $o ? $o->get_edit_order_url() : '';
                        echo $url ? '<a href="' . esc_url( $url ) . '">#' . (int) $r->order_id . '</a>' : '#' . (int) $r->order_id;
                    } else {
                        echo '—';
                    }
                    ?></td>
                    <td><?php echo esc_html( $r->user_login ); ?></td>
                    <td><?php echo esc_html( (string) $r->note ); ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        <?php if ( $pages > 1 ) : ?>
            <p style="margin-top:12px;">
                <?php for ( $i = 1; $i <= $pages; $i++ ) : ?>
                    <a class="button<?php echo $i === $paged ? ' button-primary' : ''; ?>" href="<?php echo esc_url( add_query_arg( array( 'paged' => $i, 's' => $search ), $base ) ); ?>"><?php echo (int) $i; ?></a>
                <?php endfor; ?>
            </p>
        <?php endif; ?>
        <?php
    }
}

Bassfit_Inventory::init();

endif;
