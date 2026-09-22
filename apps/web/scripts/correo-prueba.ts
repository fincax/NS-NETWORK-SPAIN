/** pnpm correo:prueba destino@correo · envía un correo de prueba con la configuración SMTP actual (D-060). */
import { mailEnabled, mailFrom, sendMail } from "@/lib/mail";

const to = process.argv[2];
if (!to || !to.includes("@")) {
  console.error("Uso: pnpm correo:prueba destino@correo");
  process.exit(2);
}
if (!mailEnabled()) {
  console.error("El correo no está configurado: faltan NS_SMTP_HOST, NS_SMTP_USER o NS_SMTP_PASSWORD.");
  process.exit(1);
}
const r = await sendMail({
  to,
  subject: "Prueba de correo · NS Network",
  text: `Si lees esto, NS Network ya envía correos desde ${mailFrom()}.\n\nNS Network`,
  html: `<p>Si lees esto, NS Network ya envía correos desde <strong>${mailFrom().replace(/</g, "&lt;")}</strong>.</p><p>NS Network</p>`,
});
if (r.ok) {
  console.log(`Enviado a ${to} desde ${mailFrom()}. Mira la bandeja de entrada (y la de correo no deseado).`);
} else {
  console.error(`No se pudo enviar: ${r.error}`);
  process.exit(1);
}
