import type { DualDate } from "./types";
export function chineseNumber(value: string): number {
  if (/^\d+$/.test(value)) return Number(value);
  const nums: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 元: 1, 正: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 腊: 12, 冬: 11 };
  value = value.replace(/初/g, "").replace(/廿/g, "二十").replace(/卅/g, "三十");
  if (value.includes("十")) { const [left, right] = value.split("十"); return (left ? nums[left] || 0 : 1) * 10 + (nums[right] || 0); }
  if (value.length > 1) return Number(value.split("").map(c => nums[c] ?? "").join(""));
  return nums[value] || 0;
}
export async function parseTraditionalDate(original: string): Promise<{ date: DualDate; notice: string }> {
  const unknown: DualDate = { original, solar: "", certainty: "unknown" };
  if (!original.trim() || /无考|不详/.test(original)) return { date: unknown, notice: "已保留「无考」状态" };
  const approximate = /约|大概/.test(original);
  const era = original.match(/(民国|光绪|道光|同治|咸丰|嘉庆|乾隆|宣统)([\d一二三四五六七八九十元〇零]+)年/);
  let year = 0;
  if (era) { const bases: Record<string, number> = { 民国: 1911, 光绪: 1874, 道光: 1820, 同治: 1861, 咸丰: 1850, 嘉庆: 1795, 乾隆: 1735, 宣统: 1908 }; year = bases[era[1]] + chineseNumber(era[2]); }
  else { const match = original.match(/([\d〇零一二三四五六七八九]{4})年?/); if (match) year = chineseNumber(match[1]); }
  if (!year || year > 2100) return { date: unknown, notice: "暂无法可靠换算，已完整保留原文" };
  const monthMatch = original.match(/(闰)?([\d一二三四五六七八九十正冬腊]+)月/);
  const dayMatch = original.match(/月([\d初一二三四五六七八九十廿卅]+)(日|[子丑寅卯辰巳午未申酉戌亥]时|$)/);
  if (year < 1901 || !monthMatch || !dayMatch) return { date: { original, solar: String(year), certainty: approximate ? "approximate" : "year" }, notice: year < 1901 ? "1901 年前仅保留年份与原文，不推算具体日期" : `已识别公元 ${year} 年（仅年份）` };
  const month = chineseNumber(monthMatch[2]), day = chineseNumber(dayMatch[1]);
  const leap = !!monthMatch[1]; const hour = original.match(/([子丑寅卯辰巳午未申酉戌亥])时/)?.[1] || "";
  try {
    const { Lunar } = await import("lunar-javascript");
    const solar = Lunar.fromYmd(year, leap ? -month : month, day).getSolar().toYmd();
    return { date: { original, solar, certainty: approximate ? "approximate" : "exact", lunar: { year, month, day, leap, hour } }, notice: `公历 ${solar}${hour ? ` · ${hour}时` : ""}` };
  } catch { throw new Error("这个农历日期不存在，请核对闰月和日期；原文仍可照录保存"); }
}
