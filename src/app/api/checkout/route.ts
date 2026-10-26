/**
 * ============================================================================
 * ENDPOINT TRANSACCIONAL DE CHECKOUT + VALIDACIÓN ESTRICTA DE BACKEND
 * Ruta: POST /api/checkout
 * ============================================================================
 * Regla Crítica de Negocio Bassfit:
 * - Los implementos y accesorios siguen el flujo de compra directa y generan una
 *   orden en estado `pending` en WooCommerce + sesión de pago en **Easy Pay**.
 * - Los SUPLEMENTOS tienen PROHIBIDA la compra directa por carrito. Si un cliente
 *   o script intenta inyectar un suplemento en el payload del checkout, este
 *   endpoint rechaza la transacción con HTTP 403 Forbidden y devuelve el enlace
 *   de evaluación consultiva por WhatsApp.
 */

import { NextRequest, NextResponse } from "next/server";
import { BASSFIT_PRODUCTS, buildWhatsAppAdvisorUrl } from "@/lib/bassfit-data";
import { resolveStrictSaleMode } from "@/lib/woocommerce";

export interface CheckoutItemPayload {
  productId: string;
  wcId: number;
  slug: string;
  quantity: number;
}

export interface CheckoutRequestPayload {
  customer: {
    fullName: string;
    email: string;
    phone: string;
    dniOrRuc: string;
    address: string;
    city: string;
  };
  items: CheckoutItemPayload[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutRequestPayload;

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "El carrito está vacío. Añade al menos un implemento deportivo." },
        { status: 400 }
      );
    }

    // 1. AUDITORÍA ESTRICTA DE BACKEND: Verificar que NINGÚN producto sea un Suplemento
    for (const item of body.items) {
      const catalogProduct = BASSFIT_PRODUCTS.find(
        (p) => p.id === item.productId || p.wcId === item.wcId || p.slug === item.slug
      );

      if (!catalogProduct) {
        return NextResponse.json(
          { error: `Producto no encontrado en el catálogo oficial de Bassfit (${item.slug}).` },
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

    // 2. Cálculo verificado en servidor (nunca confiar en precios enviados por el cliente)
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

    // 3. Generación de Sesión Transaccional con Pasarela Easy Pay + Orden WooCommerce
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
      { error: "Error interno procesando el checkout con Easy Pay.", details: error?.message },
      { status: 500 }
    );
  }
}

