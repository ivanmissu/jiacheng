import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { DualDate, EntryStatus } from "@/lib/types";

export const persons = sqliteTable("family_persons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  gender: text("gender").$type<"male" | "female">().notNull().default("male"),
  generation: integer("generation").notNull().default(1),
  fatherId: text("father_id"),
  motherId: text("mother_id"),
  courtesyName: text("courtesy_name").notNull().default(""),
  artName: text("art_name").notNull().default(""),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().notNull().$defaultFn(() => []),
  birth: text("birth", { mode: "json" }).$type<DualDate>(),
  death: text("death", { mode: "json" }).$type<DualDate>(),
  isAlive: integer("is_alive", { mode: "boolean" }).notNull().default(false),
  spouse: text("spouse").notNull().default(""),
  nativePlace: text("native_place").notNull().default(""),
  residence: text("residence").notNull().default(""),
  biography: text("biography").notNull().default(""),
  status: text("status").$type<EntryStatus>().notNull().default("recorded"),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  sourcePageId: text("source_page_id"),
  original: text("original").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  deletedAt: text("deleted_at"),
});

export const sourcePages = sqliteTable("family_source_pages", {
  id: text("id").primaryKey(),
  volume: integer("volume").notNull(),
  pageNo: integer("page_no").notNull(),
  title: text("title").notNull(),
  image: text("image").notNull(),
  status: text("status").$type<EntryStatus>().notNull().default("unrecorded"),
  transcription: text("transcription").notNull().default(""),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const revisions = sqliteTable("family_revisions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  personId: text("person_id"),
  name: text("name").notNull(),
  action: text("action").notNull(),
  detail: text("detail", { mode: "json" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const sessions = sqliteTable("family_sessions", {
  id: text("id").primaryKey(),
  role: text("role").$type<"visitor" | "admin">().notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const backupEvents = sqliteTable("family_backup_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
