import Link from "next/link";

export default function NotFound() {
  return (
    <div className="stack">
      <p className="eyebrow">No encontrado</p>
      <h1>Esta página no existe o no pertenece a tu Sala.</h1>
      <Link className="btn" href="/hoy">Volver a Hoy</Link>
    </div>
  );
}
