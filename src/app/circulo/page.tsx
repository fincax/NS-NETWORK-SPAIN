import { PendingScreen } from "@/components/hoy/PendingScreen";

export const metadata = { title: "Mi círculo" };

export default function CirculoPage() {
  return (
    <PendingScreen
      tab="circulo"
      title="Mi círculo"
      body="El mapa de 30 plazas de NS Sevilla · Círculo 01 se diseña a partir del grid de plazas del tablero (referencia 1c)."
    />
  );
}
