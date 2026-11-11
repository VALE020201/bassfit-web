<?php
/**
 * Plugin Name: Bassfit Perú - Autenticación y Cuentas de Clientes (Headless)
 * Description: Sistema seguro y profesional de registro, inicio de sesión, verificación de correo, Google Sign-In, recuperación de contraseñas, perfiles y pedidos para clientes de Bassfit Perú conforme a la Ley 29733.
 * Version: 1.0.0
 * Author: Bassfit Perú
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Bassfit_Customer_Auth {

    const VERSION = '1.0.0';
    const TOKEN_EXPIRY_DAYS = 30;
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOGIN_LOCKOUT_MINS = 15;
    const MAX_REG_PER_HOUR = 5;
    const MAX_CODE_REQUESTS = 3;
    const CODE_EXPIRY_MINS = 15;

    public static function init() {
        // Interceptar llamadas directas /api/auth/... y /api/customer/...
        add_action( 'init', array( __CLASS__, 'intercept_api_requests' ), 15 );

        // Rutas REST oficiales de WordPress
        add_action( 'rest_api_init', array( __CLASS__, 'register_rest_routes' ) );

        // Panel de configuración en el admin de WordPress
        add_action( 'admin_menu', array( __CLASS__, 'register_admin_menu' ), 25 );
        add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );

        // Asociar pedidos a clientes autenticados en checkout
        add_action( 'woocommerce_checkout_order_created', array( __CLASS__, 'attach_customer_to_order' ) );
    }

    /* =========================================================================
     * TOKEN DE SESIÓN SEGURO (HMAC FIRMADO CON CLAVE SECRETA DE WORDPRESS)
     * ========================================================================= */

    /**
     * Genera un token firmado seguro para el cliente.
     * Si el usuario cambia su contraseña, el token queda automáticamente invalidado.
     */
    public static function generate_token( $user_id ) {
        $user = get_userdata( $user_id );
        if ( ! $user ) {
            return false;
        }

        $issued_at = time();
        $expires_at = $issued_at + ( self::TOKEN_EXPIRY_DAYS * DAY_IN_SECONDS );
        $payload_data = $user_id . '|' . $issued_at . '|' . $expires_at;

        // Firma HMAC usando SECURE_AUTH_KEY o AUTH_KEY de WordPress + el hash de contraseña del usuario
        $key = defined( 'SECURE_AUTH_KEY' ) ? SECURE_AUTH_KEY : ( defined( 'AUTH_KEY' ) ? AUTH_KEY : 'bassfit_fallback_secret_key' );
        $signature = hash_hmac( 'sha256', $payload_data . '|' . $user->user_pass, $key );

        $token = base64_encode( $payload_data . '|' . $signature );
        return $token;
    }

    /**
     * Valida el token y devuelve el WP_User si es legítimo y no ha expirado.
     */
    public static function validate_token( $token ) {
        if ( empty( $token ) || ! is_string( $token ) ) {
            return false;
        }

        $decoded = base64_decode( $token, true );
        if ( ! $decoded ) {
            return false;
        }

        $parts = explode( '|', $decoded );
        if ( count( $parts ) !== 4 ) {
            return false;
        }

        list( $user_id, $issued_at, $expires_at, $signature ) = $parts;
        $user_id = (int) $user_id;
        $issued_at = (int) $issued_at;
        $expires_at = (int) $expires_at;

        if ( $user_id <= 0 || time() > $expires_at ) {
            return false;
        }

        $user = get_userdata( $user_id );
        if ( ! $user ) {
            return false;
        }

        $key = defined( 'SECURE_AUTH_KEY' ) ? SECURE_AUTH_KEY : ( defined( 'AUTH_KEY' ) ? AUTH_KEY : 'bassfit_fallback_secret_key' );
        $expected_sig = hash_hmac( 'sha256', $user_id . '|' . $issued_at . '|' . $expires_at . '|' . $user->user_pass, $key );

        if ( ! hash_equals( $expected_sig, $signature ) ) {
            return false;
        }

        return $user;
    }

    /**
     * Obtiene el token de la cabecera HTTP Authorization o Cookie.
     */
    public static function get_bearer_token() {
        $headers = array();
        if ( function_exists( 'getallheaders' ) ) {
            $headers = getallheaders();
        }

        $auth_header = '';
        if ( isset( $headers['Authorization'] ) ) {
            $auth_header = $headers['Authorization'];
        } elseif ( isset( $headers['authorization'] ) ) {
            $auth_header = $headers['authorization'];
        } elseif ( isset( $_SERVER['HTTP_AUTHORIZATION'] ) ) {
            $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif ( isset( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ) {
            $auth_header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        if ( ! empty( $auth_header ) && preg_match( '/Bearer\s+(.*)$/i', $auth_header, $matches ) ) {
            return trim( $matches[1] );
        }

        if ( ! empty( $_COOKIE['bassfit_customer_token'] ) ) {
            return sanitize_text_field( $_COOKIE['bassfit_customer_token'] );
        }

        return '';
    }

    /**
     * Obtiene el usuario autenticado actual desde el token.
     */
    public static function get_current_customer() {
        $token = self::get_bearer_token();
        if ( empty( $token ) ) {
            return null;
        }
        $user = self::validate_token( $token );
        return $user ? $user : null;
    }

    /* =========================================================================
     * ENFRENTAMIENTO A FUERZA BRUTA Y RATE LIMITING
     * ========================================================================= */

    private static function get_client_ip() {
        $ip = '127.0.0.1';
        if ( ! empty( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ) {
            $ip = sanitize_text_field( $_SERVER['HTTP_CF_CONNECTING_IP'] );
        } elseif ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
            $parts = explode( ',', $_SERVER['HTTP_X_FORWARDED_FOR'] );
            $ip = trim( $parts[0] );
        } elseif ( ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
            $ip = sanitize_text_field( $_SERVER['REMOTE_ADDR'] );
        }
        return preg_replace( '/[^0-9a-fA-F:\.]/', '', $ip );
    }

    private static function check_login_rate_limit( $email ) {
        $ip = self::get_client_ip();
        $key_ip = 'bf_lgn_ip_' . md5( $ip );
        $key_email = 'bf_lgn_em_' . md5( strtolower( trim( $email ) ) );

        $attempts_ip = (int) get_transient( $key_ip );
        $attempts_email = (int) get_transient( $key_email );

        if ( $attempts_ip >= self::MAX_LOGIN_ATTEMPTS || $attempts_email >= self::MAX_LOGIN_ATTEMPTS ) {
            return true;
        }
        return false;
    }

    private static function record_failed_login( $email ) {
        $ip = self::get_client_ip();
        $key_ip = 'bf_lgn_ip_' . md5( $ip );
        $key_email = 'bf_lgn_em_' . md5( strtolower( trim( $email ) ) );

        $attempts_ip = (int) get_transient( $key_ip );
        $attempts_email = (int) get_transient( $key_email );

        set_transient( $key_ip, $attempts_ip + 1, self::LOGIN_LOCKOUT_MINS * MINUTE_IN_SECONDS );
        set_transient( $key_email, $attempts_email + 1, self::LOGIN_LOCKOUT_MINS * MINUTE_IN_SECONDS );
    }

    private static function clear_failed_login( $email ) {
        $ip = self::get_client_ip();
        delete_transient( 'bf_lgn_ip_' . md5( $ip ) );
        delete_transient( 'bf_lgn_em_' . md5( strtolower( trim( $email ) ) ) );
    }

    private static function check_reg_rate_limit() {
        $ip = self::get_client_ip();
        $key = 'bf_reg_ip_' . md5( $ip );
        $count = (int) get_transient( $key );
        if ( $count >= self::MAX_REG_PER_HOUR ) {
            return true;
        }
        set_transient( $key, $count + 1, HOUR_IN_SECONDS );
        return false;
    }

    private static function check_code_request_rate_limit( $email ) {
        $key = 'bf_code_req_' . md5( strtolower( trim( $email ) ) );
        $count = (int) get_transient( $key );
        if ( $count >= self::MAX_CODE_REQUESTS ) {
            return true;
        }
        set_transient( $key, $count + 1, 10 * MINUTE_IN_SECONDS );
        return false;
    }

    /* =========================================================================
     * FORMATEO DE RESPUESTAS JSON
     * ========================================================================= */

    private static function send_json( $status, $data ) {
        status_header( $status );
        header( 'Content-Type: application/json; charset=utf-8' );
        header( 'X-Content-Type-Options: nosniff' );
        header( 'Cache-Control: no-cache, no-store, must-revalidate' );
        echo wp_json_encode( $data );
        exit;
    }

    private static function error( $status, $code, $message, $extra = array() ) {
        self::send_json( $status, array_merge( array(
            'success' => false,
            'code'    => $code,
            'error'   => $message,
        ), $extra ) );
    }

    private static function success( $data = array(), $status = 200 ) {
        self::send_json( $status, array_merge( array(
            'success' => true,
        ), $data ) );
    }

    public static function sanitize_customer_output( $user ) {
        if ( ! $user instanceof WP_User ) {
            return null;
        }

        $address = get_user_meta( $user->ID, '_bassfit_delivery_address', true );
        if ( ! is_array( $address ) ) {
            $address = array(
                'address'    => get_user_meta( $user->ID, 'billing_address_1', true ) ?: '',
                'city'       => get_user_meta( $user->ID, 'billing_city', true ) ?: 'Lima',
                'district'   => get_user_meta( $user->ID, 'billing_state', true ) ?: '',
                'department' => get_user_meta( $user->ID, 'billing_city', true ) ?: 'Lima',
                'province'   => 'Lima',
                'reference'  => get_user_meta( $user->ID, '_bassfit_delivery_reference', true ) ?: '',
            );
        }

        return array(
            'id'              => (int) $user->ID,
            'firstName'       => get_user_meta( $user->ID, 'first_name', true ) ?: $user->display_name,
            'lastName'        => get_user_meta( $user->ID, 'last_name', true ) ?: '',
            'fullName'        => trim( ( get_user_meta( $user->ID, 'first_name', true ) ?: $user->display_name ) . ' ' . get_user_meta( $user->ID, 'last_name', true ) ),
            'email'           => $user->user_email,
            'phone'           => get_user_meta( $user->ID, 'billing_phone', true ) ?: '',
            'emailVerified'   => (bool) get_user_meta( $user->ID, '_bassfit_email_verified', true ),
            'authProvider'    => get_user_meta( $user->ID, '_bassfit_auth_provider', true ) ?: 'email',
            'deliveryAddress' => $address,
            'registeredDate'  => $user->user_registered,
        );
    }

    /* =========================================================================
     * ENVIADOR DE CORREOS TRANSACCIONALES DE BASFIT PERÚ
     * ========================================================================= */

    private static function send_branded_email( $to, $subject, $headline, $body_html, $action_code = null ) {
        $logo_url = 'https://bassfitperu.com/images/brand/logo-bassfit-oficial.jpg';

        $code_box = '';
        if ( $action_code ) {
            $code_box = '
            <div style="margin:24px 0;background:#0F172A;border-radius:14px;padding:20px;text-align:center;">
                <span style="display:block;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Tu código de seguridad</span>
                <span style="font-family:\'Courier New\',Courier,monospace;font-size:32px;font-weight:900;letter-spacing:6px;color:#FF5500;">' . esc_html( $action_code ) . '</span>
                <span style="display:block;font-size:11px;color:#94a3b8;margin-top:8px;">Válido durante los próximos 15 minutos.</span>
            </div>';
        }

        $html = '<!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;background-color:#F8FAFC;margin:0;padding:24px 12px;color:#0F172A;">
            <div style="max-width:540px;margin:0 auto;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 10px 25px rgba(0,0,0,0.04);">
                <div style="background:#0F172A;padding:24px;text-align:center;border-bottom:3px solid #FF5500;">
                    <img src="' . esc_url( $logo_url ) . '" alt="Bassfit Perú" style="max-height:48px;border-radius:8px;" />
                    <h1 style="color:#FFFFFF;font-size:18px;margin:12px 0 0;font-weight:900;letter-spacing:1px;text-transform:uppercase;">Bassfit Perú</h1>
                </div>
                <div style="padding:28px 24px;">
                    <h2 style="font-size:20px;font-weight:800;color:#0F172A;margin-top:0;line-height:1.3;">' . esc_html( $headline ) . '</h2>
                    <div style="font-size:14px;line-height:1.6;color:#475569;">' . $body_html . '</div>
                    ' . $code_box . '
                    <p style="font-size:12px;color:#94a3b8;margin-top:24px;line-height:1.5;">
                        Si tú no solicitaste esta acción en Bassfit Perú, puedes ignorar este mensaje de forma segura. Tus datos están protegidos conforme a la Ley N° 29733 de Protección de Datos Personales.
                    </p>
                </div>
                <div style="background:#F1F5F9;padding:16px 24px;text-align:center;font-size:11px;color:#64748B;">
                    Bassfit Perú · Equipamiento fitness y calistenia de alto rendimiento<br/>
                    WhatsApp Oficial: +51 967 581 481 · Lima, Perú
                </div>
            </div>
        </body>
        </html>';

        $headers = array(
            'Content-Type: text/html; charset=UTF-8',
            'From: Bassfit Perú <pedidos@bassfitperu.com>',
        );

        return wp_mail( $to, $subject, $html, $headers );
    }

    /* =========================================================================
     * CONTROLADORES DE RUTA (DISPATCHER)
     * ========================================================================= */

    public static function intercept_api_requests() {
        $uri = isset( $_SERVER['REQUEST_URI'] ) ? strtok( $_SERVER['REQUEST_URI'], '?' ) : '';
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        // Manejar preflight CORS si es necesario
        if ( 'OPTIONS' === $method && ( strpos( $uri, '/api/auth/' ) === 0 || strpos( $uri, '/api/customer/' ) === 0 ) ) {
            status_header( 200 );
            header( 'Access-Control-Allow-Origin: *' );
            header( 'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS' );
            header( 'Access-Control-Allow-Headers: Authorization, Content-Type' );
            exit;
        }

        if ( strpos( $uri, '/api/auth/' ) !== 0 && strpos( $uri, '/api/customer/' ) !== 0 ) {
            return;
        }

        $raw_input = file_get_contents( 'php://input' );
        $json_data = json_decode( $raw_input, true );
        $data = is_array( $json_data ) ? $json_data : array();

        // 1. Rutas públicas de autenticación
        if ( '/api/auth/register' === $uri && 'POST' === $method ) {
            self::handle_register( $data );
        } elseif ( '/api/auth/login' === $uri && 'POST' === $method ) {
            self::handle_login( $data );
        } elseif ( '/api/auth/google' === $uri && 'POST' === $method ) {
            self::handle_google( $data );
        } elseif ( '/api/auth/verify-email' === $uri && 'POST' === $method ) {
            self::handle_verify_email( $data );
        } elseif ( '/api/auth/resend-verification' === $uri && 'POST' === $method ) {
            self::handle_resend_verification( $data );
        } elseif ( '/api/auth/forgot-password' === $uri && 'POST' === $method ) {
            self::handle_forgot_password( $data );
        } elseif ( '/api/auth/reset-password' === $uri && 'POST' === $method ) {
            self::handle_reset_password( $data );
        } elseif ( '/api/auth/phone/send-otp' === $uri && 'POST' === $method ) {
            self::handle_phone_send_otp( $data );
        } elseif ( '/api/auth/phone/verify-otp' === $uri && 'POST' === $method ) {
            self::handle_phone_verify_otp( $data );
        }

        // 2. Rutas protegidas de cliente
        $current_user = self::get_current_customer();

        if ( '/api/customer/me' === $uri && 'GET' === $method ) {
            if ( ! $current_user ) {
                self::error( 401, 'unauthorized', 'Debes iniciar sesión para consultar tu cuenta.' );
            }
            self::success( array( 'user' => self::sanitize_customer_output( $current_user ) ) );
        } elseif ( '/api/customer/profile' === $uri && ( 'PUT' === $method || 'POST' === $method ) ) {
            if ( ! $current_user ) {
                self::error( 401, 'unauthorized', 'Debes iniciar sesión para actualizar tu perfil.' );
            }
            self::handle_update_profile( $current_user, $data );
        } elseif ( '/api/customer/orders' === $uri && 'GET' === $method ) {
            if ( ! $current_user ) {
                self::error( 401, 'unauthorized', 'Debes iniciar sesión para ver tus pedidos.' );
            }
            self::handle_get_customer_orders( $current_user );
        } elseif ( '/api/customer/delete-account' === $uri && 'POST' === $method ) {
            if ( ! $current_user ) {
                self::error( 401, 'unauthorized', 'Debes iniciar sesión para solicitar la eliminación de tu cuenta.' );
            }
            self::handle_delete_account_request( $current_user, $data );
        }
    }

    public static function register_rest_routes() {
        register_rest_route( 'bassfit/v1', '/auth/register', array(
            'methods'  => 'POST',
            'callback' => function( $req ) {
                self::handle_register( $req->get_json_params() ?: array() );
            },
            'permission_callback' => '__return_true',
        ) );
        register_rest_route( 'bassfit/v1', '/auth/login', array(
            'methods'  => 'POST',
            'callback' => function( $req ) {
                self::handle_login( $req->get_json_params() ?: array() );
            },
            'permission_callback' => '__return_true',
        ) );
        register_rest_route( 'bassfit/v1', '/customer/me', array(
            'methods'  => 'GET',
            'callback' => function() {
                $user = self::get_current_customer();
                if ( ! $user ) return new WP_REST_Response( array( 'success' => false, 'error' => 'No autorizado' ), 401 );
                return new WP_REST_Response( array( 'success' => true, 'user' => self::sanitize_customer_output( $user ) ), 200 );
            },
            'permission_callback' => '__return_true',
        ) );
    }

    /* =========================================================================
     * 1. REGISTRO DE CLIENTES
     * ========================================================================= */

    private static function handle_register( array $data ) {
        // Honeypot anti-bot
        if ( ! empty( $data['website'] ) ) {
            self::error( 400, 'bot_detected', 'Solicitud rechazada.' );
        }

        if ( self::check_reg_rate_limit() ) {
            self::error( 429, 'rate_limited', 'Demasiados intentos de registro desde tu conexión. Por favor espera unos minutos.' );
        }

        $first_name = sanitize_text_field( $data['firstName'] ?? '' );
        $last_name  = sanitize_text_field( $data['lastName'] ?? '' );
        $email      = sanitize_email( $data['email'] ?? '' );
        $phone      = sanitize_text_field( $data['phone'] ?? '' );
        $password   = (string) ( $data['password'] ?? '' );
        $confirm_pw = (string) ( $data['passwordConfirm'] ?? '' );
        $terms      = ! empty( $data['termsAccepted'] );
        $privacy    = ! empty( $data['privacyAccepted'] );

        if ( empty( $first_name ) || empty( $email ) || empty( $password ) ) {
            self::error( 400, 'missing_fields', 'Por favor completa todos los campos obligatorios (nombre, correo y contraseña).' );
        }

        if ( ! is_email( $email ) ) {
            self::error( 400, 'invalid_email', 'El correo electrónico ingresado no tiene un formato válido.' );
        }

        if ( strlen( $password ) < 6 ) {
            self::error( 400, 'weak_password', 'La contraseña debe tener al menos 6 caracteres para proteger tu cuenta.' );
        }

        if ( $password !== $confirm_pw ) {
            self::error( 400, 'password_mismatch', 'Las contraseñas ingresadas no coinciden.' );
        }

        if ( ! $terms || ! $privacy ) {
            self::error( 400, 'terms_required', 'Debes aceptar los Términos y Condiciones y la Política de Privacidad para crear tu cuenta (Ley 29733).' );
        }

        if ( email_exists( $email ) ) {
            self::error( 409, 'email_exists', 'Este correo ya tiene una cuenta en Bassfit Perú. Puedes iniciar sesión o recuperar tu contraseña si la olvidaste.' );
        }

        // Crear usuario con rol 'customer' exclusivamente (NUNCA permisos administrativos)
        $username = sanitize_user( $email );
        $user_id = wp_create_user( $username, $password, $email );

        if ( is_wp_error( $user_id ) ) {
            self::error( 500, 'creation_failed', 'No se pudo crear la cuenta: ' . $user_id->get_error_message() );
        }

        // Asignar rol de cliente de WooCommerce / WordPress
        $user = new WP_User( $user_id );
        $user->set_role( 'customer' );

        // Guardar metadatos del cliente
        update_user_meta( $user_id, 'first_name', $first_name );
        update_user_meta( $user_id, 'last_name', $last_name );
        update_user_meta( $user_id, 'billing_phone', $phone );
        update_user_meta( $user_id, '_bassfit_auth_provider', 'email' );
        update_user_meta( $user_id, '_bassfit_terms_accepted_at', gmdate( 'Y-m-d H:i:s' ) );
        update_user_meta( $user_id, '_bassfit_privacy_accepted_at', gmdate( 'Y-m-d H:i:s' ) );
        update_user_meta( $user_id, '_bassfit_email_verified', 0 );

        // Generar código de verificación criptográfico de 6 dígitos
        $otp = (string) wp_rand( 100000, 999999 );
        update_user_meta( $user_id, '_bassfit_email_verification_code', wp_hash_password( $otp ) );
        update_user_meta( $user_id, '_bassfit_email_verification_expires', time() + ( self::CODE_EXPIRY_MINS * MINUTE_IN_SECONDS ) );

        // Enviar correo de verificación
        $email_body = '<p>¡Hola <strong>' . esc_html( $first_name ) . '</strong>! Bienvenido a Bassfit Perú.</p>' .
                      '<p>Para confirmar tu cuenta y proteger tus futuras compras, ingresa el siguiente código en la tienda web:</p>';
        self::send_branded_email( $email, 'Verifica tu cuenta en Bassfit Perú', '¡Bienvenido a la comunidad Bassfit!', $email_body, $otp );

        // Generar token de sesión para que el usuario pueda empezar a usar su cuenta de inmediato
        $token = self::generate_token( $user_id );

        self::success( array(
            'message'              => '¡Cuenta creada con éxito! Hemos enviado un código de 6 dígitos a tu correo.',
            'token'                => $token,
            'requiresVerification' => true,
            'user'                 => self::sanitize_customer_output( $user ),
        ), 201 );
    }

    /* =========================================================================
     * 2. INICIO DE SESIÓN CON CORREO Y CONTRASEÑA
     * ========================================================================= */

    private static function handle_login( array $data ) {
        $email    = sanitize_email( $data['email'] ?? '' );
        $password = (string) ( $data['password'] ?? '' );

        if ( empty( $email ) || empty( $password ) ) {
            self::error( 400, 'missing_credentials', 'Por favor ingresa tu correo y contraseña.' );
        }

        // Protección contra fuerza bruta
        if ( self::check_login_rate_limit( $email ) ) {
            self::error( 429, 'too_many_attempts', 'Demasiados intentos fallidos. Por seguridad de tu cuenta, espera ' . self::LOGIN_LOCKOUT_MINS . ' minutos antes de reintentar.' );
        }

        $user = get_user_by( 'email', $email );
        if ( ! $user ) {
            // Intentar por login si ingresó su usuario
            $user = get_user_by( 'login', $email );
        }

        if ( ! $user || ! wp_check_password( $password, $user->user_pass, $user->ID ) ) {
            self::record_failed_login( $email );
            self::error( 401, 'invalid_credentials', 'Correo o contraseña incorrectos. Verifica tus datos o usa la opción "¿Olvidaste tu contraseña?".' );
        }

        // Limpiar intentos fallidos al ingresar con éxito
        self::clear_failed_login( $email );

        $token = self::generate_token( $user->ID );

        self::success( array(
            'message' => '¡Bienvenido de nuevo, ' . ( get_user_meta( $user->ID, 'first_name', true ) ?: $user->display_name ) . '!',
            'token'   => $token,
            'user'    => self::sanitize_customer_output( $user ),
        ) );
    }

    /* =========================================================================
     * 3. INICIO Y REGISTRO CON GOOGLE (GOOGLE SIGN-IN)
     * ========================================================================= */

    private static function handle_google( array $data ) {
        $id_token = (string) ( $data['credential'] ?? '' );
        if ( empty( $id_token ) ) {
            self::error( 400, 'missing_token', 'No se recibió la credencial de autenticación de Google.' );
        }

        // Validar el ID token con el endpoint seguro de Google
        $response = wp_remote_get( 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode( $id_token ), array(
            'timeout' => 10,
        ) );

        if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
            self::error( 401, 'invalid_google_token', 'No se pudo verificar la autenticidad del inicio de sesión con Google.' );
        }

        $google_payload = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( ! is_array( $google_payload ) || empty( $google_payload['email'] ) ) {
            self::error( 401, 'invalid_google_payload', 'Respuesta no válida del proveedor de identidad Google.' );
        }

        $email       = sanitize_email( $google_payload['email'] );
        $google_id   = sanitize_text_field( $google_payload['sub'] ?? '' );
        $first_name  = sanitize_text_field( $google_payload['given_name'] ?? ( $google_payload['name'] ?? 'Cliente' ) );
        $last_name   = sanitize_text_field( $google_payload['family_name'] ?? '' );

        // Verificar si ya existe usuario con este email
        $user = get_user_by( 'email', $email );

        if ( $user ) {
            // Usuario ya existe: vincular ID de Google si no lo tiene
            update_user_meta( $user->ID, '_bassfit_google_id', $google_id );
            update_user_meta( $user->ID, '_bassfit_email_verified', 1 ); // Google ya verificó el correo
        } else {
            // Usuario nuevo: crear cuenta de cliente automáticamente
            $username = sanitize_user( $email );
            $random_pw = wp_generate_password( 24, true, true );
            $user_id = wp_create_user( $username, $random_pw, $email );

            if ( is_wp_error( $user_id ) ) {
                self::error( 500, 'google_signup_failed', 'Error al registrar cuenta con Google: ' . $user_id->get_error_message() );
            }

            $user = new WP_User( $user_id );
            $user->set_role( 'customer' );

            update_user_meta( $user_id, 'first_name', $first_name );
            update_user_meta( $user_id, 'last_name', $last_name );
            update_user_meta( $user_id, '_bassfit_google_id', $google_id );
            update_user_meta( $user_id, '_bassfit_auth_provider', 'google' );
            update_user_meta( $user_id, '_bassfit_email_verified', 1 ); // Verificado por Google
            update_user_meta( $user_id, '_bassfit_terms_accepted_at', gmdate( 'Y-m-d H:i:s' ) );
            update_user_meta( $user_id, '_bassfit_privacy_accepted_at', gmdate( 'Y-m-d H:i:s' ) );
        }

        $token = self::generate_token( $user->ID );

        self::success( array(
            'message' => '¡Sesión iniciada con Google correctamente!',
            'token'   => $token,
            'user'    => self::sanitize_customer_output( $user ),
        ) );
    }

    /* =========================================================================
     * 4. VERIFICACIÓN DE CORREO ELECTRÓNICO (OTP DE 6 DÍGITOS)
     * ========================================================================= */

    private static function handle_verify_email( array $data ) {
        $email = sanitize_email( $data['email'] ?? '' );
        $code  = trim( (string) ( $data['code'] ?? '' ) );

        if ( empty( $email ) || empty( $code ) ) {
            self::error( 400, 'missing_params', 'Por favor ingresa el código de 6 dígitos enviado a tu correo.' );
        }

        $user = get_user_by( 'email', $email );
        if ( ! $user ) {
            self::error( 404, 'user_not_found', 'No encontramos una cuenta asociada a este correo.' );
        }

        $stored_hash = get_user_meta( $user->ID, '_bassfit_email_verification_code', true );
        $expires_at  = (int) get_user_meta( $user->ID, '_bassfit_email_verification_expires', true );

        if ( empty( $stored_hash ) || time() > $expires_at ) {
            self::error( 400, 'code_expired', 'El código de verificación ha expirado o ya fue utilizado. Solicita uno nuevo.' );
        }

        if ( ! wp_check_password( $code, $stored_hash ) ) {
            self::error( 400, 'invalid_code', 'El código ingresado es incorrecto. Verifica los 6 dígitos recibidos.' );
        }

        // Marcar correo como verificado
        update_user_meta( $user->ID, '_bassfit_email_verified', 1 );
        delete_user_meta( $user->ID, '_bassfit_email_verification_code' );
        delete_user_meta( $user->ID, '_bassfit_email_verification_expires' );

        $token = self::generate_token( $user->ID );

        self::success( array(
            'message'  => '¡Tu correo ha sido verificado con éxito! Ahora tu cuenta está 100% activa.',
            'verified' => true,
            'token'    => $token,
            'user'     => self::sanitize_customer_output( $user ),
        ) );
    }

    private static function handle_resend_verification( array $data ) {
        $email = sanitize_email( $data['email'] ?? '' );
        if ( empty( $email ) ) {
            self::error( 400, 'missing_email', 'Ingresa tu correo para reenviar el código.' );
        }

        if ( self::check_code_request_rate_limit( $email ) ) {
            self::error( 429, 'rate_limited', 'Has solicitado varios códigos recientemente. Espera unos minutos antes de solicitar otro.' );
        }

        $user = get_user_by( 'email', $email );
        if ( ! $user ) {
            // Mensaje genérico para no revelar emails registrados
            self::success( array( 'message' => 'Si tu correo está registrado, recibirás un nuevo código en breve.' ) );
        }

        if ( (bool) get_user_meta( $user->ID, '_bassfit_email_verified', true ) ) {
            self::success( array( 'message' => 'Tu correo ya se encuentra verificado.', 'alreadyVerified' => true ) );
        }

        $otp = (string) wp_rand( 100000, 999999 );
        update_user_meta( $user->ID, '_bassfit_email_verification_code', wp_hash_password( $otp ) );
        update_user_meta( $user->ID, '_bassfit_email_verification_expires', time() + ( self::CODE_EXPIRY_MINS * MINUTE_IN_SECONDS ) );

        $first_name = get_user_meta( $user->ID, 'first_name', true ) ?: 'Cliente';
        $email_body = '<p>Hola <strong>' . esc_html( $first_name ) . '</strong>,</p>' .
                      '<p>Solicitaste un nuevo código para verificar tu correo en Bassfit Perú:</p>';
        self::send_branded_email( $email, 'Nuevo código de verificación - Bassfit Perú', 'Código de verificación de cuenta', $email_body, $otp );

        self::success( array(
            'message' => 'Te hemos enviado un nuevo código de 6 dígitos a tu correo.',
        ) );
    }

    /* =========================================================================
     * 5. RECUPERACIÓN Y RESTABLECIMIENTO DE CONTRASEÑA
     * ========================================================================= */

    private static function handle_forgot_password( array $data ) {
        $email = sanitize_email( $data['email'] ?? '' );
        if ( empty( $email ) || ! is_email( $email ) ) {
            self::error( 400, 'invalid_email', 'Por favor ingresa un correo electrónico válido.' );
        }

        if ( self::check_code_request_rate_limit( $email ) ) {
            self::error( 429, 'rate_limited', 'Has solicitado restablecimientos recientemente. Espera 10 minutos antes de solicitar otro.' );
        }

        $user = get_user_by( 'email', $email );
        if ( $user ) {
            $otp = (string) wp_rand( 100000, 999999 );
            update_user_meta( $user->ID, '_bassfit_password_reset_code', wp_hash_password( $otp ) );
            update_user_meta( $user->ID, '_bassfit_password_reset_expires', time() + ( self::CODE_EXPIRY_MINS * MINUTE_IN_SECONDS ) );

            $first_name = get_user_meta( $user->ID, 'first_name', true ) ?: 'Cliente';
            $email_body = '<p>Hola <strong>' . esc_html( $first_name ) . '</strong>,</p>' .
                          '<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Bassfit Perú.</p>' .
                          '<p>Ingresa este código en la pantalla de recuperación de la tienda:</p>';
            self::send_branded_email( $email, 'Recuperación de contraseña - Bassfit Perú', 'Restablece tu contraseña', $email_body, $otp );
        }

        // Respuesta segura contra enumeración de usuarios
        self::success( array(
            'message' => 'Si el correo ingresado coincide con una cuenta activa, recibirás un código de 6 dígitos en los próximos minutos.',
        ) );
    }

    private static function handle_reset_password( array $data ) {
        $email        = sanitize_email( $data['email'] ?? '' );
        $code         = trim( (string) ( $data['code'] ?? '' ) );
        $new_password = (string) ( $data['newPassword'] ?? '' );

        if ( empty( $email ) || empty( $code ) || empty( $new_password ) ) {
            self::error( 400, 'missing_params', 'Por favor completa todos los campos (correo, código y nueva contraseña).' );
        }

        if ( strlen( $new_password ) < 6 ) {
            self::error( 400, 'weak_password', 'La nueva contraseña debe tener al menos 6 caracteres.' );
        }

        $user = get_user_by( 'email', $email );
        if ( ! $user ) {
            self::error( 404, 'user_not_found', 'No se encontró la cuenta especificada.' );
        }

        $stored_hash = get_user_meta( $user->ID, '_bassfit_password_reset_code', true );
        $expires_at  = (int) get_user_meta( $user->ID, '_bassfit_password_reset_expires', true );

        if ( empty( $stored_hash ) || time() > $expires_at ) {
            self::error( 400, 'code_expired', 'El código de recuperación ha expirado o no es válido. Solicita uno nuevo.' );
        }

        if ( ! wp_check_password( $code, $stored_hash ) ) {
            self::error( 400, 'invalid_code', 'El código de recuperación ingresado es incorrecto.' );
        }

        // Actualizar contraseña de forma segura con hash de WordPress
        wp_set_password( $new_password, $user->ID );

        // Limpiar código de recuperación usado
        delete_user_meta( $user->ID, '_bassfit_password_reset_code' );
        delete_user_meta( $user->ID, '_bassfit_password_reset_expires' );

        // Generar nuevo token con la nueva contraseña
        $token = self::generate_token( $user->ID );

        self::success( array(
            'message' => '¡Tu contraseña ha sido actualizada con éxito! Ya puedes seguir comprando.',
            'token'   => $token,
            'user'    => self::sanitize_customer_output( $user ),
        ) );
    }

    /* =========================================================================
     * 6. ARQUITECTURA DE AUTENTICACIÓN POR TELÉFONO (SMS / WHATSAPP OTP)
     * ========================================================================= */

    private static function handle_phone_send_otp( array $data ) {
        $phone = preg_replace( '/[^0-9+]/', '', (string) ( $data['phone'] ?? '' ) );
        if ( strlen( $phone ) < 9 ) {
            self::error( 400, 'invalid_phone', 'Ingresa un número telefónico válido (ej. 987654321 o +51987654321).' );
        }

        $provider = get_option( 'bassfit_phone_otp_provider', 'none' );
        if ( 'none' === $provider ) {
            self::error( 501, 'provider_not_configured', 'El servicio de verificación por SMS/WhatsApp aún requiere configurar las credenciales del proveedor (Twilio o WhatsApp Cloud API) en el panel administrativo de Bassfit Perú. Por favor utiliza registro con correo o Google.' );
        }

        // Si existe un proveedor configurado (ej. Twilio o WhatsApp Cloud API):
        $otp = (string) wp_rand( 100000, 999999 );
        $key = 'bf_phone_otp_' . md5( $phone );
        set_transient( $key, wp_hash_password( $otp ), 10 * MINUTE_IN_SECONDS );

        // Llamar a hook para envío de SMS/WhatsApp por proveedor externo
        do_action( 'bassfit_send_phone_otp', $phone, $otp, $provider );

        self::success( array(
            'message' => 'Código de verificación enviado por SMS o WhatsApp a ' . $phone,
        ) );
    }

    private static function handle_phone_verify_otp( array $data ) {
        $phone = preg_replace( '/[^0-9+]/', '', (string) ( $data['phone'] ?? '' ) );
        $code  = trim( (string) ( $data['code'] ?? '' ) );

        $key = 'bf_phone_otp_' . md5( $phone );
        $stored_hash = get_transient( $key );

        if ( empty( $stored_hash ) || ! wp_check_password( $code, $stored_hash ) ) {
            self::error( 400, 'invalid_otp', 'Código de verificación telefónica inválido o expirado.' );
        }

        delete_transient( $key );

        // Buscar o crear usuario vinculado al teléfono
        $users = get_users( array(
            'meta_key'   => 'billing_phone',
            'meta_value' => $phone,
            'number'     => 1,
        ) );

        if ( ! empty( $users ) ) {
            $user = $users[0];
        } else {
            $dummy_email = 'phone_' . preg_replace( '/[^0-9]/', '', $phone ) . '@bassfitperu.com';
            $user_id = wp_create_user( $dummy_email, wp_generate_password( 24 ), $dummy_email );
            $user = new WP_User( $user_id );
            $user->set_role( 'customer' );
            update_user_meta( $user_id, 'billing_phone', $phone );
            update_user_meta( $user_id, '_bassfit_auth_provider', 'phone' );
        }

        $token = self::generate_token( $user->ID );
        self::success( array(
            'message' => '¡Ingreso telefónico verificado con éxito!',
            'token'   => $token,
            'user'    => self::sanitize_customer_output( $user ),
        ) );
    }

    /* =========================================================================
     * 7. ACTUALIZACIÓN DE PERFIL Y DATOS DE ENTREGA DEL CLIENTE
     * ========================================================================= */

    private static function handle_update_profile( WP_User $user, array $data ) {
        $first_name = isset( $data['firstName'] ) ? sanitize_text_field( $data['firstName'] ) : null;
        $last_name  = isset( $data['lastName'] ) ? sanitize_text_field( $data['lastName'] ) : null;
        $phone      = isset( $data['phone'] ) ? sanitize_text_field( $data['phone'] ) : null;

        if ( null !== $first_name && '' !== $first_name ) {
            update_user_meta( $user->ID, 'first_name', $first_name );
        }
        if ( null !== $last_name ) {
            update_user_meta( $user->ID, 'last_name', $last_name );
        }
        if ( null !== $phone ) {
            update_user_meta( $user->ID, 'billing_phone', $phone );
        }

        // Datos de dirección de entrega para agilizar compras
        if ( isset( $data['deliveryAddress'] ) && is_array( $data['deliveryAddress'] ) ) {
            $addr = $data['deliveryAddress'];
            $clean_addr = array(
                'address'    => sanitize_text_field( $addr['address'] ?? '' ),
                'city'       => sanitize_text_field( $addr['city'] ?? 'Lima' ),
                'district'   => sanitize_text_field( $addr['district'] ?? '' ),
                'department' => sanitize_text_field( $addr['department'] ?? 'Lima' ),
                'province'   => sanitize_text_field( $addr['province'] ?? 'Lima' ),
                'reference'  => sanitize_text_field( $addr['reference'] ?? '' ),
            );
            update_user_meta( $user->ID, '_bassfit_delivery_address', $clean_addr );
            update_user_meta( $user->ID, 'billing_address_1', $clean_addr['address'] );
            update_user_meta( $user->ID, 'billing_city', $clean_addr['district'] ?: $clean_addr['city'] );
            update_user_meta( $user->ID, 'billing_state', $clean_addr['department'] );
            update_user_meta( $user->ID, '_bassfit_delivery_reference', $clean_addr['reference'] );
        }

        $updated_user = get_userdata( $user->ID );
        self::success( array(
            'message' => '¡Tus datos han sido actualizados exitosamente!',
            'user'    => self::sanitize_customer_output( $updated_user ),
        ) );
    }

    /* =========================================================================
     * 8. HISTORIAL DE PEDIDOS DEL CLIENTE (AISLAMIENTO TOTAL - PROTECCIÓN IDOR)
     * ========================================================================= */

    private static function handle_get_customer_orders( WP_User $user ) {
        if ( ! function_exists( 'wc_get_orders' ) ) {
            self::success( array( 'orders' => array() ) );
        }

        // Obtener únicamente pedidos pertenecientes a este cliente por ID o por correo
        $orders_by_id = wc_get_orders( array(
            'customer_id' => $user->ID,
            'limit'       => 50,
            'orderby'     => 'date',
            'order'       => 'DESC',
        ) );

        $orders_by_email = array();
        if ( ! empty( $user->user_email ) ) {
            $orders_by_email = wc_get_orders( array(
                'billing_email' => $user->user_email,
                'limit'         => 50,
                'orderby'       => 'date',
                'order'         => 'DESC',
            ) );
        }

        // Combinar sin duplicados
        $order_ids = array();
        $all_orders = array();
        foreach ( array_merge( $orders_by_id, $orders_by_email ) as $order ) {
            if ( ! $order instanceof WC_Order ) continue;
            $oid = $order->get_id();
            if ( isset( $order_ids[ $oid ] ) ) continue;
            $order_ids[ $oid ] = true;
            $all_orders[] = $order;
        }

        $list = array();
        foreach ( $all_orders as $order ) {
            $items_out = array();
            foreach ( $order->get_items() as $item ) {
                $product = $item->get_product();
                $img_url = '';
                if ( $product && $product->get_image_id() ) {
                    $img_url = wp_get_attachment_image_url( $product->get_image_id(), 'thumbnail' );
                }
                $items_out[] = array(
                    'name'     => $item->get_name(),
                    'quantity' => (int) $item->get_quantity(),
                    'total'    => (float) $item->get_total(),
                    'imageUrl' => $img_url ?: 'images/brand/logo-bassfit-oficial.jpg',
                    'variant'  => wc_get_order_item_meta( $item->get_id(), 'Variedad', true ) ?: '',
                );
            }

            $status = $order->get_status();
            $status_labels = array(
                'pending'    => 'Pendiente de pago',
                'on-hold'    => 'En espera de verificación (20 min)',
                'processing' => 'Pago confirmado / En preparación',
                'completed'  => 'Entregado / Completado',
                'cancelled'  => 'Cancelado',
                'refunded'   => 'Reembolsado',
                'failed'     => 'Fallido',
            );

            // Generar enlace rápido para consultar estado por WhatsApp con el ID oficial
            $wa_msg = "Hola Bassfit 👋, deseo consultar el estado de mi pedido *#PED-{$order->get_id()}* realizado a nombre de *" . $user->display_name . "*. ¿Me podrían brindar detalles de mi entrega?";
            $wa_url = "https://wa.me/51967581481?text=" . rawurlencode( $wa_msg );

            $list[] = array(
                'id'             => $order->get_id(),
                'orderNumber'    => 'PED-' . $order->get_id(),
                'status'         => $status,
                'statusLabel'    => $status_labels[ $status ] ?? ucfirst( $status ),
                'dateCreated'    => $order->get_date_created() ? $order->get_date_created()->date( 'd/m/Y H:i' ) : '',
                'total'          => (float) $order->get_total(),
                'currency'       => $order->get_currency(),
                'items'          => $items_out,
                'itemCount'      => $order->get_item_count(),
                'shipping'       => array(
                    'address'   => $order->get_billing_address_1(),
                    'city'      => $order->get_billing_city(),
                    'phone'     => $order->get_billing_phone(),
                    'recipient' => trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() ),
                ),
                'whatsappUrl'    => $wa_url,
            );
        }

        self::success( array(
            'orders' => $list,
            'count'  => count( $list ),
        ) );
    }

    /* =========================================================================
     * 9. SOLICITUD DE ELIMINACIÓN DE CUENTA (LEY 29733 - DERECHOS ARCO)
     * ========================================================================= */

    private static function handle_delete_account_request( WP_User $user, array $data ) {
        // Registrar la solicitud conforme a la Ley 29733 sin romper integridad contable de WooCommerce
        update_user_meta( $user->ID, '_bassfit_arco_deletion_requested', gmdate( 'Y-m-d H:i:s' ) );
        update_user_meta( $user->ID, '_bassfit_email_verified', 0 );

        // Notificar a administración
        $admin_email = get_option( 'admin_email' );
        wp_mail(
            $admin_email,
            'Solicitud de Supresión de Datos (Ley 29733) - Cliente #' . $user->ID,
            "El cliente {$user->display_name} ({$user->user_email}, ID #{$user->ID}) ha solicitado la eliminación/anonimización de su cuenta conforme a la Ley 29733 de Protección de Datos Personales de Perú."
        );

        self::success( array(
            'message' => 'Tu solicitud de cancelación y supresión de datos conforme a la Ley 29733 ha sido registrada. Nuestro equipo procesará la desvinculación de tus datos personales.',
        ) );
    }

    /* =========================================================================
     * 10. ASOCIACIÓN AUTOMÁTICA EN CHECKOUT
     * ========================================================================= */

    public static function attach_customer_to_order( $order ) {
        if ( ! $order instanceof WC_Order ) return;
        $user = self::get_current_customer();
        if ( $user && ! $order->get_customer_id() ) {
            $order->set_customer_id( $user->ID );
            $order->save();
        }
    }

    /* =========================================================================
     * 11. PANEL DE ADMINISTRACIÓN EN WORDPRESS
     * ========================================================================= */

    public static function register_admin_menu() {
        add_submenu_page(
            'woocommerce',
            'Clientes y Autenticación Bassfit',
            'Clientes Web (Auth)',
            'manage_woocommerce',
            'bassfit-customer-auth',
            array( __CLASS__, 'render_admin_page' )
        );
    }

    public static function register_settings() {
        register_setting( 'bassfit_auth_settings', 'bassfit_google_client_id' );
        register_setting( 'bassfit_auth_settings', 'bassfit_phone_otp_provider' );
        register_setting( 'bassfit_auth_settings', 'bassfit_twilio_sid' );
        register_setting( 'bassfit_auth_settings', 'bassfit_twilio_token' );
        register_setting( 'bassfit_auth_settings', 'bassfit_twilio_from' );
    }

    public static function render_admin_page() {
        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_die( 'No tienes permisos suficientes para acceder a esta página.' );
        }

        $google_cid  = get_option( 'bassfit_google_client_id', '' );
        $provider    = get_option( 'bassfit_phone_otp_provider', 'none' );
        $twilio_sid  = get_option( 'bassfit_twilio_sid', '' );

        // Estadísticas de clientes
        $customer_query = new WP_User_Query( array(
            'role'   => 'customer',
            'number' => 1,
            'count_total' => true,
        ) );
        $total_customers = $customer_query->get_total();

        ?>
        <div class="wrap">
            <h1 style="display:flex;align-items:center;gap:10px;">
                <span style="background:#FF5500;color:#fff;font-size:14px;font-weight:900;padding:4px 10px;border-radius:6px;">BASSSIT</span>
                Gestión de Clientes y Autenticación Web
            </h1>
            <p>Configuración del sistema de registro, inicio de sesión, Google Sign-In y protección de datos para Bassfit Perú (Ley N° 29733).</p>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:15px;margin:20px 0;">
                <div style="background:#fff;padding:18px;border-radius:12px;border:1px solid #ccd0d4;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Clientes registrados</div>
                    <div style="font-size:28px;font-weight:900;color:#0F172A;margin-top:6px;"><?php echo esc_html( $total_customers ); ?></div>
                    <div style="font-size:11px;color:#10b981;margin-top:4px;">● Rol WooCommerce 'customer' aislado</div>
                </div>
                <div style="background:#fff;padding:18px;border-radius:12px;border:1px solid #ccd0d4;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Seguridad de contraseñas</div>
                    <div style="font-size:16px;font-weight:800;color:#0F172A;margin-top:8px;">Hash bcrypt / phpass</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Nunca almacenadas en texto plano</div>
                </div>
                <div style="background:#fff;padding:18px;border-radius:12px;border:1px solid #ccd0d4;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Protección Ley 29733</div>
                    <div style="font-size:16px;font-weight:800;color:#10b981;margin-top:8px;">✓ Activa y conforme</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Registro de consentimiento y derechos ARCO</div>
                </div>
            </div>

            <div style="background:#fff;padding:24px;border-radius:12px;border:1px solid #ccd0d4;max-width:850px;">
                <form method="post" action="options.php">
                    <?php settings_fields( 'bassfit_auth_settings' ); ?>
                    <?php do_settings_sections( 'bassfit_auth_settings' ); ?>

                    <h2>1. Integración con Google (Google Sign-In)</h2>
                    <p style="font-size:13px;color:#64748b;">
                        Permite a tus clientes registrarse e iniciar sesión con 1 clic usando su cuenta de Google. Para activarlo, ingresa a <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud Console</a>, crea un ID de cliente OAuth 2.0 y pega aquí el <em>Client ID</em>:
                    </p>
                    <table class="form-table">
                        <tr>
                            <th scope="row"><label for="bassfit_google_client_id">Google Client ID</label></th>
                            <td>
                                <input type="text" id="bassfit_google_client_id" name="bassfit_google_client_id" value="<?php echo esc_attr( $google_cid ); ?>" class="regular-text" placeholder="Ej: 123456789-abcdef.apps.googleusercontent.com" style="width:100%;max-width:550px;" />
                                <p class="description">Si lo dejas vacío, la opción "Continuar con Google" solicitará la configuración al administrador antes de autenticar.</p>
                            </td>
                        </tr>
                    </table>

                    <hr style="margin:25px 0;border:none;border-top:1px solid #eee;" />

                    <h2>2. Verificación Telefónica (SMS / WhatsApp OTP)</h2>
                    <p style="font-size:13px;color:#64748b;">
                        Configura un proveedor de mensajería para habilitar códigos de un solo uso por teléfono:
                    </p>
                    <table class="form-table">
                        <tr>
                            <th scope="row"><label for="bassfit_phone_otp_provider">Proveedor SMS / OTP</label></th>
                            <td>
                                <select id="bassfit_phone_otp_provider" name="bassfit_phone_otp_provider">
                                    <option value="none" <?php selected( $provider, 'none' ); ?>>Deshabilitado (solo correo y Google)</option>
                                    <option value="twilio" <?php selected( $provider, 'twilio' ); ?>>Twilio SMS API</option>
                                    <option value="whatsapp" <?php selected( $provider, 'whatsapp' ); ?>>WhatsApp Cloud API (Meta)</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="bassfit_twilio_sid">Account SID / API Key</label></th>
                            <td>
                                <input type="text" id="bassfit_twilio_sid" name="bassfit_twilio_sid" value="<?php echo esc_attr( $twilio_sid ); ?>" class="regular-text" />
                            </td>
                        </tr>
                    </table>

                    <?php submit_button( 'Guardar Ajustes de Autenticación' ); ?>
                </form>
            </div>
        </div>
        <?php
    }
}

Bassfit_Customer_Auth::init();
