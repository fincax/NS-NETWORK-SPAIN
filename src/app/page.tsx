import { redirect } from "next/navigation";

/** La home autenticada es Hoy. Sin autenticación en Fase 0: entra directamente. */
export default function RootPage() {
  redirect("/hoy");
}
