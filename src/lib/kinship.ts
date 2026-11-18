import { birthYear, type Person } from "./types";
type Step = { id: string; type: "father" | "mother" | "son" | "daughter" };
const words = { father: "父亲", mother: "母亲", son: "儿子", daughter: "女儿" };
export function kinship(fromId: string, toId: string, people: Person[]): { title: string | null; path: string; ids: string[] } {
  if (fromId === toId) return { title: "自己", path: "这就是你本人", ids: [fromId] };
  const map = new Map(people.map(p => [p.id, p]));
  const from = map.get(fromId), to = map.get(toId);
  if (!from || !to) return { title: null, path: "请先选择两位族人", ids: [] };
  const queue: { id: string; steps: Step[] }[] = [{ id: fromId, steps: [] }];
  const seen = new Set([fromId]); let steps: Step[] | null = null;
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]; const person = map.get(current.id)!;
    const adjacent: Step[] = [];
    if (person.fatherId && map.has(person.fatherId)) adjacent.push({ id: person.fatherId, type: "father" });
    if (person.motherId && map.has(person.motherId)) adjacent.push({ id: person.motherId, type: "mother" });
    for (const child of people) { if (child.fatherId === current.id || child.motherId === current.id) adjacent.push({ id: child.id, type: child.gender === "female" ? "daughter" : "son" }); }
    for (const next of adjacent) {
      if (seen.has(next.id)) continue;
      const path = [...current.steps, next];
      if (next.id === toId) { steps = path; break; }
      seen.add(next.id); queue.push({ id: next.id, steps: path });
    }
    if (steps) break;
  }
  if (!steps) return { title: null, path: "当前谱中尚未记录可连接的亲缘关系", ids: [] };
  const key = steps.map(s => s.type).join("/");
  const titles: Record<string, string> = {
    father: "父亲", mother: "母亲", son: "儿子", daughter: "女儿",
    "father/father": "祖父", "father/mother": "祖母", "mother/father": "外祖父", "mother/mother": "外祖母",
    "father/father/father": "曾祖父", "father/father/mother": "曾祖母", "father/father/father/father": "高祖父",
    "son/son": "孙子", "son/daughter": "孙女", "daughter/son": "外孙", "daughter/daughter": "外孙女",
    "son/son/son": "曾孙", "son/son/daughter": "曾孙女",
  };
  let title: string | null = titles[key] || null;
  const older = (a: Person, b: Person, prefix = "") => {
    const ay = Number(birthYear(a)), by = Number(birthYear(b));
    const known = Number.isFinite(ay) && Number.isFinite(by) && ay !== by;
    return prefix + (a.gender === "female" ? known ? ay < by ? "姐" : "妹" : "姐妹" : known ? ay < by ? "兄" : "弟" : "兄弟");
  };
  if (/^(father|mother)\/(son|daughter)$/.test(key)) title = older(to, from);
  if (/^father\/father\/(son|daughter)$/.test(key)) {
    const father = map.get(from.fatherId || "");
    if (to.gender === "female") title = "姑母";
    else if (father && Number(birthYear(to)) !== Number(birthYear(father)) && Number.isFinite(Number(birthYear(to))) && Number.isFinite(Number(birthYear(father)))) title = Number(birthYear(to)) < Number(birthYear(father)) ? "伯父" : "叔父";
    else title = "伯父或叔父（长幼待考）";
  }
  if (/^mother\/(father|mother)\/(son|daughter)$/.test(key)) title = to.gender === "female" ? "姨母" : "舅父";
  if (/^father\/father\/son\/(son|daughter)$/.test(key)) title = older(to, from, "堂");
  if (/^(father\/father\/daughter|mother\/(father|mother)\/(son|daughter))\/(son|daughter)$/.test(key)) title = older(to, from, "表");
  if (/^(father|mother)\/son\/(son|daughter)$/.test(key)) title = to.gender === "female" ? "侄女" : "侄子";
  if (/^(father|mother)\/daughter\/(son|daughter)$/.test(key)) title = to.gender === "female" ? "外甥女" : "外甥";
  return { title, path: steps.map(s => words[s.type]).join("的"), ids: [fromId, ...steps.map(s => s.id)] };
}
