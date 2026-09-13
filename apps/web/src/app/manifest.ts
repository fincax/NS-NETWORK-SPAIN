import type { MetadataRoute } from "next";

/** Web app manifest: permite "Añadir a pantalla de inicio" en el móvil y abrir el Apunte con un toque (D-037). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NS Network",
    short_name: "NS",
    description: "Tu empresa no hace networking. Su agente sí. 24/7.",
    lang: "es",
    start_url: "/hoy",
    display: "standalone",
    background_color: "#0f1113",
    theme_color: "#0f1113",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [
      { name: "Apuntar un referido", short_name: "Apuntar", url: "/apunte", description: "Anota un posible referido en 30 segundos" },
      { name: "Hoy", short_name: "Hoy", url: "/hoy" },
    ],
  };
}
