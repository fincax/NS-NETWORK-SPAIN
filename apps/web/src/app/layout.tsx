import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NS Network Spain",
  description: "Tu empresa no hace networking. Su agente sí, 24/7. Beta privada en NS Sevilla.",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NS", statusBarStyle: "black-translucent" },
  metadataBase: new URL(process.env.NS_PUBLIC_URL ?? "https://networkspain.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router: el layout raíz carga las fuentes para toda la app */}
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
