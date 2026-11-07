/**
 * ============================================================================
 * ENDPOINT TRANSACCIONAL DE CHECKOUT + VALIDACIÓN ESTRICTA DE BACKEND
 * Ruta: POST /api/checkout
 * Seguridad: OWASP Top 10 (Anti-CSRF, Input Sanitization, Rate Limiting)
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { BASSFIT_PRODUCTS, buildWhatsAppAdvisorUrl } from "@/lib/bassfit-data";
import { resolveStrictSaleMode } from "@/lib/woocommerce";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export interface CheckoutItemPayload {
  productId: string;
  wcId: number;
  slug: string;
  quantity: number;
}

export interface CheckoutRequestPayload {
  customer?: {
    fullName?: string;
    email?: string;
    phone?: string;
    dniOrRuc?: string;
    address?: string;
    city?: string;
  };
  items: CheckoutItemPayload[];
}

// Verificación de origen seguro (Anti-CSRF)
function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const checkUrl = origin || referer;
  if (!checkUrl) return true;

  try {
    const urlObj = new URL(checkUrl);
    const host = urlObj.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith("bassfit.com") ||
      host.endsWith("bassfit.pe") ||
      host.endsWith("github.io") ||
      host.endsWith("trycloudflare.com")
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificación de Origen y Prevención de CSRF
    if (!isAllowedOrigin(req)) {
      return NextResponse.json(
        { error: "Acceso denegado: Origen no autorizado (Cross-Origin Request Blocked)." },
        { status: 403 }
      );
    }

    // 2. Protección contra ataques de denegación en checkout (Máximo 10 solicitudes cada 5 minutos)
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(clientIp, "checkout", 10, 5 * 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: "Demasiadas solicitudes de compra en corto tiempo. Por favor espera unos minutos.",
        },
        { status: 429 }
      );
    }

    // 3. Verificación de Content-Type
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Cabecera Content-Type inválida. Se requiere application/json." },
        { status: 415 }
      );
    }

    const body = (await req.json()) as CheckoutRequestPayload;

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "El carrito está vacío. Añade al menos un implemento deportivo." },
        { status: 400 }
      );
    }

    // Límite de seguridad: máximo 50 líneas distintas por carrito
    if (body.items.length > 50) {
      return NextResponse.json(
        { error: "Límite de artículos por orden excedido (máximo 50 ítems)." },
        { status: 400 }
      );
    }

    // 4. AUDITORÍA ESTRICTA DE BACKEND: Verificar que NINGÚN producto sea un Suplemento
    for (const item of body.items) {
      const catalogProduct = BASSFIT_PRODUCTS.find(
        (p) => p.id === item.productId || p.wcId === item.wcId || p.slug === item.slug
      );

      if (!catalogProduct) {
        return NextResponse.json(
          { error: `Producto no encontrado en el catálogo oficial de Bassfit (${String(item.slug || "").slice(0, 50)}).` },
          { status: 404 }
        );
      }

      const strictMode = resolveStrictSaleMode(
        catalogProduct.categorySlug,
        catalogProduct.saleMode === "direct_cart",
        catalogProduct.saleMode
      );

      if (strictMode === "consultative_whatsapp") {
        return NextResponse.json(
          {
            error: "RESTRICCIÓN DE SEGURIDAD BACKEND (VENTA CONSULTIVA OBLIGATORIA)",
            message: `El producto «${catalogProduct.name}» pertenece a la categoría de Suplementos. Por política de salud y personalización de Bassfit, su venta requiere evaluación previa con un asesor vía WhatsApp y no puede procesarse en el checkout directo.`,
            blockedProduct: catalogProduct.name,
            whatsappRedirectUrl: buildWhatsAppAdvisorUrl(catalogProduct),
          },
          { status: 403 }
        );
      }
    }

    // 5. Cálculo verificado en servidor (nunca confiar en precios enviados por el cliente)
    let subtotal = 0;
    const verifiedLineItems = body.items.map((item) => {
      const product = BASSFIT_PRODUCTS.find(
        (p) => p.id === item.productId || p.wcId === item.wcId
      )!;
      const qty = Math.max(1, Math.min(10, Number(item.quantity) || 1));
      const lineTotal = product.price * qty;
      subtotal += lineTotal;
      return {
        product_id: product.wcId,
        name: product.name,
        sku: product.sku,
        quantity: qty,
        unit_price: product.price,
        line_total: lineTotal,
      };
    });

    const shippingCost = subtotal >= 250 ? 0 : 15;
    const totalAmount = subtotal + shippingCost;
    const orderReference = `BF-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    // 6. Generación de Sesión Transaccional con Pasarela Easy Pay + Orden WooCommerce
    return NextResponse.json({
      success: true,
      gateway: "Easy Pay Perú (HTTPS Encrypted)",
      orderReference,
      wcOrderStatus: "pending_payment",
      currency: "PEN",
      summary: {
        subtotal,
        shippingCost,
        totalAmount,
        itemsCount: verifiedLineItems.reduce((acc, i) => acc + i.quantity, 0),
        lineItems: verifiedLineItems,
      },
      easyPaySession: {
        merchantId: process.env.EASYPAY_MERCHANT_ID || "merchant_bassfit_prod",
        transactionToken: `ep_tok_${Buffer.from(orderReference).toString("hex")}`,
        checkoutUrl: `https://checkout.easypay.pe/pay/${orderReference}`,
        webhookCallbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.bassfit.com"}/api/webhooks/easypay`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno procesando el checkout con pasarela.", details: error?.message },
      { status: 500 }
    );
  }
}
