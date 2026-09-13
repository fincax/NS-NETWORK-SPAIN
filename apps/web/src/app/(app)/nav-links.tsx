"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/hoy", label: "Hoy" },
  { href: "/mesa", label: "Mesa Permanente" },
  { href: "/cesiones", label: "Cesiones" },
  { href: "/indicio/nuevo", label: "Ceder un Indicio" },
  { href: "/sala", label: "Mi Sala" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Principal">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path === l.href || (l.href !== "/hoy" && path.startsWith(l.href)) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
