import { PendingScreen } from "@/components/hoy/PendingScreen";

export const metadata = { title: "Referidos" };

export default function ReferidosPage() {
  return (
    <PendingScreen
      tab="referidos"
      title="Referidos"
      body="La bandeja de referidos y la referral card completa se diseñan en la siguiente iteración. Hoy ya te muestra el referido pendiente."
    />
  );
}
