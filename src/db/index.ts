import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "node:path";
import fs from "node:fs";

const globalForDb = globalThis as typeof globalThis & {
  __arenaBetterSqlite?: Database.Database;
};

function initSqlite(): Database.Database {
  const dbDir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = process.env.SQLITE_PATH || path.join(dbDir, "jiacheng.db");
  const sqlite = globalForDb.__arenaBetterSqlite ?? new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS family_persons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'male',
      generation INTEGER NOT NULL DEFAULT 1,
      father_id TEXT,
      mother_id TEXT,
      courtesy_name TEXT NOT NULL DEFAULT '',
      art_name TEXT NOT NULL DEFAULT '',
      aliases TEXT NOT NULL DEFAULT '[]',
      birth TEXT,
      death TEXT,
      is_alive INTEGER NOT NULL DEFAULT 0,
      spouse TEXT NOT NULL DEFAULT '',
      native_place TEXT NOT NULL DEFAULT '',
      residence TEXT NOT NULL DEFAULT '',
      biography TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'recorded',
      hidden INTEGER NOT NULL DEFAULT 0,
      source_page_id TEXT,
      original TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS family_source_pages (
      id TEXT PRIMARY KEY,
      volume INTEGER NOT NULL,
      page_no INTEGER NOT NULL,
      title TEXT NOT NULL,
      image TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unrecorded',
      transcription TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_revisions (
      id TEXT PRIMARY KEY,
      person_id TEXT,
      name TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_sessions (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_backup_events (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaBetterSqlite = sqlite;
  }
  return sqlite;
}

export const sqlite = initSqlite();
export const db = drizzle(sqlite, { schema });
