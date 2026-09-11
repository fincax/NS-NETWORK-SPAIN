import { PendingScreen } from "@/components/hoy/PendingScreen";

export const metadata = { title: "Nueva señal" };

export default function NuevaSenalPage() {
  return (
    <PendingScreen
      tab="hoy"
      title="He sabido que…"
      body="La captura de señal en 30 segundos, por voz o texto, con previsualización de lo que verán los demás, se diseña en la siguiente iteración."
    />
  );
}
