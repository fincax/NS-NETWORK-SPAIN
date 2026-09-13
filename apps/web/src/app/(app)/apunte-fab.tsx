"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Acceso permanente al Apunte (D-037): un toque desde cualquier pantalla. Se oculta en el propio Apunte. */
export function ApunteFab() {
  const path = usePathname();
  if (path.startsWith("/apunte")) return null;
  return (
    <Link href="/apunte" className="fab" aria-label="Apuntar un posible referido">
      <span aria-hidden="true">+</span> Apuntar
    </Link>
  );
}
