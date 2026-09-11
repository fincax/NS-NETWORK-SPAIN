import type { Metadata } from "next";
import { HoyScreen } from "@/components/hoy/HoyScreen";
import { getTodayView, parseScenario } from "@/lib/today";

export const metadata: Metadata = { title: "Hoy" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HoyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const now = new Date();
  const view = await getTodayView(parseScenario(params.demo), now);
  return <HoyScreen view={view} now={now} />;
}
