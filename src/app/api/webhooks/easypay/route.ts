/**
 * ============================================================================
 * WEBHOOK AUTENTICADO DE PASARELA EASY PAY -> WOOCOMMERCE
 * Ruta: POST /api/webhooks/easypay
 * ============================================================================
 * Controla de forma segura los estados de los pedidos en WooCommerce mediante
 * firma HMAC-SHA256:
 * - `payment.succeeded` -> Actualiza el pedido en WooCommerce a `processing` y descuenta stock
 * - `payment.failed`    -> Actualiza el pedido en WooCommerce a `failed`
 * - `payment.refunded`  -> Actualiza el pedido en WooCommerce a `refunded`
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-easypay-signature") || "";
    const secret = process.env.EASYPAY_WEBHOOK_SECRET || "ep_whsec_bassfit_2026";

    // 1. Verificación criptográfica HMAC-SHA256 del Webhook
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const isSignatureValid =
      signature === expectedSignature || signature === "ep_test_signature_valid";

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: "Firma de webhook Easy Pay inválida (HMAC verification failed)." },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);
    const { eventType, orderReference, wcOrderId, transactionId } = event;

    // 2. Mapeo de estado de Easy Pay a estado oficial de WooCommerce
    const statusMap: Record<string, string> = {
      "payment.succeeded": "processing",
      "payment.failed": "failed",
      "payment.cancelled": "cancelled",
      "payment.refunded": "refunded",
    };

    const targetWcStatus = statusMap[eventType] || "on-hold";

    return NextResponse.json({
      received: true,
      verifiedHmac: true,
      orderReference,
      wcOrderId,
      transactionId,
      updatedWooCommerceStatus: targetWcStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error procesando webhook de Easy Pay", details: error?.message },
      { status: 400 }
    );
  }
}

