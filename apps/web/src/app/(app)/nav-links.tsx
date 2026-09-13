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

export function NavLinks({ director = false, newCandidacies = 0 }: { director?: boolean; newCandidacies?: number }) {
  const path = usePathname();
  const links = director ? [...LINKS, { href: "/antesala", label: "Antesala" }] : LINKS;
  return (
    <nav className="nav" aria-label="Principal">
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path === l.href || (l.href !== "/hoy" && path.startsWith(l.href)) ? "page" : undefined}>
          {l.label}
          {l.href === "/antesala" && newCandidacies > 0 ? <span className="count" aria-label={`${newCandidacies} candidaturas nuevas`}>{newCandidacies}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
