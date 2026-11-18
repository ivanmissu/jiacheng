import assert from "node:assert/strict";
import { parseTraditionalDate } from "../src/lib/calendar";
import { kinship } from "../src/lib/kinship";
import { seedPersons } from "../src/lib/seed";
import { visiblePeople, type Person } from "../src/lib/types";
async function run() {
  for (const [original, solar, certainty] of [
    ["2024年正月初一", "2024-02-10", "exact"],
    ["2023年闰二月初一", "2023-03-22", "exact"],
    ["民国三十二年腊月十五丑时", "1944-01-10", "exact"],
    ["光绪二十年正月初一", "1894", "year"],
    ["约1856年", "1856", "approximate"],
    ["无考", "", "unknown"],
  ]) { const result = await parseTraditionalDate(original); assert.equal(result.date.solar, solar, original); assert.equal(result.date.certainty, certainty, original); }
  const traditional = await parseTraditionalDate("民国三十二年腊月十五丑时"); assert.equal(traditional.date.lunar?.hour, "丑");
  await assert.rejects(() => parseTraditionalDate("2023年闰三月初一"));
  for (const [from, to, title] of [
    ["me", "p11", "父亲"], ["me", "p10", "祖父"], ["p10", "me", "孙子"],
    ["me", "p9", "曾祖父"], ["me", "p8", "高祖父"], ["me", "p12b", "弟"],
    ["p12b", "me", "兄"], ["me", "p11b", "叔父"], ["me", "p12c", "堂妹"], ["me", "p13", "女儿"],
  ]) assert.equal(kinship(from, to, seedPersons).title, title, `${from} -> ${to}`);
  assert.equal(kinship("me", "p10b", seedPersons).title, null);
  assert(kinship("me", "p10b", seedPersons).path.includes("父亲"));
  const mother = { ...seedPersons.find(p => p.id === "p12c")!, hidden: true };
  const child: Person = { ...seedPersons[0], id: "maternal-test-child", fatherId: "p12b", motherId: mother.id, generation: 13 };
  const grandchild: Person = { ...child, id: "maternal-test-grandchild", fatherId: child.id, motherId: null, generation: 14 };
  const visible = visiblePeople([...seedPersons.filter(p => p.id !== mother.id), mother, child, grandchild]);
  assert(!visible.some(p => [mother.id, child.id, grandchild.id].includes(p.id)));
  assert(visible.some(p => p.id === "p12b"));
  console.log("PASS: lunar leap month, year boundary, era parsing, uncertainty degradation, invalid dates, 10 kinship fixtures, path fallback and maternal branch privacy.");
}
run().catch(error => { console.error(error); process.exit(1); });
