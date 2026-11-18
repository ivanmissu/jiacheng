declare module "lunar-javascript" {
  type SolarDate = { toYmd(): string; getYear(): number; getMonth(): number; getDay(): number; getLunar(): LunarDate };
  type LunarDate = { getSolar(): SolarDate; toString(): string; getYearInGanZhi(): string; getMonthInChinese(): string; getDayInChinese(): string };
  export const Lunar: { fromYmd(year: number, month: number, day: number): LunarDate };
  export const Solar: { fromYmd(year: number, month: number, day: number): SolarDate };
}
