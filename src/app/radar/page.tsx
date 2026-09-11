import { PendingScreen } from "@/components/hoy/PendingScreen";

export const metadata = { title: "Radar" };

export default function RadarPage() {
  return (
    <PendingScreen
      tab="radar"
      title="Radar"
      body="NS Radar se diseña a partir de la geometría del círculo. Cada elemento visual corresponderá a un dato real."
    />
  );
}
