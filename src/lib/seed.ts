import type { Person, SourcePage } from "./types";

const initialDate = "2026-11-18T00:00:00.000Z";
const date = (year: number) => ({ original: `${year}年`, solar: `${year}`, certainty: "year" as const });

function person(id: string, name: string, generation: number, fatherId: string | null, year: number, extra: Partial<Person> = {}): Person {
  return { id, name, generation, fatherId, motherId: null, motherName: "", gender: "male", generationName: "", aliases: [],
    birth: date(year), death: year < 1940 ? date(year + 72) : null, isAlive: year >= 1940,
    spouse: "", nativePlace: "", residence: "", biography: "", status: "verified", hidden: false,
    sourcePageId: null, original: "", note: "", createdAt: initialDate, updatedAt: initialDate, deletedAt: null, ...extra };
}

// Test fixtures used for core rules and kinship regression checks
export const testFixturePersons: Person[] = [
  person("p1", "李伯源", 1, null, 1630, { generationName: "伯", spouse: "元配 · 汪氏", biography: "李氏一脉始迁祖。为人和善，崇尚耕读传家。", original: "始迁祖伯源公，耕读传家。" }),
  person("p2", "李廷瑞", 2, "p1", 1663, { generationName: "廷", spouse: "元配 · 程氏" }),
  person("p3", "李世泽", 3, "p2", 1696, { generationName: "世" }),
  person("p4", "李宗文", 4, "p3", 1730),
  person("p5", "李庆和", 5, "p4", 1763),
  person("p6", "李永昌", 6, "p5", 1795),
  person("p7", "李继业", 7, "p6", 1826),
  person("p8", "李德清", 8, "p7", 1856, { generationName: "德", spouse: "元配 · 方氏", biography: "幼承庭训，笃志力学，以耕读为业，待人谦和，乐善好施。" }),
  person("p9", "李承礼", 9, "p8", 1892, { generationName: "承", spouse: "元配 · 吴氏" }),
  person("p9b", "李承义", 9, "p8", 1895, { generationName: "承", spouse: "元配 · 许氏" }),
  person("p9c", "李承仁", 9, "p8", 1899, { generationName: "承", spouse: "元配 · 江氏" }),
  person("p10", "李文渊", 10, "p9", 1926, { generationName: "文", spouse: "元配 · 王秀英" }),
  person("p10b", "李文清", 10, "p9", 1930, { spouse: "元配 · 张氏" }),
  person("p10c", "李文翰", 10, "p9b", 1929),
  person("p10d", "李文谦", 10, "p9b", 1933),
  person("p10e", "李文华", 10, "p9c", 1931),
  person("p10f", "李文秀", 10, "p9c", 1935, { gender: "female" }),
  person("p11", "李守正", 11, "p10", 1958, { spouse: "元配 · 林素琴", status: "verified" }),
  person("p11b", "李守仁", 11, "p10", 1961),
  person("p11c", "李守诚", 11, "p10b", 1963),
  person("me", "李知远", 12, "p11", 1986, { isAlive: true, generationName: "知", spouse: "元配 · 许安宁", status: "recorded", aliases: ["小远"] }),
  person("p12b", "李知行", 12, "p11", 1989, { status: "recorded" }),
  person("p12c", "李知夏", 12, "p11b", 1993, { gender: "female", status: "recorded" }),
  person("p12d", "李知秋", 12, "p11c", 1995, { gender: "female", status: "recorded" }),
  person("p13", "李思齐", 13, "me", 2012, { status: "recorded", gender: "female" }),
  person("p13b", "李思源", 13, "p12b", 2018, { status: "recorded" }),
];

// For regression tests compatibility
export const seedPersons: Person[] = testFixturePersons;
export const seedPages: SourcePage[] = [];
