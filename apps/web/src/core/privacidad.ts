/**
 * Aviso de privacidad de NS Network Spain (D-055). Texto único, versionado, que se muestra en /privacidad y cuya
 * aceptación expresa queda registrada en cada candidatura (versión y fecha). Cambiar el texto obliga a subir la versión.
 *
 * Alcance de esta versión: los datos que recoge la web pública (candidatura a la beta) y la demo privada.
 * Los datos de terceros que manejarán los Agentes con empresas reales se regulan en docs/08 y exigen revisión jurídica
 * antes de producción (docs/17, condición 4).
 */
export const PRIVACIDAD_VERSION = "2026-09-15.3";

/** Quién responde de los datos: la sociedad propietaria de NS Network Spain. */
export const RESPONSABLE = {
  nombre: "NS Network Spain",
  razonSocial: "Be Trendy, S.L.",
  nif: "B90130725",
  domicilio: "calle Valparaíso, 18, 41013 Sevilla",
  telefono: "627 542 045",
  /** Buzón de privacidad. Se fija con NS_CONTACT_EMAIL en el servidor; el valor por defecto debe existir como buzón real. */
  contacto: process.env.NS_CONTACT_EMAIL ?? "hola@networkspain.com",
} as const;

export interface SeccionPrivacidad {
  title: string;
  paragraphs: readonly string[];
}

export const PRIVACIDAD_SECCIONES: readonly SeccionPrivacidad[] = [
  {
    title: "Quién trata tus datos",
    paragraphs: [
      `${RESPONSABLE.razonSocial}, con NIF ${RESPONSABLE.nif} y domicilio en ${RESPONSABLE.domicilio}, propietaria y promotora de ${RESPONSABLE.nombre}. Contacto para todo lo relativo a tus datos: ${RESPONSABLE.contacto} o el teléfono ${RESPONSABLE.telefono}.`,
      "Este aviso cubre la web pública networkspain.com y la demostración privada que se enseña desde ella. Cuando NS abra Salas con empresas reales, publicará las condiciones de la plaza y el tratamiento de los datos que manejan los Agentes, y pedirá de nuevo tu conformidad.",
    ],
  },
  {
    title: "Qué datos recogemos y para qué",
    paragraphs: [
      "En la candidatura a la beta: tu nombre, tu empresa, tu correo, tu ciudad, la especialidad que indicas y, si lo escribes, una frase sobre a quién sirve tu empresa. Los usamos únicamente para estudiar tu candidatura, comprobar si hay plaza para tu especialidad y escribirte para contarte el siguiente paso.",
      "No usamos estos datos para publicidad, no los cedemos a otras empresas ni los vendemos. No elaboramos perfiles con ellos.",
    ],
  },
  {
    title: "Con qué base",
    paragraphs: [
      "Tu consentimiento, que nos das al marcar la casilla del formulario. Puedes retirarlo en cualquier momento escribiendo al contacto indicado; retirarlo no afecta a lo tratado antes.",
      "Si tu candidatura prospera, el tratamiento pasará a ampararse en la relación contractual de la plaza, con sus propias condiciones.",
    ],
  },
  {
    title: "Cuánto tiempo los guardamos",
    paragraphs: [
      "Mientras tu candidatura esté en estudio y, si no prospera, hasta doce meses después de la decisión, por si se abre una plaza o una Sala nueva para tu especialidad. Después se borran. Si nos pides borrarlos antes, lo hacemos.",
    ],
  },
  {
    title: "Quién puede verlos y dónde están",
    paragraphs: [
      "Solo la dirección de NS y la Directiva de la Sala a la que te presentas, para despacharla en la Antesala. Nadie más de la red ve tu candidatura.",
      "Los datos se guardan en un servidor contratado por NS en la Unión Europea, con acceso restringido y cifrado en tránsito. Cada acceso a la aplicación queda registrado.",
    ],
  },
  {
    title: "Tus derechos",
    paragraphs: [
      `Puedes pedirnos acceso a tus datos, corregirlos, borrarlos, limitar u oponerte a su tratamiento y llevártelos. Escríbenos a ${RESPONSABLE.contacto} indicando qué quieres y desde qué correo presentaste la candidatura; te respondemos en un mes como máximo.`,
      "Si crees que no hemos atendido bien tu petición, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).",
    ],
  },
  {
    title: "La demostración privada",
    paragraphs: [
      "Todo lo que se ve dentro de la demostración (empresas, personas, Indicios y Cesiones) es ficticio. No introduzcas en ella datos reales de clientes ni de terceros: la demostración no está pensada para tratarlos y NS no responde de datos reales introducidos en ella.",
    ],
  },
  {
    title: "Cookies",
    paragraphs: [
      "Esta web solo usa una cookie técnica de sesión para mantenerte dentro de la demostración o de tu cuenta una vez has entrado. No hay cookies de análisis ni de publicidad, ni de terceros.",
    ],
  },
] as const;

/** Texto de la casilla de consentimiento de la candidatura. Se guarda la versión con la que se aceptó. */
export const CONSENTIMIENTO_CANDIDATURA = `He leído el aviso de privacidad y acepto que ${RESPONSABLE.razonSocial} (${RESPONSABLE.nombre}) trate mis datos solo para gestionar mi candidatura.`;
