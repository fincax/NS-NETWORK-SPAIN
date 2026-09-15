import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { leerEstadoCopias, valorarCopias, type EstadoCopias } from "@/services/copias";

const now = new Date("2026-09-16T08:00:00Z");
const buena: EstadoCopias = { ranAt: "2026-09-16T01:30:00Z", ok: true, restoreTested: true, restoreOk: true, tables: 37, companies: 10, offsite: "ok", kept: 12 };

describe("Estado de las copias de seguridad (D-056)", () => {
  it("sin fichero: ámbar y cómo instalarlas", async () => {
    expect(await leerEstadoCopias(path.join(os.tmpdir(), "no-existe-ns.json"))).toBeNull();
    const v = valorarCopias(null, now);
    expect(v.tone).toBe("amber");
    expect(v.detail).toMatch(/copias\.sh instalar/);
  });

  it("copia reciente, probada y fuera del servidor: verde", () => {
    const v = valorarCopias(buena, now);
    expect(v.tone).toBe("green");
    expect(v.detail).toMatch(/restauración probada/);
    expect(v.detail).toMatch(/12 copias/);
  });

  it("copia buena pero sin remoto: ámbar y lo dice", () => {
    const v = valorarCopias({ ...buena, offsite: "unconfigured" }, now);
    expect(v.tone).toBe("amber");
    expect(v.headline).toMatch(/no sale del servidor/);
  });

  it("la copia falló: rojo con el motivo", () => {
    const v = valorarCopias({ ranAt: "2026-09-16T01:30:00Z", ok: false, error: "pg_dump o el cifrado fallaron" }, now);
    expect(v.tone).toBe("red");
    expect(v.detail).toMatch(/pg_dump/);
  });

  it("no se pudo restaurar: rojo aunque la copia exista", () => {
    expect(valorarCopias({ ...buena, restoreOk: false }, now).tone).toBe("red");
  });

  it("copia buena pero vieja: rojo", () => {
    const v = valorarCopias({ ...buena, ranAt: "2026-09-14T01:30:00Z" }, now);
    expect(v.tone).toBe("red");
    expect(v.headline).toMatch(/hace 2 días/);
  });

  it("lee el fichero que escribe copias.sh y rechaza uno corrupto", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ns-copias-"));
    const f = path.join(dir, "copias.json");
    await fs.writeFile(f, JSON.stringify(buena));
    expect((await leerEstadoCopias(f))?.tables).toBe(37);
    await fs.writeFile(f, "{ esto no es json");
    expect(await leerEstadoCopias(f)).toBeNull();
    await fs.writeFile(f, JSON.stringify({ hola: 1 }));
    expect(await leerEstadoCopias(f)).toBeNull();
  });
});
