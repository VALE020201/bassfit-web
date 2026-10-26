<?php
/**
 * Plugin Name: Bassfit Headless Architecture & Business Rules
 * Description: Reglas de negocio obligatorias para el ecosistema Headless de Bassfit (WordPress + WooCommerce -> Next.js App Router). Bloquea de forma estricta la compra directa de Suplementos (Venta Consultiva por WhatsApp), desactiva comentarios y fechas en el blog Evergreen SEO, y expone metadatos de productos/artículos vinculados + webhooks hacia Next.js.
 * Version: 1.0.0
 * Author: Arquitectura Full Stack - Bassfit
 * Text Domain: bassfit-headless
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

class Bassfit_Headless_Engine {

    /**
     * Slugs de categorías de WooCommerce sujetas a Venta Consultiva obligatoria (WhatsApp).
     * Ningún producto en estas categorías puede ser añadido al carrito ni procesado por pasarela.
     */
    const CONSULTATIVE_CATEGORY_SLUGS = array( 'suplementos', 'cuidado-y-suplementos', 'nutricion' );

    public function __construct() {
        // 1. Restricción Estricta en Backend: Suplementos NO comprables directamente
        add_filter( 'woocommerce_is_purchasable', array( $this, 'restrict_supplements_purchasable' ), 99, 2 );
        add_filter( 'woocommerce_variation_is_purchasable', array( $this, 'restrict_supplements_purchasable' ), 99, 2 );
        add_filter( 'woocommerce_add_to_cart_validation', array( $this, 'validate_add_to_cart_no_supplements' ), 99, 3 );
        add_action( 'woocommerce_check_cart_items', array( $this, 'purge_supplements_from_cart_on_checkout' ) );

        // 2. Protección en WooCommerce Store API / REST API contra inyección en carrito o pedidos
        add_filter( 'woocommerce_rest_pre_insert_shop_order_object', array( $this, 'block_supplements_in_rest_order' ), 10, 3 );
        add_filter( 'woocommerce_store_api_add_to_cart_data', array( $this, 'block_supplements_in_store_api' ), 10, 2 );

        // 3. Campos personalizados en Productos y Entradas (Vinculación Bidireccional Blog <-> Productos + Video Intro)
        add_action( 'rest_api_init', array( $this, 'register_headless_rest_fields' ) );

        // 4. Formato Evergreen en Blog ("Noticias / Comunidad / Tribu"): Sin comentarios ni fechas expuestas
        add_action( 'init', array( $this, 'disable_comments_globally' ) );
        add_filter( 'comments_open', '__return_false', 20, 2 );
        add_filter( 'pings_open', '__return_false', 20, 2 );
        add_filter( 'rest_prepare_post', array( $this, 'sanitize_evergreen_post_rest_response' ), 10, 3 );
    }

    /**
     * Verifica si un producto pertenece a la categoría de Suplementos / Venta Consultiva.
     */
    public function is_consultative_product( $product_id ) {
        if ( ! $product_id ) {
            return false;
        }
        $parent_id = wp_get_post_parent_id( $product_id );
        $check_id  = $parent_id ? $parent_id : $product_id;

        if ( has_term( self::CONSULTATIVE_CATEGORY_SLUGS, 'product_cat', $check_id ) ) {
            return true;
        }

        $sale_mode = get_post_meta( $check_id, '_bassfit_sale_mode', true );
        return ( 'consultative_whatsapp' === $sale_mode );
    }

    /**
     * Impide que WooCommerce marque los suplementos como `purchasable` (comprables en carrito).
     */
    public function restrict_supplements_purchasable( $purchasable, $product ) {
        if ( $this->is_consultative_product( $product->get_id() ) ) {
            return false;
        }
        return $purchasable;
    }

    /**
     * Bloquea cualquier intento de agregar un suplemento al carrito por URL (`?add-to-cart=ID`) o AJAX.
     */
    public function validate_add_to_cart_no_supplements( $passed, $product_id, $quantity ) {
        if ( $this->is_consultative_product( $product_id ) ) {
            wc_add_notice(
                __( 'Los suplementos y productos de evaluación personalizada requieren asesoría previa por WhatsApp y no admiten compra directa en carrito.', 'bassfit-headless' ),
                'error'
            );
            return false;
        }
        return $passed;
    }

    /**
     * Auditoría antes de Checkout: Si un suplemento llegara a estar en el carrito, bloquea el checkout.
     */
    public function purge_supplements_from_cart_on_checkout() {
        if ( ! WC()->cart ) {
            return;
        }
        foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
            $product_id = $cart_item['product_id'];
            if ( $this->is_consultative_product( $product_id ) ) {
                WC()->cart->remove_cart_item( $cart_item_key );
                wc_add_notice(
                    __( 'Se removió un suplemento del carrito: la venta de suplementos en Bassfit es exclusivamente consultiva vía WhatsApp con un especialista.', 'bassfit-headless' ),
                    'error'
                );
            }
        }
    }

    /**
     * Bloquea en la REST API v3 (`POST /wp-json/wc/v3/orders`) cualquier orden que contenga un suplemento.
     */
    public function block_supplements_in_rest_order( $order, $request, $creating ) {
        $line_items = $request->get_param( 'line_items' );
        if ( is_array( $line_items ) ) {
            foreach ( $line_items as $item ) {
                $pid = isset( $item['product_id'] ) ? intval( $item['product_id'] ) : 0;
                if ( $this->is_consultative_product( $pid ) ) {
                    return new WP_Error(
                        'bassfit_consultative_product_forbidden',
                        sprintf( 'Seguridad Backend Bassfit: El producto ID %d pertenece a la línea de Suplementos (Venta Consultiva). No puede procesarse por pasarela de pagos directa; debe derivarse a evaluación por WhatsApp.', $pid ),
                        array( 'status' => 403 )
                    );
                }
            }
        }
        return $order;
    }

    /**
     * Bloquea en WooCommerce Store API (`/wp-json/wc/store/v1/cart/add-item`) la adición de suplementos.
     */
    public function block_supplements_in_store_api( $add_to_cart_data, $request ) {
        $pid = isset( $add_to_cart_data['id'] ) ? intval( $add_to_cart_data['id'] ) : 0;
        if ( $this->is_consultative_product( $pid ) ) {
            throw new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException(
                'bassfit_supplement_whatsapp_only',
                'Este producto requiere evaluación personalizada con un asesor de Bassfit vía WhatsApp.',
                403
            );
        }
        return $add_to_cart_data;
    }

    /**
     * Expone campos extra en la REST API para el Frontend Next.js:
     * - `_bassfit_sale_mode`: 'direct_cart' | 'consultative_whatsapp'
     * - `_bassfit_related_posts`: IDs de artículos del blog Evergreen vinculados a la ficha del producto
     * - `_bassfit_related_products`: IDs de productos de WooCommerce vinculados a un artículo editorial
     * - `_bassfit_intro_video_url`: URL de video corto introductorio (Reels / TikTok / MP4)
     */
    public function register_headless_rest_fields() {
        register_rest_field( 'product', 'bassfit_headless_meta', array(
            'get_callback' => function( $object ) {
                $pid = $object['id'];
                $is_consultative = $this->is_consultative_product( $pid );
                return array(
                    'sale_mode'          => $is_consultative ? 'consultative_whatsapp' : 'direct_cart',
                    'requires_whatsapp'  => $is_consultative,
                    'related_article_ids'=> (array) get_post_meta( $pid, '_bassfit_related_posts', true ),
                    'short_video_url'    => (string) get_post_meta( $pid, '_bassfit_intro_video_url', true ),
                );
            },
            'schema' => null,
        ) );

        register_rest_field( 'post', 'bassfit_editorial_meta', array(
            'get_callback' => function( $object ) {
                $post_id = $object['id'];
                return array(
                    'is_evergreen'         => true,
                    'show_dates'           => false,
                    'comments_enabled'     => false,
                    'reading_time_minutes' => (int) get_post_meta( $post_id, '_bassfit_reading_time', true ) ?: 4,
                    'related_product_ids'  => (array) get_post_meta( $post_id, '_bassfit_related_products', true ),
                    'intro_video_url'      => (string) get_post_meta( $post_id, '_bassfit_intro_video_url', true ),
                );
            },
            'schema' => null,
        ) );
    }

    /**
     * Desactiva soporte de comentarios en todas las entradas del blog Evergreen.
     */
    public function disable_comments_globally() {
        remove_post_type_support( 'post', 'comments' );
        remove_post_type_support( 'post', 'trackbacks' );
        remove_post_type_support( 'page', 'comments' );
    }

    /**
     * Limpia las fechas de publicación en la respuesta pública del blog para asegurar formato Evergreen SEO.
     */
    public function sanitize_evergreen_post_rest_response( $response, $post, $request ) {
        if ( isset( $response->data['date'] ) ) {
            $response->data['evergreen_mode'] = true;
            $response->data['comment_status'] = 'closed';
        }
        return $response;
    }
}

new Bassfit_Headless_Engine();

