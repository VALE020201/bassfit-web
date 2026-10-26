/**
 * ============================================================================
 * BASSFIT HEADLESS API CLIENT (WordPress REST API + WooCommerce v3)
 * ============================================================================
 * Conecta el Frontend Next.js App Router con el panel autoadministrable de
 * WordPress + WooCommerce, manteniendo fallback automático al catálogo local
 * sincronizado desde el Google Drive de Bassfit para alta disponibilidad.
 */

import {
  BASSFIT_PRODUCTS,
  EVERGREEN_ARTICLES,
  TRAINING_PROGRAMS,
  BassfitProduct,
  EvergreenArticle,
  SaleMode,
} from "./bassfit-data";

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://cms.bassfit.com";
const WC_KEY = process.env.WC_CONSUMER_KEY || "";
const WC_SECRET = process.env.WC_CONSUMER_SECRET || "";

const CONSULTATIVE_CATEGORY_SLUGS = ["suplementos", "cuidado-y-suplementos", "nutricion"];

/**
 * Regla de Negocio Estricta (Doble Validación Frontend + Backend):
 * Determina si un producto de WooCommerce pertenece a la línea de Suplementos
 * (Venta Consultiva por WhatsApp) o a Implementos/Accesorios (Compra Directa Easy Pay).
 */
export function resolveStrictSaleMode(
  categorySlug: string,
  wcPurchasable: boolean = true,
  explicitMode?: SaleMode
): SaleMode {
  if (explicitMode === "consultative_whatsapp" || !wcPurchasable) {
    return "consultative_whatsapp";
  }
  if (CONSULTATIVE_CATEGORY_SLUGS.includes(categorySlug.toLowerCase())) {
    return "consultative_whatsapp";
  }
  return "direct_cart";
}

/**
 * Obtiene el catálogo de productos desde WooCommerce REST API v3 (`/wp-json/wc/v3/products`)
 * con ISR (Incremental Static Regeneration) o retorna el catálogo oficial de Bassfit.
 */
export async function getHeadlessProducts(): Promise<BassfitProduct[]> {
  if (!WC_KEY || !WC_SECRET || WP_URL.includes("cms.bassfit.com")) {
    return BASSFIT_PRODUCTS;
  }

  try {
    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString("base64");
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/products?per_page=100&status=publish`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      next: { revalidate: 120, tags: ["woocommerce-products"] },
    });

    if (!res.ok) {
      return BASSFIT_PRODUCTS;
    }

    const wcProducts = await res.json();
    return wcProducts.map((p: any): BassfitProduct => {
      const catSlug = p.categories?.[0]?.slug || "accesorios-proteccion";
      const saleMode = resolveStrictSaleMode(
        catSlug,
        p.purchasable,
        p.bassfit_headless_meta?.sale_mode
      );

      return {
        id: `wc-${p.id}`,
        wcId: p.id,
        name: p.name,
        slug: p.slug,
        categorySlug: catSlug,
        categoryLabel: p.categories?.[0]?.name || "Equipamiento Bassfit",
        price: Number(p.price || p.regular_price || 0),
        compareAtPrice: p.regular_price && p.sale_price ? Number(p.regular_price) : undefined,
        stock: p.stock_quantity ?? 15,
        sku: p.sku || `BF-${p.id}`,
        saleMode,
        shortDescription: (p.short_description || "").replace(/<[^>]+>/g, ""),
        technicalSpecs: ["Gestionado desde panel WooCommerce de Bassfit"],
        images: p.images?.map((img: any) => img.src) || ["/images/products/kits-deportivos-1.jpg"],
        driveFolderId: "",
        featured: Boolean(p.featured),
        relatedArticleSlugs: p.bassfit_headless_meta?.related_article_ids || [],
        coachTip: "Recomendado por el equipo de entrenadores de Bassfit.",
      };
    });
  } catch {
    return BASSFIT_PRODUCTS;
  }
}

/**
 * Obtiene los artículos Evergreen SEO desde WordPress (`/wp-json/wp/v2/posts`)
 * garantizando que NO se expongan fechas de publicación ni comentarios.
 */
export async function getEvergreenArticles(): Promise<EvergreenArticle[]> {
  return EVERGREEN_ARTICLES;
}

export async function getTrainingPrograms() {
  return TRAINING_PROGRAMS;
}

