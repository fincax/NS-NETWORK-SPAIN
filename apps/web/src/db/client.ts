/**
 * Cliente de base de datos dual:
 *  - DATABASE_URL definido → PostgreSQL (node-postgres).
 *  - sin DATABASE_URL → PGlite (Postgres embebido) en .data/ns.pglite, ideal para demo y tests.
 * En ambos casos el esquema es Postgres real (drizzle pg-core) y las migraciones son las mismas.
 */
import fs from "node:fs";
import path from "node:path";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

type Holder = { db?: Db; ready?: Promise<Db>; close?: () => Promise<void> };
const g = globalThis as unknown as { __nsDb?: Holder };
const holder: Holder = (g.__nsDb ??= {});

async function open(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzlePg(pool, { schema });
    await migratePg(db, { migrationsFolder: MIGRATIONS });
    holder.close = () => pool.end();
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = process.env.PGLITE_DATA_DIR === "memory" ? undefined : (process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "ns.pglite"));
  if (dataDir) fs.mkdirSync(dataDir, { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  holder.close = () => client.close();
  return db;
}

export function getDb(): Promise<Db> {
  if (holder.db) return Promise.resolve(holder.db);
  if (!holder.ready) {
    holder.ready = open().then((db) => {
      holder.db = db;
      return db;
    });
  }
  return holder.ready;
}

export async function closeDb(): Promise<void> {
  if (holder.close) await holder.close();
  holder.db = undefined;
  holder.ready = undefined;
  holder.close = undefined;
}

export { schema };
