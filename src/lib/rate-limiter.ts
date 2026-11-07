/**
 * ============================================================================
 * UTILIDAD DE LIMITACIÓN DE TASA (RATE LIMITER) Y PROTECCIÓN ANTISPAM
 * Módulo: src/lib/rate-limiter.ts
 * ============================================================================
 * Implementa una ventana deslizante en memoria para proteger endpoints sensibles
 * contra ataques de fuerza bruta, spam masivo de bots y saturación de servidor.
 */

import { NextRequest } from "next/server";

interface RateRecord {
  count: number;
  resetTime: number;
}

// Almacén en memoria por clave (IP + Acción)
const rateLimitStore = new Map<string, RateRecord>();

// Limpieza automática periódica para evitar fugas de memoria
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000); // Cada 10 minutos

/**
 * Extrae la dirección IP real del cliente considerando proxies y CDN (Cloudflare, Vercel, Nginx)
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Verifica si la solicitud supera el límite permitido para una acción determinada.
 *
 * @param ip Dirección IP del cliente
 * @param action Identificador de la acción ('reclamaciones', 'checkout', etc.)
 * @param maxRequests Número máximo de solicitudes permitidas en la ventana
 * @param windowMs Duración de la ventana de tiempo en milisegundos (por defecto 10 minutos)
 */
export function checkRateLimit(
  ip: string,
  action: string,
  maxRequests: number = 5,
  windowMs: number = 10 * 60 * 1000
): { success: boolean; remaining: number; resetTime: number } {
  const key = `${action}:${ip}`;
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  if (record.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;
  return {
    success: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}
