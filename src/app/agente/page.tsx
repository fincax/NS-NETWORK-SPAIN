import { PendingScreen } from "@/components/hoy/PendingScreen";

export const metadata = { title: "Mi agente" };

export default function AgentePage() {
  return (
    <PendingScreen
      tab="agente"
      title="Mi agente"
      body="Estado, Business DNA y permisos del agente (READ · INFER · STORE · SHARE · REVEAL IDENTITY · CONTACT · WRITE · EXECUTE) se diseñan en la siguiente iteración."
    />
  );
}
