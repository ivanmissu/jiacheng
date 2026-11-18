import { db } from "@/db";
import { persons, sourcePages, revisions, backupEvents } from "@/db/schema";
import { asc, desc, eq, or } from "drizzle-orm";
import { visiblePeople, type ArchiveData, type DualDate, type EntryStatus, type Person, type SourcePage } from "./types";

let ready = false;
export async function ensureSeeded() {
  if (ready) return;
  // Database tables are auto-created in db/index.ts.
  // Data starts empty for Li Family Tree production use.
  ready = true;
}

export async function getArchive(role: "admin" | "visitor"): Promise<ArchiveData> {
  await ensureSeeded();
  const [allPersons, pages, history] = await Promise.all([
    db.select().from(persons).orderBy(asc(persons.generation), asc(persons.id)),
    db.select().from(sourcePages).orderBy(asc(sourcePages.volume), asc(sourcePages.pageNo)),
    db.select().from(revisions).orderBy(desc(revisions.createdAt)).limit(30),
  ]);
  const people = role === "admin" ? allPersons : visiblePeople(allPersons);
  const visible = new Set(people.map(p => p.id));
  const allowedPages = role === "admin" ? pages : pages.map(page => ({ ...page, transcription: "" }));
  return {
    persons: people,
    pages: allowedPages,
    revisions: history
      .filter(r => role === "admin" || !r.personId || visible.has(r.personId))
      .map(r => ({ ...r, detail: role === "admin" ? r.detail : null })),
    role,
    demo: !process.env.ADMIN_PASSWORD,
    title: "李氏家谱",
  };
}

const text = (value: unknown, max = 10000) => typeof value === "string" ? value.trim().slice(0, max) : "";

function dualDate(value: unknown): DualDate | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") throw new Error("日期格式不正确");
  const item = value as Record<string, unknown>;
  const certainty = ["exact", "approximate", "year", "unknown"].includes(String(item.certainty)) ? item.certainty as DualDate["certainty"] : "unknown";
  const solar = text(item.solar, 10);
  if (solar && (!/^\d{4}(-\d{2}-\d{2})?$/.test(solar) || Number(solar.slice(0, 4)) < 1)) throw new Error("公历日期格式应为 YYYY 或 YYYY-MM-DD");
  if (solar.length === 10) {
    const [year, month, day] = solar.split("-").map(Number);
    const parsed = new Date(`${solar}T12:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) throw new Error("这个公历日期不存在，请核对月份与日期");
  }
  return { original: text(item.original, 300), solar, certainty, ...(item.lunar && typeof item.lunar === "object" ? { lunar: item.lunar as DualDate["lunar"] } : {}) };
}

export function normalizePerson(input: Record<string, unknown>, id: string): Omit<Person, "createdAt" | "updatedAt" | "deletedAt"> {
  const name = text(input.name, 80);
  if (!name) throw new Error("请填写谱名，或填写「讳无考」");
  const generation = Number(input.generation);
  if (!Number.isInteger(generation) || generation < 1 || generation > 100000) throw new Error("世代必须为正整数");
  const status = ["unrecorded", "recorded", "verified"].includes(String(input.status)) ? input.status as EntryStatus : "recorded";
  const sourcePageId = text(input.sourcePageId, 100) || null;
  if (status === "verified" && !sourcePageId) throw new Error("已校对条目必须关联老谱出处");
  return {
    id, name, generation, gender: input.gender === "female" ? "female" : "male",
    fatherId: text(input.fatherId, 100) || null, motherId: text(input.motherId, 100) || null,
    courtesyName: text(input.courtesyName, 100), artName: text(input.artName, 100),
    aliases: Array.isArray(input.aliases) ? input.aliases.filter((a): a is string => typeof a === "string").map(a => a.slice(0, 100)) : [],
    birth: dualDate(input.birth), death: input.isAlive ? null : dualDate(input.death), isAlive: input.isAlive === true,
    spouse: text(input.spouse, 1000), nativePlace: text(input.nativePlace, 300), residence: text(input.residence, 300),
    biography: text(input.biography, 50000), status, hidden: input.hidden === true, sourcePageId,
    original: text(input.original, 10000), note: text(input.note, 10000),
  };
}

function validateFamily(person: Pick<Person, "id" | "fatherId" | "motherId" | "sourcePageId">, all: Person[], pages: SourcePage[], allowDeleted = false) {
  if (person.sourcePageId && !pages.some(p => p.id === person.sourcePageId && p.image)) throw new Error("关联的谱页不存在或缺少原图");
  const map = new Map(all.map(p => [p.id, p]));
  const queue = [person.fatherId, person.motherId].filter((p): p is string => !!p);
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.pop()!;
    if (id === person.id) throw new Error("关系形成循环：不能将自己挂在自己或后代之下");
    if (visited.has(id)) continue;
    visited.add(id);
    const relative = map.get(id);
    if (!relative || (!allowDeleted && relative.deletedAt)) throw new Error("选择的父母不存在或已移入回收站");
    if (relative.fatherId) queue.push(relative.fatherId);
    if (relative.motherId) queue.push(relative.motherId);
  }
}

export async function savePerson(input: Record<string, unknown>) {
  const id = text(input.id, 100) || crypto.randomUUID();
  const archive = await getArchive("admin");
  const previous = archive.persons.find(p => p.id === id);
  const clean = normalizePerson({ ...previous, ...input }, id);
  validateFamily(clean, archive.persons, archive.pages);
  db.transaction(tx => {
    if (previous) tx.update(persons).set({ ...clean, updatedAt: new Date().toISOString() }).where(eq(persons.id, id)).run();
    else tx.insert(persons).values(clean).run();
    tx.insert(revisions).values({
      id: crypto.randomUUID(),
      personId: id,
      name: clean.name,
      action: previous ? (clean.status === "verified" && previous.status !== "verified" ? "完成校对" : "更新人物资料") : "新增族人",
      detail: previous || { message: "新增人物条目" },
      createdAt: new Date().toISOString(),
    }).run();
  });
  return id;
}

export async function updatePage(input: Record<string, unknown>) {
  const id = text(input.id, 100);
  const [page] = await db.select().from(sourcePages).where(eq(sourcePages.id, id));
  if (!page) throw new Error("谱页不存在");
  const status = ["unrecorded", "recorded", "verified"].includes(String(input.status)) ? input.status as EntryStatus : page.status;
  const transcription = typeof input.transcription === "string" ? input.transcription.slice(0, 100000) : page.transcription;
  if (status === "verified" && !transcription.trim()) throw new Error("请先录入谱页原文，再标记为已校对");
  await db.update(sourcePages).set({ status, transcription, updatedAt: new Date().toISOString() }).where(eq(sourcePages.id, id));
  await db.insert(revisions).values({ id: crypto.randomUUID(), name: `卷${page.volume} · 第${page.pageNo}页`, action: status === "verified" ? "谱页完成校对" : "更新谱页", detail: { previous: page }, createdAt: new Date().toISOString() });
}

export async function exportArchive() {
  const archive = await getArchive("admin");
  await db.insert(backupEvents).values({ id: crypto.randomUUID(), kind: "manual", status: "success", detail: `导出 ${archive.persons.length} 位族人与 ${archive.pages.length} 张谱页`, createdAt: new Date().toISOString() });
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), title: archive.title, persons: archive.persons, pages: archive.pages, mediaManifest: [{ path: "/images/genealogy-page.png", note: "李氏家乘备份影像包" }] };
}

export async function restoreArchive(data: Record<string, unknown>) {
  if (data.schemaVersion !== 1 || !Array.isArray(data.persons) || !Array.isArray(data.pages)) throw new Error("不是有效的家乘 v1 备份文件");
  const now = new Date().toISOString();
  const timestamp = (value: unknown): string | null => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("备份包含无效的时间戳");
    return new Date(value).toISOString();
  };
  const restored = data.persons.map((p: Record<string, unknown>) => {
    if (!p || typeof p !== "object" || !text(p.id, 100)) throw new Error("备份中的人物缺少有效 ID");
    return { ...normalizePerson(p, text(p.id, 100)), createdAt: timestamp(p.createdAt) || now, updatedAt: timestamp(p.updatedAt) || now, deletedAt: timestamp(p.deletedAt) };
  });
  if (new Set(restored.map(p => p.id)).size !== restored.length) throw new Error("备份包含重复的人物 ID");
  const pages: SourcePage[] = data.pages.map((item: Record<string, unknown>) => {
    if (!item || !item.id || !Number.isInteger(item.volume) || !Number.isInteger(item.pageNo)) throw new Error("备份谱页格式不正确");
    const image = typeof item.image === "string" ? item.image : "";
    const inline = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) && image.length <= 7 * 1024 * 1024;
    if (!image || (!inline && !image.startsWith("/images/") && !image.startsWith("https://"))) throw new Error("谱页图片地址不安全或缺少有效影像");
    return { id: text(item.id, 100), title: text(item.title, 100), volume: Number(item.volume), pageNo: Number(item.pageNo), image,
      status: ["unrecorded", "recorded", "verified"].includes(String(item.status)) ? item.status as EntryStatus : "unrecorded",
      transcription: text(item.transcription, 100000), updatedAt: timestamp(item.updatedAt) || now };
  });
  for (const p of restored) validateFamily(p, restored, pages, !!p.deletedAt);
  db.transaction(tx => {
    tx.delete(revisions).run();
    tx.delete(persons).run();
    tx.delete(sourcePages).run();
    if (pages.length) {
      for (const page of pages) tx.insert(sourcePages).values(page).run();
    }
    for (const p of restored) {
      tx.insert(persons).values(p).run();
    }
    tx.insert(revisions).values({ id: crypto.randomUUID(), name: "全量恢复", action: "从 JSON 备份恢复", detail: { persons: restored.length, pages: pages.length }, createdAt: new Date().toISOString() }).run();
    tx.insert(backupEvents).values({ id: crypto.randomUUID(), kind: "restore", status: "success", detail: `恢复 ${restored.length} 位族人`, createdAt: new Date().toISOString() }).run();
  });
}

export async function recyclePerson(id: string, restore: boolean) {
  const [person] = await db.select().from(persons).where(eq(persons.id, id));
  if (!person) throw new Error("人物不存在");
  const children = await db.select().from(persons).where(or(eq(persons.fatherId, id), eq(persons.motherId, id)));
  if (!restore && children.some(c => !c.deletedAt)) throw new Error("此人仍有关联子女，请先调整亲属关系；也可选择整支隐藏");
  if (restore) { const archive = await getArchive("admin"); validateFamily(person, archive.persons, archive.pages); }
  await db.update(persons).set({ deletedAt: restore ? null : new Date().toISOString() }).where(eq(persons.id, id));
  await db.insert(revisions).values({ id: crypto.randomUUID(), personId: id, name: person.name, action: restore ? "从回收站恢复" : "移入回收站", detail: person, createdAt: new Date().toISOString() });
}

export async function rollbackRevision(id: string) {
  const [revision] = await db.select().from(revisions).where(eq(revisions.id, id));
  if (!revision?.personId || !revision.detail || typeof revision.detail !== "object" || !("id" in revision.detail)) throw new Error("这条记录没有可回滚的人物快照");
  await savePerson(revision.detail as Record<string, unknown>);
}

export async function uploadPages(volume: number, inputs: Record<string, unknown>[]) {
  if (!Number.isInteger(volume) || volume < 1 || volume > 999 || !Array.isArray(inputs) || !inputs.length || inputs.length > 20) throw new Error("请选择 1–20 张谱页并指定有效册号");
  const existing = await db.select().from(sourcePages).where(eq(sourcePages.volume, volume));
  const lastPage = Math.max(0, ...existing.map(p => p.pageNo));
  const pages = inputs.map((input, i) => {
    const image = typeof input.image === "string" ? input.image : "";
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 7 * 1024 * 1024) throw new Error("上传影像格式不正确或超过 5MB");
    return { id: crypto.randomUUID(), volume, pageNo: lastPage + i + 1, title: text(input.title, 100) || "新谱页", image, status: "unrecorded" as const, transcription: "" };
  });
  db.transaction(tx => {
    for (const page of pages) tx.insert(sourcePages).values(page).run();
    tx.insert(revisions).values({ id: crypto.randomUUID(), name: `卷${volume}`, action: `存档 ${pages.length} 张谱页`, detail: { pageIds: pages.map(p => p.id) }, createdAt: new Date().toISOString() }).run();
  });
}

export async function getBackups() { return db.select().from(backupEvents).orderBy(desc(backupEvents.createdAt)).limit(20); }

export function toGedcom(people: Person[]) {
  const clean = (s: string) => s.replace(/[\r\n]+/g, " ");
  const lines = ["0 HEAD", "1 SOUR JIACHENG", "1 GEDC", "2 VERS 5.5.1", "1 CHAR UTF-8"];
  for (const p of people.filter(p => !p.deletedAt)) {
    lines.push(`0 @${p.id}@ INDI`, `1 NAME ${clean(p.name)}`, `1 SEX ${p.gender === "female" ? "F" : "M"}`, `1 _GENERATION ${p.generation}`);
    if (p.courtesyName) lines.push(`1 _COURTESY ${clean(p.courtesyName)}`);
    if (p.artName) lines.push(`1 _ARTNAME ${clean(p.artName)}`);
    if (p.birth?.solar) lines.push("1 BIRT", `2 DATE ${p.birth.solar}`);
    if (p.birth?.original) lines.push(`1 _BIRTH_ORIGINAL ${clean(p.birth.original)}`);
    if (p.death?.solar) lines.push("1 DEAT", `2 DATE ${p.death.solar}`);
    if (p.biography) lines.push(`1 NOTE ${clean(p.biography)}`);
    if (p.fatherId) lines.push(`1 FAMC @F-${p.fatherId}@`);
    if (p.sourcePageId) lines.push(`1 _SOURCE_PAGE ${clean(p.sourcePageId)}`);
    if (p.spouse) lines.push(`1 _SPOUSE_TEXT ${clean(p.spouse)}`);
  }
  for (const p of people) {
    const children = people.filter(c => c.fatherId === p.id && !c.deletedAt);
    if (children.length) lines.push(`0 @F-${p.id}@ FAM`, `1 HUSB @${p.id}@`, ...children.map(c => `1 CHIL @${c.id}@`));
  }
  lines.push("0 TRLR"); return lines.join("\r\n");
}
