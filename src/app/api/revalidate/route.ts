/**
 * ============================================================================
 * WEBHOOK DE REVALIDACIÓN INSTANTÁNEA (ISR) DESDE WORDPRESS
 * Ruta: POST /api/revalidate?secret=whsec_...
 * ============================================================================
 * Cuando el administrador crea, edita o elimina un producto en WordPress/WooCommerce,
 * WordPress llama a este endpoint para purgar la caché de Next.js al instante.
 */

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret");
    const configuredSecret = process.env.WORDPRESS_WEBHOOK_SECRET;

    if (!configuredSecret || secret !== configuredSecret) {
      return NextResponse.json(
        { error: "Token de revalidación inválido o no configurado." },
        { status: 401 }
      );
    }

    // Purga la caché de productos de WooCommerce al instante
    revalidateTag("woocommerce-products");

    return NextResponse.json({
      revalidated: true,
      tag: "woocommerce-products",
      timestamp: new Date().toISOString(),
      message: "Catálogo de productos sincronizado al instante desde WordPress.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno revalidando la caché.", details: error?.message },
      { status: 500 }
    );
  }
}
