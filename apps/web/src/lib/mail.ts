/**
 * Envío de correo (D-060) por SMTP desde el buzón de NS (hola@networkspain.com).
 *
 * - Se activa con NS_SMTP_HOST, NS_SMTP_USER y NS_SMTP_PASSWORD (y NS_SMTP_PORT, 465 por defecto). Remitente: NS_MAIL_FROM,
 *   o "NS Network <usuario SMTP>". Sin configuración no se envía nada y la aplicación sigue como antes: el enlace de acceso
 *   se muestra a quien lo genera (D-054).
 * - NS_MAIL_TRANSPORT=memory (pruebas) guarda los mensajes en `outbox` en lugar de enviarlos.
 * - Nunca lanza: devuelve ok o el motivo del fallo, para que quien llama decida (mostrar el enlace, registrar el fallo).
 */
import { createTransport } from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type MailResult = { ok: true } | { ok: false; error: string };

/** Mensajes "enviados" con NS_MAIL_TRANSPORT=memory. */
export const outbox: MailMessage[] = [];

const memory = () => process.env.NS_MAIL_TRANSPORT === "memory";

export function mailEnabled(): boolean {
  return memory() || Boolean(process.env.NS_SMTP_HOST && process.env.NS_SMTP_USER && process.env.NS_SMTP_PASSWORD);
}

export function mailFrom(): string {
  return process.env.NS_MAIL_FROM || `NS Network <${process.env.NS_SMTP_USER ?? "hola@networkspain.com"}>`;
}

export async function sendMail(msg: MailMessage): Promise<MailResult> {
  if (memory()) {
    outbox.push(msg);
    return { ok: true };
  }
  if (!mailEnabled()) return { ok: false, error: "El envío de correo no está configurado." };
  const port = Number(process.env.NS_SMTP_PORT || 465);
  const transport = createTransport({
    host: process.env.NS_SMTP_HOST,
    port,
    secure: port === 465, // 465: TLS directo; 587: STARTTLS
    requireTLS: port !== 465,
    auth: { user: process.env.NS_SMTP_USER, pass: process.env.NS_SMTP_PASSWORD },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  try {
    await transport.sendMail({ from: mailFrom(), to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Error desconocido al enviar." };
  } finally {
    transport.close();
  }
}
