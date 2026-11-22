export type EntryStatus = "unrecorded" | "recorded" | "verified";
export type DualDate = {
  original: string;
  solar: string;
  certainty: "exact" | "approximate" | "year" | "unknown";
  lunar?: { year: number; month: number; day: number; leap: boolean; hour: string };
};
export type Person = {
  id: string; name: string; gender: "male" | "female"; generation: number;
  fatherId: string | null; motherId: string | null; motherName: string;
  generationName: string; aliases: string[];
  birth: DualDate | null; death: DualDate | null; isAlive: boolean;
  spouse: string; nativePlace: string; residence: string; biography: string;
  status: EntryStatus; hidden: boolean; sourcePageId: string | null;
  original: string; note: string; createdAt: string; updatedAt: string; deletedAt: string | null;
};
export type SourcePage = {
  id: string; volume: number; pageNo: number; title: string; image: string;
  status: EntryStatus; transcription: string; updatedAt: string;
};
export type Revision = {
  id: string; personId: string | null; name: string; action: string;
  detail: unknown; createdAt: string;
};
export type ArchiveData = {
  persons: Person[]; pages: SourcePage[]; revisions: Revision[];
  role: "visitor" | "admin"; demo: boolean; title: string;
};
export const statusLabels: Record<EntryStatus, string> = {
  unrecorded: "未录入", recorded: "已录未校", verified: "已校对",
};
export const generationChars = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"];
export function generationLabel(n: number) { return `第${generationChars[n] || n}世`; }
export function formatGenerationName(value?: string | null) {
  const clean = value?.trim() || "";
  if (!clean) return "";
  if (clean.endsWith("辈")) return clean;
  if (clean.endsWith("字")) return `${clean}辈`;
  return `${clean}字辈`;
}
export function birthYear(person: Person) { return person.birth?.solar?.slice(0, 4) || person.birth?.original.match(/\d{4}/)?.[0] || "无考"; }
export function lifeYears(person: Person) { return `${birthYear(person)} — ${person.isAlive ? "今" : person.death?.solar?.slice(0, 4) || "无考"}`; }
export function visiblePeople(persons: Person[]) {
  const hidden = new Set(persons.filter(p => p.hidden).map(p => p.id));
  let changed = true;
  while (changed) { changed = false; for (const person of persons) { if (((person.fatherId && hidden.has(person.fatherId)) || (person.motherId && hidden.has(person.motherId))) && !hidden.has(person.id)) { hidden.add(person.id); changed = true; } } }
  return persons.filter(p => !hidden.has(p.id) && !p.deletedAt);
}
