import { pgTable, text, integer, boolean, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import type { DualDate, EntryStatus } from "@/lib/types";

export const persons = pgTable("family_persons", {
  id: text("id").primaryKey(), name: text("name").notNull(),
  gender: text("gender").$type<"male" | "female">().notNull().default("male"),
  generation: integer("generation").notNull().default(1),
  fatherId: text("father_id"), motherId: text("mother_id"),
  courtesyName: text("courtesy_name").notNull().default(""), artName: text("art_name").notNull().default(""),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  birth: jsonb("birth").$type<DualDate>(), death: jsonb("death").$type<DualDate>(),
  isAlive: boolean("is_alive").notNull().default(false), spouse: text("spouse").notNull().default(""),
  nativePlace: text("native_place").notNull().default("安徽 · 歙县"), residence: text("residence").notNull().default(""),
  biography: text("biography").notNull().default(""), status: text("status").$type<EntryStatus>().notNull().default("recorded"),
  hidden: boolean("hidden").notNull().default(false), sourcePageId: text("source_page_id"),
  original: text("original").notNull().default(""), note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
});
export const sourcePages = pgTable("family_source_pages", {
  id: text("id").primaryKey(), volume: integer("volume").notNull(), pageNo: integer("page_no").notNull(),
  title: text("title").notNull(), image: text("image").notNull(),
  status: text("status").$type<EntryStatus>().notNull().default("unrecorded"),
  transcription: text("transcription").notNull().default(""),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});
export const revisions = pgTable("family_revisions", {
  id: uuid("id").defaultRandom().primaryKey(), personId: text("person_id"), name: text("name").notNull(),
  action: text("action").notNull(), detail: jsonb("detail"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});
export const sessions = pgTable("family_sessions", {
  id: text("id").primaryKey(), role: text("role").$type<"visitor" | "admin">().notNull(),
  expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
});
export const backupEvents = pgTable("family_backup_events", {
  id: uuid("id").defaultRandom().primaryKey(), kind: text("kind").notNull(), status: text("status").notNull(),
  detail: text("detail").notNull().default(""), createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});
