import type { Person, SourcePage } from "./types";
const initialDate = "2026-11-17T08:30:00.000Z";
const date = (year: number) => ({ original: `${year}年`, solar: `${year}`, certainty: "year" as const });
function person(id: string, name: string, generation: number, fatherId: string | null, year: number, extra: Partial<Person> = {}): Person {
  return { id, name, generation, fatherId, motherId: null, gender: "male", courtesyName: "", artName: "", aliases: [],
    birth: date(year), death: year < 1940 ? date(year + 72) : null, isAlive: year >= 1940,
    spouse: "", nativePlace: "安徽 · 歙县 · 呈坎", residence: "", biography: "", status: "verified", hidden: false,
    sourcePageId: "page-1-12", original: "", note: "", createdAt: initialDate, updatedAt: initialDate, deletedAt: null, ...extra };
}
export const seedPersons: Person[] = [
  person("p1", "陈伯源", 1, null, 1630, { courtesyName: "溯之", artName: "颍川居士", spouse: "元配 · 汪氏", biography: "公讳伯源，字溯之，原籍颍川。明末携家南迁，卜居徽州府歙县呈坎。见此地山水环合、田畴平旷，遂筑屋定居，为本支始迁祖。\n\n公性敦厚，重耕读，训子孙以忠信为本。创置义田，修桥铺路，乡里称善。后世子孙奉为一世祖，世守家风，绵延至今。", original: "始迁祖伯源公，字溯之。由颍川迁歙，卜居呈坎，耕读传家。" }),
  person("p2", "陈廷瑞", 2, "p1", 1663, { courtesyName: "玉阶", spouse: "元配 · 程氏" }),
  person("p3", "陈世泽", 3, "p2", 1696, { courtesyName: "润之" }),
  person("p4", "陈宗文", 4, "p3", 1730), person("p5", "陈庆和", 5, "p4", 1763),
  person("p6", "陈永昌", 6, "p5", 1795), person("p7", "陈继业", 7, "p6", 1826),
  person("p8", "陈德清", 8, "p7", 1856, { courtesyName: "静之", spouse: "元配 · 方氏", biography: "公讳德清，字静之，继业公长子。幼承庭训，笃志力学，以耕读为业，待人谦和，乐善好施。光绪年间参与续修陈氏宗谱，采辑先人遗文，考订世系，历三年而成。\n\n公常言：树高千尺不忘根，水流万里总思源。此语为后辈传诵，今录于谱，以志不忘。", original: "德清公，字静之，继业公长子。生于咸丰六年丙辰，配方氏，生子三：承礼、承义、承仁。" }),
  person("p9", "陈承礼", 9, "p8", 1892, { courtesyName: "敬修", spouse: "元配 · 吴氏", biography: "德清公长子，字敬修。秉承家学，躬耕课读，教子有方。民国年间任乡塾先生，乡邻尊之。", original: "承礼，德清长子，字敬修，配吴氏。" }),
  person("p9b", "陈承义", 9, "p8", 1895, { courtesyName: "宜之", spouse: "元配 · 许氏" }),
  person("p9c", "陈承仁", 9, "p8", 1899, { courtesyName: "厚德", spouse: "元配 · 江氏" }),
  person("p10", "陈文渊", 10, "p9", 1926, { courtesyName: "博之", spouse: "元配 · 李秀英", biography: "承礼公长子，字博之。早年就读于歙县师范，后在家乡任教四十余载。桃李遍及乡里，晚年整理家中旧谱、书信及手稿，为本次数字化留下珍贵底本。", original: "文渊，承礼长子，民国十五年生，配李氏。" }),
  person("p10b", "陈文清", 10, "p9", 1930, { spouse: "元配 · 王氏" }),
  person("p10c", "陈文翰", 10, "p9b", 1929), person("p10d", "陈文谦", 10, "p9b", 1933),
  person("p10e", "陈文华", 10, "p9c", 1931), person("p10f", "陈文秀", 10, "p9c", 1935, { gender: "female" }),
  person("p11", "陈守正", 11, "p10", 1958, { spouse: "元配 · 林素琴", status: "verified", biography: "文渊公长子。生于呈坎，后迁居杭州，从事建筑设计。念及老谱日渐残损，倡议将家谱数字化，让散居各地的族人都能找到自己的来处。" }),
  person("p11b", "陈守仁", 11, "p10", 1961, { residence: "浙江 · 杭州" }),
  person("p11c", "陈守诚", 11, "p10b", 1963),
  person("me", "陈知远", 12, "p11", 1986, { isAlive: true, courtesyName: "", spouse: "元配 · 许安宁", residence: "浙江 · 杭州", status: "recorded", sourcePageId: null, biography: "家谱数字化的发起与维护者。希望将长辈口中的故事、纸页上的名讳和散落各处的照片，慢慢整理成一部可以传下去的家谱。", aliases: ["小远"], original: "据家人口述补录。" }),
  person("p12b", "陈知行", 12, "p11", 1989, { status: "recorded" }),
  person("p12c", "陈知夏", 12, "p11b", 1993, { gender: "female", status: "recorded" }),
  person("p12d", "陈知秋", 12, "p11c", 1995, { gender: "female", status: "recorded" }),
  person("p13", "陈思齐", 13, "me", 2012, { status: "recorded", sourcePageId: null, gender: "female", residence: "浙江 · 杭州" }),
  person("p13b", "陈思源", 13, "p12b", 2018, { status: "recorded", sourcePageId: null }),
];
const names = ["景明", "景和", "云章", "云舒", "德润", "德馨", "怀瑾", "怀瑜", "绍庭", "绍安", "庆丰", "庆余", "永宁", "永康", "修远", "修文", "秉礼", "秉德", "敬之", "敬文", "立诚", "立言", "乐山", "乐水", "维新", "维清", "允中", "允和", "尚文", "尚礼", "仲平", "仲安", "明礼", "明德"];
for (let i = seedPersons.length; i < 128; i++) {
  const gen = 8 + (i % 6);
  const parents = seedPersons.filter(p => p.generation === gen - 1 && p.gender === "male");
  const father = parents[i % parents.length];
  seedPersons.push(person(`relative-${i}`, `陈${names[i % names.length]}${i > 94 ? "" : ""}`, gen, father?.id || "p7", 1856 + (gen - 8) * 31 + (i % 5), {
    gender: i % 5 === 0 ? "female" : "male", status: i % 6 === 0 ? "recorded" : "verified",
    sourcePageId: `page-${1 + i % 3}-${1 + i % 20}`, nativePlace: i % 4 === 0 ? "浙江 · 杭州" : "安徽 · 歙县 · 呈坎",
  }));
}
export const seedPages: SourcePage[] = [];
for (let volume = 1; volume <= 3; volume++) {
  for (let pageNo = 1; pageNo <= 24; pageNo++) {
    const verified = volume === 1 ? pageNo <= 20 : volume === 2 ? pageNo <= 14 : pageNo <= 6;
    seedPages.push({ id: `page-${volume}-${pageNo}`, volume, pageNo,
      title: pageNo === 1 ? "谱序" : pageNo < 4 ? "凡例与家训" : pageNo < 8 ? "世系总图" : "世系行传",
      image: "/images/genealogy-page.png", status: verified ? "verified" : pageNo <= 20 ? "recorded" : "unrecorded",
      transcription: pageNo === 12 ? "德清公，字静之，继业公长子。生于咸丰六年丙辰，配方氏，生子三：承礼、承义、承仁。\n\n承礼，德清长子，字敬修，配吴氏。生子二：文渊、文清。\n\n文渊，承礼长子，民国十五年生，配李氏。" : "陈氏宗谱 · 颍川堂\n\n木有本，水有源。凡我族人，敦亲睦族，耕读传家，继往开来。",
      updatedAt: initialDate });
  }
}
