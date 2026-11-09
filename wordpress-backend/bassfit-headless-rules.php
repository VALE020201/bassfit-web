<?php
/**
 * Plugin Name: Bassfit Headless Architecture & Business Rules
 * Description: Reglas de negocio obligatorias para el ecosistema Headless de Bassfit (WordPress + WooCommerce). Bloquea la compra directa de Suplementos (Venta Consultiva por WhatsApp), desactiva comentarios/fechas en el blog Evergreen SEO, gestiona el Libro de Reclamaciones Virtual (INDECOPI) en el panel de WordPress y sincroniza pedidos/catálogo.
 * Version: 2.0.0
 * Author: Arquitectura Full Stack - Bassfit Perú
 * Text Domain: bassfit-headless
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

if ( ! class_exists( 'Bassfit_Headless_Engine' ) ) :

class Bassfit_Headless_Engine {

    /**
     * Slugs de categorías de WooCommerce sujetas a Venta Consultiva obligatoria (WhatsApp).
     */
    const CONSULTATIVE_CATEGORY_SLUGS = array( 'suplementos', 'cuidado-y-suplementos', 'nutricion', 'fajas-reductoras-consultiva' );

    public function __construct() {
        // 1. Restricción Estricta en Backend: Suplementos NO comprables directamente
        add_filter( 'woocommerce_is_purchasable', array( $this, 'restrict_supplements_purchasable' ), 99, 2 );
        add_filter( 'woocommerce_variation_is_purchasable', array( $this, 'restrict_supplements_purchasable' ), 99, 2 );
        add_filter( 'woocommerce_add_to_cart_validation', array( $this, 'validate_add_to_cart_no_supplements' ), 99, 3 );
        add_action( 'woocommerce_check_cart_items', array( $this, 'purge_supplements_from_cart_on_checkout' ) );

        // 2. Protección en WooCommerce Store API / REST API contra inyección en carrito o pedidos
        add_filter( 'woocommerce_rest_pre_insert_shop_order_object', array( $this, 'block_supplements_in_rest_order' ), 10, 3 );
        add_filter( 'woocommerce_store_api_add_to_cart_data', array( $this, 'block_supplements_in_store_api' ), 10, 2 );

        // 3. Campos personalizados y Endpoints REST API (Libro de Reclamaciones, Checkout y Catálogo)
        add_action( 'rest_api_init', array( $this, 'register_headless_rest_fields' ) );
        add_action( 'rest_api_init', array( $this, 'register_bassfit_api_routes' ) );

        // 4. Interceptor directo para rutas /api/reclamaciones, /api/checkout y /api/catalog
        add_action( 'init', array( $this, 'register_reclamaciones_cpt' ) );
        add_action( 'init', array( $this, 'intercept_direct_api_paths' ), 20 );

        // 5. Columnas, Simplificación de Productos y Panel de Videos en WordPress Admin
        add_filter( 'manage_bassfit_reclamo_posts_columns', array( $this, 'set_reclamo_columns' ) );
        add_action( 'manage_bassfit_reclamo_posts_custom_column', array( $this, 'render_reclamo_column' ), 10, 2 );
        add_action( 'add_meta_boxes', array( $this, 'register_reclamo_metabox' ), 99 );
        add_action( 'save_post', array( $this, 'save_video_metabox' ), 999 );
        add_action( 'wp_ajax_bassfit_quick_save_product', array( $this, 'handle_ajax_quick_save_product' ) );
        add_action( 'admin_menu', array( $this, 'register_videos_admin_menu' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_media_uploader' ) );
        add_action( 'admin_head', array( $this, 'clean_up_product_admin_screen' ) );

        // 6. Formato Evergreen en Blog ("Noticias / Comunidad / Tribu") y Blindaje OWASP XML-RPC
        add_action( 'init', array( $this, 'disable_comments_globally' ) );
        add_filter( 'comments_open', '__return_false', 20, 2 );
        add_filter( 'pings_open', '__return_false', 20, 2 );
        add_filter( 'xmlrpc_enabled', '__return_false' );
        add_filter( 'rest_prepare_post', array( $this, 'sanitize_evergreen_post_rest_response' ), 10, 3 );
    }

    /**
     * Registra el tipo de contenido "Libro de Reclamaciones" en el menú de WordPress Admin.
     */
    public function register_reclamaciones_cpt() {
        register_post_type( 'bassfit_reclamo', array(
            'labels' => array(
                'name'               => 'Libro de Reclamaciones',
                'singular_name'      => 'Hoja de Reclamación',
                'menu_name'          => 'Libro de Reclamaciones',
                'all_items'          => 'Todas las Reclamaciones',
                'view_item'          => 'Ver Hoja de Reclamación',
                'search_items'       => 'Buscar por Código o DNI',
                'not_found'          => 'No hay reclamaciones registradas.',
            ),
            'public'              => false,
            'show_ui'             => true,
            'show_in_menu'        => true,
            'menu_position'       => 26,
            'menu_icon'           => 'dashicons-book-alt',
            'supports'            => array( 'title' ),
            'capability_type'     => 'post',
            'capabilities'        => array( 'create_posts' => 'do_not_allow' ),
            'map_meta_cap'        => true,
        ) );
    }

    public function set_reclamo_columns( $columns ) {
        return array(
            'cb'          => '<input type="checkbox" />',
            'title'       => 'Código Oficial',
            'consumidor'  => 'Consumidor / DNI',
            'contacto'    => 'Teléfono / Email',
            'naturaleza'  => 'Tipo / Bien',
            'estado_ind'  => 'Estado Legal (15 días háb.)',
            'date'        => 'Fecha de Registro',
        );
    }

    public function render_reclamo_column( $column, $post_id ) {
        switch ( $column ) {
            case 'consumidor':
                echo '<strong>' . esc_html( get_post_meta( $post_id, '_reclamo_nombre', true ) ) . '</strong><br>';
                echo '<small>' . esc_html( get_post_meta( $post_id, '_reclamo_tipo_doc', true ) . ': ' . get_post_meta( $post_id, '_reclamo_num_doc', true ) ) . '</small>';
                break;
            case 'contacto':
                echo esc_html( get_post_meta( $post_id, '_reclamo_telefono', true ) ) . '<br>';
                echo '<a href="mailto:' . esc_attr( get_post_meta( $post_id, '_reclamo_email', true ) ) . '">' . esc_html( get_post_meta( $post_id, '_reclamo_email', true ) ) . '</a>';
                break;
            case 'naturaleza':
                $tipo = strtoupper( (string) get_post_meta( $post_id, '_reclamo_tipo_reclamo', true ) );
                $bien = strtoupper( (string) get_post_meta( $post_id, '_reclamo_tipo_bien', true ) );
                $monto = get_post_meta( $post_id, '_reclamo_monto', true );
                echo '<strong>' . esc_html( $tipo ) . '</strong> (' . esc_html( $bien ) . ')';
                if ( $monto ) {
                    echo '<br><small>Monto: S/ ' . esc_html( $monto ) . '</small>';
                }
                break;
            case 'estado_ind':
                $estado = get_post_meta( $post_id, '_reclamo_estado', true ) ?: 'PENDIENTE DE RESPUESTA';
                echo '<span style="background:#fff7ed;color:#c2410c;padding:3px 8px;border-radius:12px;font-weight:bold;font-size:11px;border:1px solid #fed7aa;">' . esc_html( $estado ) . '</span>';
                break;
        }
    }

    public function enqueue_admin_media_uploader() {
        if ( is_admin() ) {
            wp_enqueue_media();
        }
    }

    /**
     * Oculta todas las casillas innecesarias de WooCommerce/WordPress que confunden al editar un producto.
     */
    public function clean_up_product_admin_screen() {
        $screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
        if ( ! $screen || 'product' !== $screen->post_type ) {
            return;
        }
        ?>
        <style>
            /* Ocultar pestañas y casillas innecesarias de WooCommerce para dejar solo lo importante */
            #postcustom, #commentsdiv, #commentstatusdiv, #slugdiv, #tagsdiv-product_tag,
            #product_branddiv, .shipping_options, .linked_product_options, .attribute_options,
            .advanced_options, ._tax_status_field, ._tax_class_field, ._sale_price_field,
            label[for="_virtual"], label[for="_downloadable"] {
                display: none !important;
            }
        </style>
        <?php
    }

    public function register_videos_admin_menu() {
        add_menu_page(
            'Videos de la Web Bassfit',
            '🎬 Videos de la Web',
            'manage_options',
            'bassfit-videos-web',
            array( $this, 'render_videos_admin_page' ),
            'dashicons-video-alt3',
            27
        );
    }

    public function render_videos_admin_page() {
        if ( isset( $_POST['bassfit_save_global_videos'] ) && check_admin_referer( 'bassfit_global_videos_nonce' ) ) {
            $main_v = esc_url_raw( trim( $_POST['bassfit_main_routine_video_url'] ?? '' ) );
            update_option( 'bassfit_main_routine_video_url', $main_v );
            echo '<div class="notice notice-success is-dismissible"><p><strong>¡Listo! Video guardado y actualizado automáticamente en la página web.</strong></p></div>';
        }
        $main_url = get_option( 'bassfit_main_routine_video_url', '' );
        ?>
        <div class="wrap" style="max-width:780px;margin-top:20px;">
            <div style="background:#0f172a;color:#fff;padding:20px 24px;border-radius:14px;border-bottom:4px solid #ff5500;margin-bottom:20px;">
                <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">🎬 GESTOR FÁCIL DE VIDEOS — BASSFIT PERÚ</h1>
                <p style="color:#cbd5e1;margin:6px 0 0 0;font-size:13px;">Sube aquí un video desde tu computadora/celular (o pega un link de YouTube) y se actualizará automáticamente en tu página web.</p>
            </div>

            <form method="post" style="background:#fff;padding:24px;border-radius:14px;border:1px solid #cbd5e1;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <?php wp_nonce_field( 'bassfit_global_videos_nonce' ); ?>
                <h2 style="margin-top:0;color:#0f172a;font-size:16px;">1. Video Principal de Rutina (Botón "▶ Ver Video Rutina" del Banner y sección Noticias)</h2>
                <p style="color:#475569;font-size:13px;margin-bottom:12px;">
                    Haz clic en el botón gris <strong>"📂 Subir video desde mi PC / Celular"</strong> para elegir tu archivo <code>.mp4</code>, o pega directamente un link de YouTube:
                </p>
                <div style="display:flex;gap:10px;margin-bottom:18px;">
                    <input type="text" id="bassfit_main_routine_video_url" name="bassfit_main_routine_video_url" value="<?php echo esc_attr( $main_url ); ?>" placeholder="https://www.youtube.com/watch?v=... o archivo .mp4" style="flex:1;padding:10px 12px;font-size:14px;border:1px solid #94a3b8;border-radius:8px;" />
                    <button type="button" class="button" id="bassfit_upload_main_video_btn" style="padding:6px 16px;font-weight:700;border-radius:8px;">📂 Subir video desde mi PC / Celular</button>
                </div>

                <button type="submit" name="bassfit_save_global_videos" value="1" class="button button-primary" style="background:#ff5500;border-color:#e04a00;color:#fff;font-weight:800;font-size:14px;padding:8px 24px;border-radius:8px;cursor:pointer;">
                    💾 GUARDAR VIDEO EN LA WEB
                </button>
            </form>
        </div>
        <script>
        jQuery(document).ready(function($){
            var frame;
            $('#bassfit_upload_main_video_btn').on('click', function(e){
                e.preventDefault();
                if (frame) { frame.open(); return; }
                frame = wp.media({
                    title: 'Selecciona o sube tu video (.mp4)',
                    button: { text: 'Usar este video' },
                    library: { type: 'video' },
                    multiple: false
                });
                frame.on('select', function(){
                    var attachment = frame.state().get('selection').first().toJSON();
                    $('#bassfit_main_routine_video_url').val(attachment.url);
                });
                frame.open();
            });
        });
        </script>
        <?php
    }

    public function register_reclamo_metabox() {
        add_meta_box(
            'bassfit_reclamo_details',
            'Detalle Oficial de la Hoja de Reclamación (INDECOPI - Ley N° 31435)',
            array( $this, 'render_reclamo_metabox' ),
            'bassfit_reclamo',
            'normal',
            'high'
        );

        // Remover metaboxes confusos en Productos
        remove_meta_box( 'postcustom', 'product', 'normal' );
        remove_meta_box( 'commentsdiv', 'product', 'normal' );
        remove_meta_box( 'slugdiv', 'product', 'normal' );
        remove_meta_box( 'tagsdiv-product_tag', 'product', 'side' );

        // Panel súper simple arriba del todo en cada Producto
        add_meta_box(
            'bassfit_easy_product_box',
            '⚡ EDICIÓN FÁCIL BASSFIT — Cambiar Precio, Stock o Video de este Producto',
            array( $this, 'render_easy_product_metabox' ),
            'product',
            'normal',
            'high'
        );

        add_meta_box(
            'bassfit_video_metabox',
            '🎬 Video de este Artículo / Noticia',
            array( $this, 'render_video_metabox' ),
            'post',
            'side',
            'high'
        );
    }

    public function render_easy_product_metabox( $post ) {
        $wc_prod   = function_exists( 'wc_get_product' ) ? wc_get_product( $post->ID ) : null;
        $cur_price = $wc_prod ? $wc_prod->get_price() : get_post_meta( $post->ID, '_price', true );
        $cur_stock = $wc_prod ? $wc_prod->get_stock_quantity() : get_post_meta( $post->ID, '_stock', true );
        $video_url = get_post_meta( $post->ID, '_bassfit_intro_video_url', true );
        $ajax_nonce = wp_create_nonce( 'bassfit_ajax_product_' . $post->ID );
        wp_nonce_field( 'bassfit_save_video_nonce', 'bassfit_video_nonce' );
        ?>
        <div style="background:#f8fafc;border:2px solid #ff5500;border-radius:12px;padding:18px;margin-top:6px;">
            <p style="margin:0 0 14px 0;font-size:13px;color:#334155;">
                <strong>¡No necesitas tocar las demás casillas de abajo!</strong> Cambia aquí directamente el precio, el stock o el video de este producto y dale al botón naranja <strong>"💾 GUARDAR CAMBIOS AHORA"</strong>:
            </p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;margin-bottom:16px;">
                <div>
                    <label style="display:block;font-weight:800;color:#0f172a;margin-bottom:6px;font-size:13px;">💰 Precio en Soles (S/):</label>
                    <input type="number" step="0.01" id="bassfit_easy_price" name="bassfit_easy_price" value="<?php echo esc_attr( $cur_price ); ?>" style="width:100%;padding:10px;font-size:18px;font-weight:800;color:#ff5500;border:1px solid #94a3b8;border-radius:8px;" />
                </div>
                <div>
                    <label style="display:block;font-weight:800;color:#0f172a;margin-bottom:6px;font-size:13px;">📦 Stock Disponible (Unidades):</label>
                    <input type="number" step="1" id="bassfit_easy_stock" name="bassfit_easy_stock" value="<?php echo esc_attr( $cur_stock ); ?>" style="width:100%;padding:10px;font-size:18px;font-weight:800;color:#0f172a;border:1px solid #94a3b8;border-radius:8px;" />
                </div>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block;font-weight:800;color:#0f172a;margin-bottom:6px;font-size:13px;">🎬 Video demostrativo de este producto (Opcional — YouTube o archivo .mp4):</label>
                <div style="display:flex;gap:8px;">
                    <input type="text" id="bassfit_prod_video_input" name="bassfit_intro_video_url" value="<?php echo esc_attr( $video_url ); ?>" placeholder="Pega un link de YouTube o usa el botón de al lado para subir un .mp4" style="flex:1;padding:8px 12px;border:1px solid #94a3b8;border-radius:8px;" />
                    <button type="button" class="button" id="bassfit_prod_upload_video_btn" style="font-weight:700;border-radius:8px;">📂 Subir / Elegir Video</button>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
                <button type="button" id="bassfit_ajax_save_btn" class="button button-primary" style="background:#ff5500;border-color:#e04a00;color:#fff;font-weight:800;font-size:14px;padding:8px 22px;border-radius:8px;cursor:pointer;">
                    💾 GUARDAR CAMBIOS AHORA
                </button>
                <span id="bassfit_ajax_save_status" style="display:none;background:#dcfce7;color:#166534;border:1px solid #86efac;padding:8px 14px;border-radius:8px;font-weight:800;font-size:13px;"></span>
            </div>
        </div>
        <script>
        jQuery(document).ready(function($){
            var pFrame;
            $('#bassfit_prod_upload_video_btn').on('click', function(e){
                e.preventDefault();
                if (pFrame) { pFrame.open(); return; }
                pFrame = wp.media({
                    title: 'Selecciona o sube el video de este producto (.mp4)',
                    button: { text: 'Usar este video' },
                    library: { type: 'video' },
                    multiple: false
                });
                pFrame.on('select', function(){
                    var att = pFrame.state().get('selection').first().toJSON();
                    $('#bassfit_prod_video_input').val(att.url);
                });
                pFrame.open();
            });

            // Sincronizar con las casillas internas de WooCommerce para evitar sobrescrituras y alertas
            $('#bassfit_easy_price').on('input change', function(){
                $('#_regular_price').val($(this).val());
                $('#_sale_price').val('');
                $(window).off('beforeunload');
                window.onbeforeunload = null;
            });
            $('#bassfit_easy_stock').on('input change', function(){
                $('#_stock').val($(this).val());
                $(window).off('beforeunload');
                window.onbeforeunload = null;
            });

            // Guardado instantáneo por AJAX sin recargar ni pedir "Salir de la página"
            $('#bassfit_ajax_save_btn').on('click', function(e){
                e.preventDefault();
                $(window).off('beforeunload');
                window.onbeforeunload = null;

                var $btn = $(this);
                var $status = $('#bassfit_ajax_save_status');
                $btn.prop('disabled', true).text('⏳ Guardando...');
                $status.hide();

                $.post(ajaxurl, {
                    action: 'bassfit_quick_save_product',
                    post_id: <?php echo intval( $post->ID ); ?>,
                    nonce: '<?php echo esc_js( $ajax_nonce ); ?>',
                    price: $('#bassfit_easy_price').val(),
                    stock: $('#bassfit_easy_stock').val(),
                    video: $('#bassfit_prod_video_input').val()
                }, function(resp){
                    $btn.prop('disabled', false).text('💾 GUARDAR CAMBIOS AHORA');
                    if (resp && resp.success) {
                        $('#_regular_price').val(resp.data.price);
                        $('#_sale_price').val('');
                        $('#_stock').val(resp.data.stock);
                        $(window).off('beforeunload');
                        window.onbeforeunload = null;
                        $status.html('✅ ¡GUARDADO CON ÉXITO! Precio: S/ ' + resp.data.price + ' | Stock: ' + resp.data.stock + ' unid.').fadeIn(200);
                    } else {
                        alert('Error al guardar: ' + (resp && resp.data ? resp.data : 'Intenta nuevamente'));
                    }
                });
            });
        });
        </script>
        <?php
    }

    public function handle_ajax_quick_save_product() {
        $post_id = isset( $_POST['post_id'] ) ? intval( $_POST['post_id'] ) : 0;
        if ( ! $post_id || ! check_ajax_referer( 'bassfit_ajax_product_' . $post_id, 'nonce', false ) ) {
            wp_send_json_error( 'Sesión expirada, recarga la página.' );
        }
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            wp_send_json_error( 'Sin permisos.' );
        }
        $wc_prod = function_exists( 'wc_get_product' ) ? wc_get_product( $post_id ) : null;
        if ( ! $wc_prod ) {
            wp_send_json_error( 'Producto no encontrado.' );
        }
        $new_price = isset( $_POST['price'] ) && '' !== $_POST['price'] ? (string) floatval( $_POST['price'] ) : $wc_prod->get_price();
        $new_stock = isset( $_POST['stock'] ) && '' !== $_POST['stock'] ? intval( $_POST['stock'] ) : (int) $wc_prod->get_stock_quantity();
        $new_video = isset( $_POST['video'] ) ? esc_url_raw( trim( $_POST['video'] ) ) : '';

        $wc_prod->set_regular_price( $new_price );
        $wc_prod->set_sale_price( '' );
        $wc_prod->set_price( $new_price );
        $wc_prod->set_manage_stock( true );
        $wc_prod->set_stock_quantity( $new_stock );
        $wc_prod->set_stock_status( $new_stock > 0 ? 'instock' : 'outofstock' );
        $wc_prod->save();

        update_post_meta( $post_id, '_regular_price', $new_price );
        update_post_meta( $post_id, '_sale_price', '' );
        update_post_meta( $post_id, '_price', $new_price );
        update_post_meta( $post_id, '_stock', $new_stock );
        update_post_meta( $post_id, '_bassfit_intro_video_url', $new_video );

        if ( function_exists( 'wc_delete_product_transients' ) ) {
            wc_delete_product_transients( $post_id );
        }

        wp_send_json_success( array(
            'price' => $new_price,
            'stock' => $new_stock,
            'video' => $new_video,
        ) );
    }

    public function render_video_metabox( $post ) {
        $video_url = get_post_meta( $post->ID, '_bassfit_intro_video_url', true );
        $main_url  = get_option( 'bassfit_main_routine_video_url', '' );
        $is_main   = ( ! empty( $video_url ) && $video_url === $main_url );
        wp_nonce_field( 'bassfit_save_video_nonce', 'bassfit_video_nonce' );
        ?>
        <p style="margin-bottom:6px;font-size:12px;color:#334155;">
            Pega aquí un enlace de <strong>YouTube</strong> o sube un archivo <strong>.mp4</strong>:
        </p>
        <input type="url" name="bassfit_intro_video_url" value="<?php echo esc_attr( $video_url ); ?>" placeholder="https://www.youtube.com/watch?v=..." style="width:100%;margin-bottom:8px;" />
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#0f172a;cursor:pointer;">
            <input type="checkbox" name="bassfit_set_as_main_video" value="1" <?php checked( $is_main ); ?> />
            <span>Usar también como <strong>Video Principal de Rutina</strong> de la web</span>
        </label>
        <?php
    }

    public function save_video_metabox( $post_id ) {
        if ( ! isset( $_POST['bassfit_video_nonce'] ) || ! wp_verify_nonce( $_POST['bassfit_video_nonce'], 'bassfit_video_nonce' ) && ! wp_verify_nonce( $_POST['bassfit_video_nonce'], 'bassfit_save_video_nonce' ) ) {
            return;
        }
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }
        if ( isset( $_POST['bassfit_intro_video_url'] ) ) {
            $url = esc_url_raw( trim( $_POST['bassfit_intro_video_url'] ) );
            update_post_meta( $post_id, '_bassfit_intro_video_url', $url );
            if ( ! empty( $_POST['bassfit_set_as_main_video'] ) && ! empty( $url ) ) {
                update_option( 'bassfit_main_routine_video_url', $url );
            }
        }
        if ( 'product' === get_post_type( $post_id ) && function_exists( 'wc_get_product' ) ) {
            if ( isset( $_POST['bassfit_easy_price'] ) && '' !== $_POST['bassfit_easy_price'] ) {
                $new_p = (string) floatval( $_POST['bassfit_easy_price'] );
                update_post_meta( $post_id, '_regular_price', $new_p );
                update_post_meta( $post_id, '_sale_price', '' );
                update_post_meta( $post_id, '_price', $new_p );
            }
            if ( isset( $_POST['bassfit_easy_stock'] ) && '' !== $_POST['bassfit_easy_stock'] ) {
                $new_s = intval( $_POST['bassfit_easy_stock'] );
                update_post_meta( $post_id, '_manage_stock', 'yes' );
                update_post_meta( $post_id, '_stock', $new_s );
                update_post_meta( $post_id, '_stock_status', $new_s > 0 ? 'instock' : 'outofstock' );
            }
            if ( function_exists( 'wc_delete_product_transients' ) ) {
                wc_delete_product_transients( $post_id );
            }
        }
    }

    public function render_reclamo_metabox( $post ) {
        $fields = array(
            'Código Oficial'        => get_post_meta( $post->ID, '_reclamo_codigo', true ),
            'Fecha Legal'           => get_post_meta( $post->ID, '_reclamo_fecha', true ),
            'Nombre / Razón Social' => get_post_meta( $post->ID, '_reclamo_nombre', true ),
            'Documento'             => get_post_meta( $post->ID, '_reclamo_tipo_doc', true ) . ' ' . get_post_meta( $post->ID, '_reclamo_num_doc', true ),
            'Teléfono / WhatsApp'   => get_post_meta( $post->ID, '_reclamo_telefono', true ),
            'Correo Electrónico'    => get_post_meta( $post->ID, '_reclamo_email', true ),
            'Domicilio'             => get_post_meta( $post->ID, '_reclamo_direccion', true ),
            'Bien Contratado'       => strtoupper( (string) get_post_meta( $post->ID, '_reclamo_tipo_bien', true ) ) . ' - ' . get_post_meta( $post->ID, '_reclamo_descripcion_bien', true ),
            'Monto Reclamado (S/)'  => get_post_meta( $post->ID, '_reclamo_monto', true ),
            'Tipo (Reclamo/Queja)'  => strtoupper( (string) get_post_meta( $post->ID, '_reclamo_tipo_reclamo', true ) ),
            'Detalle de los Hechos' => get_post_meta( $post->ID, '_reclamo_detalle', true ),
            'Pedido del Consumidor' => get_post_meta( $post->ID, '_reclamo_pedido', true ),
        );
        echo '<table class="widefat striped" style="margin-top:10px;"><tbody>';
        foreach ( $fields as $label => $val ) {
            echo '<tr><th style="width:220px;font-weight:700;">' . esc_html( $label ) . '</th><td>' . nl2br( esc_html( (string) $val ) ) . '</td></tr>';
        }
        echo '</tbody></table>';
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

    public function restrict_supplements_purchasable( $purchasable, $product ) {
        if ( $this->is_consultative_product( $product->get_id() ) ) {
            return false;
        }
        return $purchasable;
    }

    public function validate_add_to_cart_no_supplements( $passed, $product_id, $quantity ) {
        if ( $this->is_consultative_product( $product_id ) ) {
            if ( function_exists( 'wc_add_notice' ) ) {
                wc_add_notice(
                    __( 'Los suplementos y productos de evaluación personalizada requieren asesoría previa por WhatsApp y no admiten compra directa en carrito.', 'bassfit-headless' ),
                    'error'
                );
            }
            return false;
        }
        return $passed;
    }

    public function purge_supplements_from_cart_on_checkout() {
        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            return;
        }
        foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
            $product_id = $cart_item['product_id'];
            if ( $this->is_consultative_product( $product_id ) ) {
                WC()->cart->remove_cart_item( $cart_item_key );
                wc_add_notice(
                    __( 'Se removió un producto consultivo del carrito: su venta es exclusivamente vía WhatsApp con un especialista de Bassfit.', 'bassfit-headless' ),
                    'error'
                );
            }
        }
    }

    public function block_supplements_in_rest_order( $order, $request, $creating ) {
        $line_items = $request->get_param( 'line_items' );
        if ( is_array( $line_items ) ) {
            foreach ( $line_items as $item ) {
                $pid = isset( $item['product_id'] ) ? intval( $item['product_id'] ) : 0;
                if ( $this->is_consultative_product( $pid ) ) {
                    return new WP_Error(
                        'bassfit_consultative_product_forbidden',
                        sprintf( 'Seguridad Backend Bassfit: El producto ID %d requiere Venta Consultiva por WhatsApp y no puede procesarse por carrito directo.', $pid ),
                        array( 'status' => 403 )
                    );
                }
            }
        }
        return $order;
    }

    public function block_supplements_in_store_api( $add_to_cart_data, $request ) {
        $pid = isset( $add_to_cart_data['id'] ) ? intval( $add_to_cart_data['id'] ) : 0;
        if ( $this->is_consultative_product( $pid ) && class_exists( '\Automattic\WooCommerce\StoreApi\Exceptions\RouteException' ) ) {
            throw new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException(
                'bassfit_supplement_whatsapp_only',
                'Este producto requiere evaluación personalizada con un asesor de Bassfit vía WhatsApp.',
                403
            );
        }
        return $add_to_cart_data;
    }

    public function register_headless_rest_fields() {
        register_rest_field( 'product', 'bassfit_headless_meta', array(
            'get_callback' => function( $object ) {
                $pid = $object['id'];
                $is_consultative = $this->is_consultative_product( $pid );
                return array(
                    'sale_mode'           => $is_consultative ? 'consultative_whatsapp' : 'direct_cart',
                    'requires_whatsapp'   => $is_consultative,
                    'frontend_id'         => (string) get_post_meta( $pid, '_bassfit_frontend_id', true ),
                    'coach_tip'           => (string) get_post_meta( $pid, '_bassfit_coach_tip', true ),
                    'related_article_ids' => (array) get_post_meta( $pid, '_bassfit_related_posts', true ),
                    'short_video_url'     => (string) get_post_meta( $pid, '_bassfit_intro_video_url', true ),
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
     * Registra endpoints REST oficiales en /wp-json/bassfit/v1/...
     */
    public function register_bassfit_api_routes() {
        register_rest_route( 'bassfit/v1', '/reclamaciones', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'handle_reclamacion_submission' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( 'bassfit/v1', '/checkout', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'handle_checkout_submission' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( 'bassfit/v1', '/catalog', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'handle_catalog_request' ),
            'permission_callback' => '__return_true',
        ) );
    }

    /**
     * Intercepta directamente /api/reclamaciones, /api/checkout y /api/catalog para compatibilidad directa con el frontend.
     */
    public function intercept_direct_api_paths() {
        $uri = isset( $_SERVER['REQUEST_URI'] ) ? strtok( $_SERVER['REQUEST_URI'], '?' ) : '';
        if ( '/api/reclamaciones' === $uri && 'POST' === $_SERVER['REQUEST_METHOD'] ) {
            $raw  = file_get_contents( 'php://input' );
            $data = json_decode( $raw, true );
            $res  = $this->process_reclamacion_data( is_array( $data ) ? $data : array() );
            status_header( $res['status'] );
            header( 'Content-Type: application/json; charset=utf-8' );
            echo wp_json_encode( $res['body'] );
            exit;
        }
        if ( '/api/checkout' === $uri && 'POST' === $_SERVER['REQUEST_METHOD'] ) {
            $raw  = file_get_contents( 'php://input' );
            $data = json_decode( $raw, true );
            $res  = $this->process_checkout_data( is_array( $data ) ? $data : array() );
            status_header( $res['status'] );
            header( 'Content-Type: application/json; charset=utf-8' );
            echo wp_json_encode( $res['body'] );
            exit;
        }
        if ( '/api/catalog' === $uri && 'GET' === $_SERVER['REQUEST_METHOD'] ) {
            $res = $this->get_public_catalog_data();
            status_header( 200 );
            nocache_headers();
            header( 'X-LiteSpeed-Cache-Control: no-cache' );
            header( 'Content-Type: application/json; charset=utf-8' );
            echo wp_json_encode( $res );
            exit;
        }
    }

    public function handle_reclamacion_submission( WP_REST_Request $request ) {
        $data = $request->get_json_params();
        $res  = $this->process_reclamacion_data( is_array( $data ) ? $data : array() );
        return new WP_REST_Response( $res['body'], $res['status'] );
    }

    public function process_reclamacion_data( array $data ) {
        $nombre          = sanitize_text_field( $data['nombre'] ?? '' );
        $tipo_doc        = sanitize_text_field( $data['tipoDoc'] ?? 'DNI' );
        $num_doc         = sanitize_text_field( $data['numDoc'] ?? '' );
        $telefono        = sanitize_text_field( $data['telefono'] ?? '' );
        $email           = sanitize_email( $data['email'] ?? '' );
        $direccion       = sanitize_text_field( $data['direccion'] ?? '' );
        $tipo_bien       = sanitize_text_field( $data['tipoBien'] ?? 'producto' );
        $monto           = sanitize_text_field( $data['monto'] ?? '' );
        $descripcion_bien= sanitize_text_field( $data['descripcionBien'] ?? '' );
        $tipo_reclamo    = sanitize_text_field( $data['tipoReclamo'] ?? 'reclamo' );
        $detalle         = sanitize_textarea_field( $data['detalle'] ?? '' );
        $pedido          = sanitize_textarea_field( $data['pedido'] ?? '' );
        $codigo          = sanitize_text_field( $data['codigo'] ?? '' );
        $fecha           = sanitize_text_field( $data['fecha'] ?? current_time( 'mysql' ) );

        if ( empty( $nombre ) || empty( $num_doc ) || empty( $email ) || empty( $detalle ) ) {
            return array(
                'status' => 400,
                'body'   => array( 'error' => 'Datos incompletos. Nombre, documento, email y detalle son obligatorios.' ),
            );
        }

        if ( empty( $codigo ) ) {
            $prefijo = ( 'queja' === strtolower( $tipo_reclamo ) ) ? 'QUE' : 'REC';
            $codigo  = $prefijo . '-2026-' . wp_rand( 1000, 9999 );
        }

        // 1. Guardar en WordPress Admin (Custom Post Type: bassfit_reclamo)
        $post_id = wp_insert_post( array(
            'post_type'   => 'bassfit_reclamo',
            'post_title'  => $codigo . ' — ' . $nombre,
            'post_status' => 'publish',
        ) );

        if ( $post_id && ! is_wp_error( $post_id ) ) {
            update_post_meta( $post_id, '_reclamo_codigo', $codigo );
            update_post_meta( $post_id, '_reclamo_fecha', $fecha );
            update_post_meta( $post_id, '_reclamo_nombre', $nombre );
            update_post_meta( $post_id, '_reclamo_tipo_doc', $tipo_doc );
            update_post_meta( $post_id, '_reclamo_num_doc', $num_doc );
            update_post_meta( $post_id, '_reclamo_telefono', $telefono );
            update_post_meta( $post_id, '_reclamo_email', $email );
            update_post_meta( $post_id, '_reclamo_direccion', $direccion );
            update_post_meta( $post_id, '_reclamo_tipo_bien', $tipo_bien );
            update_post_meta( $post_id, '_reclamo_monto', $monto );
            update_post_meta( $post_id, '_reclamo_descripcion_bien', $descripcion_bien );
            update_post_meta( $post_id, '_reclamo_tipo_reclamo', $tipo_reclamo );
            update_post_meta( $post_id, '_reclamo_detalle', $detalle );
            update_post_meta( $post_id, '_reclamo_pedido', $pedido );
            update_post_meta( $post_id, '_reclamo_estado', 'PENDIENTE DE RESPUESTA (15 DÍAS HÁBILES)' );
        }

        // 2. Respaldo en archivo JSON privado (Custodia INDECOPI 2 años)
        $upload_dir = wp_upload_dir();
        $priv_dir   = trailingslashit( $upload_dir['basedir'] ) . 'bassfit-private';
        if ( ! file_exists( $priv_dir ) ) {
            wp_mkdir_p( $priv_dir );
            file_put_contents( $priv_dir . '/.htaccess', "Order deny,allow\nDeny from all\n" );
        }
        $audit_file = $priv_dir . '/reclamaciones-audit.json';
        $existing   = file_exists( $audit_file ) ? json_decode( file_get_contents( $audit_file ), true ) : array();
        if ( ! is_array( $existing ) ) {
            $existing = array();
        }
        $existing[] = array(
            'codigo'          => $codigo,
            'fecha'           => $fecha,
            'nombre'          => $nombre,
            'tipoDoc'         => $tipo_doc,
            'numDoc'          => $num_doc,
            'telefono'        => $telefono,
            'email'           => $email,
            'direccion'       => $direccion,
            'tipoBien'        => $tipo_bien,
            'monto'           => $monto,
            'descripcionBien' => $descripcion_bien,
            'tipoReclamo'     => $tipo_reclamo,
            'detalle'         => $detalle,
            'pedido'          => $pedido,
        );
        file_put_contents( $audit_file, wp_json_encode( $existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) );

        // 3. Envío de correo de constancia al consumidor y al administrador
        $subject = '[BASSFIT PERÚ] Constancia de Hoja de Reclamación Virtual N° ' . $codigo;
        $message = "CONSTANCIA OFICIAL DE HOJA DE RECLAMACIÓN VIRTUAL - BASSFIT PERÚ\n"
                 . "================================================================\n"
                 . "Código Oficial: {$codigo}\n"
                 . "Fecha y Hora: {$fecha}\n"
                 . "Consumidor: {$nombre} ({$tipo_doc}: {$num_doc})\n"
                 . "Teléfono: {$telefono} | Email: {$email}\n"
                 . "Domicilio: {$direccion}\n"
                 . "Bien Contratado: {$tipo_bien} - {$descripcion_bien} (Monto: S/ {$monto})\n"
                 . "Tipo: " . strtoupper( $tipo_reclamo ) . "\n"
                 . "Detalle: {$detalle}\n"
                 . "Pedido: {$pedido}\n\n"
                 . "Plazo legal de respuesta: Máximo 15 días hábiles conforme a la Ley N° 31435 (INDECOPI).\n";
        $admin_email = get_option( 'admin_email' );
        @wp_mail( array( $email, $admin_email ), $subject, $message );

        return array(
            'status' => 200,
            'body'   => array(
                'success' => true,
                'codigo'  => $codigo,
                'postId'  => $post_id,
                'message' => 'Hoja de Reclamación registrada oficialmente en el sistema de Bassfit Perú.',
            ),
        );
    }

    public function handle_checkout_submission( WP_REST_Request $request ) {
        $data = $request->get_json_params();
        $res  = $this->process_checkout_data( is_array( $data ) ? $data : array() );
        return new WP_REST_Response( $res['body'], $res['status'] );
    }

    public function process_checkout_data( array $data ) {
        if ( ! function_exists( 'wc_create_order' ) ) {
            return array(
                'status' => 503,
                'body'   => array( 'error' => 'WooCommerce no está activo.' ),
            );
        }

        $items = isset( $data['items'] ) && is_array( $data['items'] ) ? $data['items'] : array();
        if ( empty( $items ) ) {
            return array(
                'status' => 400,
                'body'   => array( 'error' => 'El carrito está vacío.' ),
            );
        }

        $order = wc_create_order();
        foreach ( $items as $item ) {
            $wc_id = 0;
            if ( ! empty( $item['sku'] ) ) {
                $wc_id = wc_get_product_id_by_sku( sanitize_text_field( $item['sku'] ) );
            }
            if ( ! $wc_id && ! empty( $item['wcId'] ) ) {
                $candidate = intval( $item['wcId'] );
                if ( wc_get_product( $candidate ) ) {
                    $wc_id = $candidate;
                }
            }
            $qty = isset( $item['quantity'] ) ? max( 1, intval( $item['quantity'] ) ) : 1;
            if ( $wc_id > 0 ) {
                if ( $this->is_consultative_product( $wc_id ) ) {
                    $order->delete( true );
                    return array(
                        'status' => 403,
                        'body'   => array(
                            'error' => 'Uno de los productos seleccionados requiere Venta Consultiva vía WhatsApp.',
                        ),
                    );
                }
                $product = wc_get_product( $wc_id );
                if ( $product ) {
                    $order->add_product( $product, $qty );
                }
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

        $order->calculate_totals();
        $order->update_status( 'pending', 'Pedido creado desde la plataforma web Bassfit Perú.' );

        return array(
            'status' => 200,
            'body'   => array(
                'success' => true,
                'orderId' => $order->get_id(),
                'total'   => $order->get_total(),
            ),
        );
    }

    public function handle_catalog_request() {
        return new WP_REST_Response( $this->get_public_catalog_data(), 200 );
    }

    public function get_public_catalog_data() {
        if ( ! function_exists( 'wc_get_products' ) ) {
            return array( 'products' => array() );
        }
        $wc_products = wc_get_products( array(
            'status' => 'publish',
            'limit'  => 100,
        ) );
        $list = array();
        foreach ( $wc_products as $p ) {
            $pid = $p->get_id();
            $list[] = array(
                'wcId'        => $pid,
                'frontendId'  => (string) get_post_meta( $pid, '_bassfit_frontend_id', true ),
                'sku'         => $p->get_sku(),
                'name'        => $p->get_name(),
                'slug'        => $p->get_slug(),
                'price'       => (float) $p->get_price(),
                'regularPrice'=> (float) $p->get_regular_price(),
                'stock'       => $p->get_stock_quantity(),
                'stockStatus' => $p->get_stock_status(),
                'saleMode'    => $this->is_consultative_product( $pid ) ? 'consultative_whatsapp' : 'direct_cart',
                'videoUrl'    => (string) get_post_meta( $pid, '_bassfit_intro_video_url', true ),
            );
        }
        $main_video = (string) get_option( 'bassfit_main_routine_video_url', '' );
        $media_videos = get_posts( array(
            'post_type'      => 'attachment',
            'post_mime_type' => 'video',
            'posts_per_page' => 10,
            'post_status'    => 'inherit',
            'orderby'        => 'date',
            'order'          => 'DESC',
        ) );
        $uploaded_videos = array();
        foreach ( $media_videos as $mv ) {
            $v_url = wp_get_attachment_url( $mv->ID );
            if ( $v_url ) {
                $uploaded_videos[] = array(
                    'id'    => $mv->ID,
                    'title' => $mv->post_title,
                    'url'   => $v_url,
                );
            }
        }
        if ( empty( $main_video ) && ! empty( $uploaded_videos ) ) {
            $main_video = $uploaded_videos[0]['url'];
        }

        $wp_posts = get_posts( array(
            'post_type'      => 'post',
            'post_status'    => 'publish',
            'posts_per_page' => 25,
            'orderby'        => 'date',
            'order'          => 'DESC',
        ) );
        $posts_list = array();
        foreach ( $wp_posts as $wp_p ) {
            $cats = get_the_category( $wp_p->ID );
            $cat_name = ( ! empty( $cats ) && isset( $cats[0]->name ) && 'Uncategorized' !== $cats[0]->name && 'Sin categoría' !== $cats[0]->name )
                ? $cats[0]->name
                : 'Entrenamiento & Técnica';
            $plain_body = trim( wp_strip_all_tags( $wp_p->post_content ) );
            $excerpt    = ! empty( $wp_p->post_excerpt )
                ? wp_strip_all_tags( $wp_p->post_excerpt )
                : wp_trim_words( $plain_body, 28, '...' );
            $r_time     = (int) get_post_meta( $wp_p->ID, '_bassfit_reading_time', true ) ?: 4;
            $posts_list[] = array(
                'id'             => 'wp-post-' . $wp_p->ID,
                'slug'           => $wp_p->post_name,
                'title'          => $wp_p->post_title,
                'pillarCategory' => $cat_name,
                'readingTime'    => $r_time . ' min de lectura',
                'seoExcerpt'     => $excerpt,
                'bodyText'       => $plain_body,
                'videoUrl'       => (string) get_post_meta( $wp_p->ID, '_bassfit_intro_video_url', true ),
            );
        }

        return array(
            'updatedAt'           => current_time( 'mysql' ),
            'count'               => count( $list ),
            'mainRoutineVideoUrl' => $main_video,
            'uploadedVideos'      => $uploaded_videos,
            'posts'               => $posts_list,
            'products'            => $list,
        );
    }

    public function disable_comments_globally() {
        remove_post_type_support( 'post', 'comments' );
        remove_post_type_support( 'post', 'trackbacks' );
        remove_post_type_support( 'page', 'comments' );
    }

    public function sanitize_evergreen_post_rest_response( $response, $post, $request ) {
        if ( isset( $response->data['date'] ) ) {
            $response->data['evergreen_mode'] = true;
            $response->data['comment_status'] = 'closed';
        }
        return $response;
    }
}

new Bassfit_Headless_Engine();

endif;
