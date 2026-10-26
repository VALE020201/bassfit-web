# BASSFIT — Plataforma Web Headless (Next.js App Router + WordPress/WooCommerce + Easy Pay)

**Filosofía de Marca:** `...fitness sin límites de edad..`  
**Propuesta Visual Seleccionada:** Concepto n.º 2 — *Clean Athletic* (Luminosa, fondo blanco `#FFFFFF`, Gris `#F8FAFC`, Naranja `#FF4A00`, Azul `#0F172A`).  
**Jerarquía de Contenidos:** ** Entrenamientos, Asesorías y Estilo de Vida Activo** / ** Catálogo Comercial de Productos**.

---

## 1. Estructura del Proyecto

```text
bassfit-headless/
├── public/
│   ├── images/
│   │   ├── brand/
│   │   │   └── logo-bassfit-oficial.jpg       # Imagotipo oficial Bassfit
│   │   └── products/                          # 91 fotografías reales descargadas del Google Drive del cliente
│   └── preview-interactivo.html               # Vista previa interactiva autónoma (doble clic para abrir en navegador)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── checkout/route.ts              # Endpoint transaccional Easy Pay + Bloqueo HTTP 403 a Suplementos
│   │   │   └── webhooks/easypay/route.ts      # Webhook autenticado HMAC-SHA256 para sincronizar estados en WooCommerce
│   │   ├── globals.css
│   │   ├── layout.tsx                         # Tipografías institucionales (Montserrat + Lato) y metadatos SEO
│   │   └── page.tsx                           # Página principal App Router
│   ├── components/
│   │   └── BassfitClientApp.tsx               # Aplicación completa ( Entrenamientos, Tienda 47 prod., Blog Evergreen)
│   └── lib/
│       ├── bassfit-data.ts                    # Catálogo real de Google Drive, Planes de Entrenamiento y Artículos SEO
│       └── woocommerce.ts                     # Cliente Headless WooCommerce REST API v3 y guardia de Venta Consultiva
├── wordpress-backend/
│   └── bassfit-headless-rules.php             # Plugin PHP para WordPress/WooCommerce (bloqueo estricto de Suplementos en Backend)
├── .env.example
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 2. Cómo Visualizar y Ejecutar el Proyecto

### Opción A: Vista Previa Interactiva Inmediata (Sin requerir servidor Node.js)
Puedes abrir directamente en cualquier navegador el archivo:
- `public/preview-interactivo.html`

Incluye todas las secciones interactivas, las **91 fotos reales descargadas del Google Drive**, el buscador, los filtros por categoría, el carrito con **Easy Pay** para implementos y el bloqueo estricto con derivación a **WhatsApp** para suplementos.

### Opción B: Ejecución en Entorno de Desarrollo / Producción Next.js
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Copiar las variables de entorno y configurar las llaves de WooCommerce y Easy Pay:
   ```bash
   cp .env.example .env.local
   ```
3. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```

---

## 3. Instalación del Plugin de Reglas en WordPress (Backend)
1. Subir el archivo `wordpress-backend/bassfit-headless-rules.php` a la carpeta `/wp-content/plugins/bassfit-headless-rules/` (o `/wp-content/mu-plugins/`) de la instalación de WordPress.
2. Activarlo desde el panel de administración de WordPress.
3. El plugin aplica automáticamente:
   - Bloqueo en servidor (`woocommerce_is_purchasable = false`, `woocommerce_add_to_cart_validation` y filtro REST API `HTTP 403`) para cualquier producto en la categoría `suplementos`.
   - Desactivación global de comentarios y ocultamiento de fechas de publicación para el blog **Evergreen SEO**.
   - Exposición en la REST API de los metadatos de vinculación bidireccional entre productos y artículos editoriales.

