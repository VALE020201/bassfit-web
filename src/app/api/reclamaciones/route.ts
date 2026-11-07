/**
 * ============================================================================
 * ENDPOINT OFICIAL: LIBRO DE RECLAMACIONES VIRTUAL (INDECOPI)
 * Ruta: POST /api/reclamaciones
 * Normativa: D.S. N° 011-2011-PCM, D.S. N° 042-2011-PCM y Ley N° 31435
 * ============================================================================
 * Obligación Legal (Art. 4-B D.S. 011-2011-PCM):
 * El proveedor debe enviar automáticamente una copia de la Hoja de Reclamación
 * al correo electrónico consignado por el consumidor, dejando constancia
 * indubitable de la fecha y hora de recepción y del código asignado.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import path from "path";

export interface ReclamacionPayload {
  codigo: string;
  fecha: string;
  nombre: string;
  tipoDoc: string;
  numDoc: string;
  telefono: string;
  email: string;
  direccion: string;
  tipoBien: "producto" | "servicio";
  monto: string;
  descripcionBien: string;
  tipoReclamo: "reclamo" | "queja";
  detalle: string;
  pedido: string;
  autoriza: boolean;
}

// Función auxiliar para escapar caracteres HTML y prevenir inyección
function escapeHtml(text: string = ""): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: NextRequest) {
  try {
    // 0. Protección contra spam masivo y bots (Máximo 5 envíos por IP cada 10 minutos)
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(clientIp, "reclamaciones", 5, 10 * 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: "Has excedido el límite temporal de solicitudes. Por favor espera unos minutos antes de registrar una nueva reclamación.",
        },
        { status: 429 }
      );
    }

    const data = (await req.json()) as ReclamacionPayload;

    // 1. Validación de campos obligatorios según INDECOPI
    if (!data.nombre || !data.numDoc || !data.email || !data.detalle) {
      return NextResponse.json(
        { error: "Datos incompletos. Nombre, documento, email y detalle son obligatorios." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: "Formato de correo electrónico inválido." },
        { status: 400 }
      );
    }

    const codigoFinal =
      data.codigo ||
      `${data.tipoReclamo === "queja" ? "QUE" : "REC"}-2026-${Math.floor(
        1000 + Math.random() * 9000
      )}`;
    const timestampIso = new Date().toISOString();
    const fechaLegal = data.fecha || new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });

    // 2. Registro de auditoría local (Custodia obligatoria de 2 años - Directiva INDECOPI)
    try {
      const auditDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(auditDir)) {
        fs.mkdirSync(auditDir, { recursive: true });
      }
      const auditFile = path.join(auditDir, "reclamaciones-audit.json");
      let registros = [];
      if (fs.existsSync(auditFile)) {
        try {
          registros = JSON.parse(fs.readFileSync(auditFile, "utf-8"));
        } catch {
          registros = [];
        }
      }
      registros.push({
        codigo: codigoFinal,
        registradoEn: timestampIso,
        fechaLegal,
        consumidor: {
          nombre: data.nombre,
          tipoDoc: data.tipoDoc,
          numDoc: data.numDoc,
          telefono: data.telefono,
          email: data.email,
          direccion: data.direccion,
        },
        bien: {
          tipoBien: data.tipoBien,
          monto: data.monto,
          descripcionBien: data.descripcionBien,
        },
        reclamacion: {
          tipoReclamo: data.tipoReclamo,
          detalle: data.detalle,
          pedido: data.pedido,
          autorizaTratamientoDatos: data.autoriza,
        },
        plazoRespuestaDiasHabiles: 15,
        estado: "REGISTRADO_PENDIENTE_RESPUESTA",
      });
      fs.writeFileSync(auditFile, JSON.stringify(registros, null, 2), "utf-8");
    } catch (auditErr) {
      console.warn("Aviso: No se pudo escribir en el archivo de auditoría local:", auditErr);
    }

    // 3. Generación de plantilla formal de correo electrónico (Norma INDECOPI)
    const emailSubject = `[BASSFIT PERÚ] Constancia de Hoja de Reclamación Virtual N° ${codigoFinal}`;
    const emailHtmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Constancia de Hoja de Reclamación - BASSFIT PERÚ</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px;">
  <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #ff5500;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">
        BASSFIT PERÚ · LIBRO DE RECLAMACIONES VIRTUAL
      </h1>
      <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 12px;">
        Conforme al D.S. N° 011-2011-PCM y Ley N° 31435 INDECOPI
      </p>
    </div>

    <div style="padding: 24px;">
      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <span style="display: block; font-size: 12px; font-weight: bold; color: #ea580c; text-transform: uppercase;">
          Código Oficial Asignado:
        </span>
        <span style="display: block; font-size: 24px; font-weight: 900; color: #c2410c; margin-top: 4px;">
          ${escapeHtml(codigoFinal)}
        </span>
        <span style="display: block; font-size: 12px; color: #7c2d12; margin-top: 6px;">
          <strong>Fecha y hora de registro:</strong> ${escapeHtml(fechaLegal)}
        </span>
      </div>

      <div style="background-color: #f1f5f9; border-left: 4px solid #0f172a; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #334155;">
        <strong>Garantía de Atención Legal (Ley N° 31435):</strong><br>
        BASSFIT PERÚ dará respuesta formal a su ${escapeHtml(data.tipoReclamo.toUpperCase())} en un plazo máximo e improrrogable de <strong>quince (15) días hábiles</strong>.
      </div>

      <h3 style="font-size: 14px; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 20px;">
        1. Identificación del Consumidor Reclamante
      </h3>
      <table style="width: 100%; font-size: 13px; line-height: 1.6; margin-bottom: 16px;">
        <tr><td style="width: 35%; color: #64748b;"><strong>Nombre / Razón Social:</strong></td><td>${escapeHtml(data.nombre)}</td></tr>
        <tr><td style="color: #64748b;"><strong>Documento:</strong></td><td>${escapeHtml(data.tipoDoc)}: ${escapeHtml(data.numDoc)}</td></tr>
        <tr><td style="color: #64748b;"><strong>Teléfono / WhatsApp:</strong></td><td>${escapeHtml(data.telefono || "No especificado")}</td></tr>
        <tr><td style="color: #64748b;"><strong>Correo Electrónico:</strong></td><td>${escapeHtml(data.email)}</td></tr>
        <tr><td style="color: #64748b;"><strong>Domicilio en Perú:</strong></td><td>${escapeHtml(data.direccion)}</td></tr>
      </table>

      <h3 style="font-size: 14px; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 20px;">
        2. Identificación del Bien Contratado
      </h3>
      <table style="width: 100%; font-size: 13px; line-height: 1.6; margin-bottom: 16px;">
        <tr><td style="width: 35%; color: #64748b;"><strong>Tipo de Bien:</strong></td><td>${escapeHtml(data.tipoBien.toUpperCase())}</td></tr>
        <tr><td style="color: #64748b;"><strong>Monto Reclamado:</strong></td><td>${escapeHtml(data.monto ? `S/ ${data.monto}` : "No precisado")}</td></tr>
        <tr><td style="color: #64748b;"><strong>Descripción del Bien:</strong></td><td>${escapeHtml(data.descripcionBien || "Implemento / Servicio Bassfit")}</td></tr>
      </table>

      <h3 style="font-size: 14px; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 20px;">
        3. Detalle de la Reclamación y Pedido
      </h3>
      <table style="width: 100%; font-size: 13px; line-height: 1.6; margin-bottom: 16px;">
        <tr><td style="width: 35%; color: #64748b;"><strong>Naturaleza:</strong></td><td><strong>${escapeHtml(data.tipoReclamo === "queja" ? "QUEJA (Atención al público)" : "RECLAMO (Producto / Servicio)")}</strong></td></tr>
        <tr><td style="color: #64748b; vertical-align: top;"><strong>Detalle de Hechos:</strong></td><td style="background: #f8fafc; padding: 8px; border-radius: 6px;">${escapeHtml(data.detalle)}</td></tr>
        <tr><td style="color: #64748b; vertical-align: top;"><strong>Pedido Concreto:</strong></td><td style="background: #f8fafc; padding: 8px; border-radius: 6px;">${escapeHtml(data.pedido || "Atención y solución conforme a la garantía de idoneidad")}</td></tr>
      </table>

      <div style="font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; text-align: justify;">
        <strong>Nota Legal:</strong> La formulación del reclamo no excluye el recurso a otros medios de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.<br>
        Tratamiento de datos personales realizado bajo el amparo de la Ley N° 29733 para la exclusiva atención de la presente reclamación.
      </div>
    </div>

    <div style="background-color: #0f172a; color: #94a3b8; padding: 14px 24px; text-align: center; font-size: 11px;">
      BASSFIT PERÚ · Operación comercial en regularización registral · Lima, Perú · Canal oficial: +51 967 581 481
    </div>
  </div>
</body>
</html>
`;

    // 4. Despacho de Correo Electrónico
    // Si se configuran credenciales en el entorno (Resend, SendGrid o SMTP), se envía de inmediato.
    let emailStatus = "simulated_success";
    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.LEGAL_ADMIN_EMAIL || "contacto@bassfit.pe";

    if (resendApiKey) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Bassfit Reclamaciones <no-reply@bassfit.pe>",
            to: [data.email],
            bcc: [adminEmail],
            subject: emailSubject,
            html: emailHtmlBody,
          }),
        });
        if (resendResponse.ok) {
          emailStatus = "sent_live";
        } else {
          emailStatus = "gateway_error";
        }
      } catch (sendErr) {
        emailStatus = "send_failed";
      }
    } else {
      // Entorno sin proveedor externo activo: se genera la constancia legal y se guarda en el libro
      emailStatus = "recorded_and_ready";
    }

    return NextResponse.json({
      success: true,
      codigo: codigoFinal,
      fechaLegal,
      emailStatus,
      statutoryDeadlineDays: 15,
      recipient: data.email,
      message: "Hoja de reclamación registrada formalmente conforme al D.S. N° 011-2011-PCM.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error procesando el registro del reclamo.", details: error?.message },
      { status: 500 }
    );
  }
}

