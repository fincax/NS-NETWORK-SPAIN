/**
 * Estado de las copias de seguridad del servidor (D-056). Lo escribe deploy/copias.sh en un fichero JSON tras cada
 * copia; la aplicación solo lo lee y lo explica a la Directiva en Hoy. Nunca lo ve un Timonel sin Directiva.
 */
import fs from "node:fs/promises";

export interface EstadoCopias {
  ranAt: string;
  ok: boolean;
  file?: string;
  sizeBytes?: number;
  restoreTested?: boolean;
  restoreOk?: boolean;
  tables?: number;
  companies?: number;
  betaRequests?: number;
  referrals?: number;
  offsite?: "ok" | "unconfigured" | "failed";
  kept?: number;
  durationSec?: number;
  error?: string | null;
}

export type TonoCopias = "green" | "amber" | "red";

export interface ValoracionCopias {
  tone: TonoCopias;
  headline: string;
  detail: string;
}

export const RUTA_ESTADO_COPIAS = process.env.NS_BACKUP_STATUS_FILE ?? "/var/lib/ns-network/copias.json";

/** Más de 30 horas sin copia buena (la nocturna es a las 03:30) ya es un problema. */
export const HORAS_MAX_SIN_COPIA = 30;

export async function leerEstadoCopias(ruta = RUTA_ESTADO_COPIAS): Promise<EstadoCopias | null> {
  try {
    const raw = await fs.readFile(ruta, "utf8");
    const parsed = JSON.parse(raw) as Partial<EstadoCopias>;
    if (typeof parsed.ranAt !== "string" || typeof parsed.ok !== "boolean") return null;
    return parsed as EstadoCopias;
  } catch {
    return null;
  }
}

function horaLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
}

function haceCuanto(iso: string, now: Date): string {
  const h = Math.floor((now.getTime() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "hace menos de una hora";
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

/** Traduce el estado a un semáforo explicado. Rojo: no hay copia fiable. Ámbar: la hay, pero falta algo. */
export function valorarCopias(estado: EstadoCopias | null, now = new Date()): ValoracionCopias {
  if (!estado) {
    return { tone: "amber", headline: "Sin copias de seguridad.", detail: "No hay ninguna copia registrada. En el servidor: bash /opt/ns-network/deploy/copias.sh instalar." };
  }
  const edadHoras = (now.getTime() - new Date(estado.ranAt).getTime()) / 3_600_000;
  if (!estado.ok) {
    return { tone: "red", headline: `La última copia falló (${haceCuanto(estado.ranAt, now)}).`, detail: estado.error ? `Motivo: ${estado.error}. Registro en /var/log/ns-copias.log.` : "Registro en /var/log/ns-copias.log." };
  }
  if (estado.restoreTested && estado.restoreOk === false) {
    return { tone: "red", headline: "La última copia no se pudo restaurar.", detail: "Se hizo la copia pero la prueba de restauración falló. Hasta que no se restaure, no cuenta como copia." };
  }
  if (edadHoras > HORAS_MAX_SIN_COPIA) {
    return { tone: "red", headline: `La última copia buena es de ${haceCuanto(estado.ranAt, now)}.`, detail: "La copia nocturna no se ha ejecutado. Comprueba el cron y /var/log/ns-copias.log." };
  }
  const base = `Copia de las ${horaLocal(estado.ranAt)}${estado.restoreOk ? ", restauración probada" : ""}${estado.tables ? ` (${estado.tables} tablas, ${estado.companies ?? 0} empresas)` : ""}. ${estado.kept ?? 0} copias conservadas.`;
  if (estado.offsite === "unconfigured") {
    return { tone: "amber", headline: "Copia hecha, pero no sale del servidor.", detail: `${base} Si el servidor se pierde, se pierden con él: configura el remoto ns-copias (docs/17 §4c).` };
  }
  if (estado.offsite === "failed") {
    return { tone: "amber", headline: "Copia hecha; el envío fuera del servidor falló.", detail: `${base} Revisa el remoto ns-copias en /var/log/ns-copias.log.` };
  }
  return { tone: "green", headline: "Copias de seguridad al día.", detail: `${base} Guardada también fuera del servidor.` };
}

/** La tarjeta solo tiene sentido donde hay servidor: en producción siempre; en local, solo si se indica un fichero. */
export function mostrarEstadoCopias(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.NS_BACKUP_STATUS_FILE);
}
