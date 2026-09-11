import { notFound } from "next/navigation";
import { PendingScreen } from "@/components/hoy/PendingScreen";
import { REFERRAL_DOS_HERMANAS } from "@/demo/ns-sevilla";

export const metadata = { title: "Referido" };

export default async function ReferralDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== REFERRAL_DOS_HERMANAS.id) notFound();
  return (
    <PendingScreen
      tab="referidos"
      title={REFERRAL_DOS_HERMANAS.title}
      body="La referral card completa (aprobar introducción · solicitar más información · descartar) se diseña en la siguiente iteración. Nada se ha compartido todavía."
    />
  );
}
