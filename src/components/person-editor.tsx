"use client";
import { useState, type FormEvent } from "react";
import { ArrowUp, CalendarDays, Check, ChevronDown, Plus, Save, Trash2 } from "lucide-react";
import { useArchive } from "./archive-context";
import { Modal } from "./ui";
import { generationLabel, type DualDate, type Person } from "@/lib/types";
import { parseTraditionalDate } from "@/lib/calendar";

const blankDate: DualDate = { original: "", solar: "", certainty: "unknown" };

export function PersonEditor({ initial, onClose }: { initial: Partial<Person>; onClose: () => void }) {
  const { people, data, mutate, toast } = useArchive();
  const defaultGeneration = initial.generation || (people.length ? Math.max(...people.map(p => p.generation)) : 1);
  const [person, setPerson] = useState<Partial<Person>>({
    name: "",
    gender: "male",
    generation: defaultGeneration,
    fatherId: null,
    motherId: null,
    status: "recorded",
    isAlive: true,
    nativePlace: "",
    ...initial,
  });
  const [aliases, setAliases] = useState(initial.aliases?.join("、") || "");
  const [spouses, setSpouses] = useState(initial.spouse ? initial.spouse.split(/[；;\n]/) : [""]);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);

  const patch = (key: keyof Person, value: unknown) => setPerson(p => ({ ...p, [key]: value }));
  const sameName = people.filter(p => p.name === person.name && p.id !== person.id);

  async function save(e: FormEvent, verified = false) {
    e.preventDefault();
    if (!person.name?.trim()) {
      setTab(0);
      toast("请先填写谱名，或标记「讳无考」", true);
      return;
    }
    setSaving(true);
    const success = await mutate(
      {
        action: "savePerson",
        person: {
          ...person,
          aliases: aliases
            .split(/[、,，]/)
            .map(a => a.trim())
            .filter(Boolean),
          spouse: spouses.map(s => s.trim()).filter(Boolean).join("；"),
          status: verified ? "verified" : person.status,
        },
      },
      initial.id ? "人物资料已保存，修订记录已留存" : "已录入一位族人，家谱又添一页"
    );
    setSaving(false);
    if (success) onClose();
  }

  return (
    <Modal
      title={initial.id ? `编修 · ${initial.name}` : "录入一位族人"}
      subtitle="写下一个名字，留住一段家史。"
      onClose={onClose}
      wide
      className="editor-modal"
    >
      <form onSubmit={save}>
        <div className="editor-tabs">
          {["基本信息", "世系与亲属", "生卒与出处"].map((t, i) => (
            <button
              type="button"
              className={tab === i ? "active" : ""}
              key={t}
              onClick={() => setTab(i)}
            >
              <span>0{i + 1}</span>
              {t}
            </button>
          ))}
        </div>
        <div className="editor-content">
          {tab === 0 && (
            <>
              <div className="form-row">
                <label className="form-field">
                  <span>讳 / 谱名 <em>*</em></span>
                  <input
                    autoFocus
                    value={person.name || ""}
                    onChange={e => patch("name", e.target.value)}
                    placeholder="请填写谱上记载的姓名"
                    maxLength={80}
                  />
                  <small>
                    <label className="inline-checkbox">
                      <input
                        type="checkbox"
                        checked={person.name === "讳无考"}
                        onChange={e => patch("name", e.target.checked ? "讳无考" : "")}
                      />
                      原谱失载其名，标记为「讳无考」
                    </label>
                  </small>
                </label>
                <label className="form-field">
                  <span>性别</span>
                  <select value={person.gender} onChange={e => patch("gender", e.target.value)}>
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                </label>
              </div>
              {sameName.length > 0 && (
                <div className="form-warning">
                  谱中已有 {sameName.length} 位「{person.name}」
                  {sameName.some(p => p.fatherId === person.fatherId) ? "，其中有同父同名条目" : ""}。同名可以保存，请留意世代与亲属。
                </div>
              )}
              <div className="form-row">
                <label className="form-field">
                  <span>字</span>
                  <input
                    value={person.courtesyName || ""}
                    onChange={e => patch("courtesyName", e.target.value)}
                    placeholder="如：静之"
                  />
                </label>
                <label className="form-field">
                  <span>号</span>
                  <input
                    value={person.artName || ""}
                    onChange={e => patch("artName", e.target.value)}
                    placeholder="如：青莲居士"
                  />
                </label>
              </div>
              <label className="form-field">
                <span>别名 / 行用名</span>
                <input
                  value={aliases}
                  onChange={e => setAliases(e.target.value)}
                  placeholder="多个别名用顿号隔开，如：小远、阿远"
                />
              </label>
              <div className="form-row">
                <label className="form-field">
                  <span>籍贯</span>
                  <input
                    value={person.nativePlace || ""}
                    onChange={e => patch("nativePlace", e.target.value)}
                    placeholder="省 · 县 · 村"
                  />
                </label>
                <label className="form-field">
                  <span>现居 / 迁居</span>
                  <input
                    value={person.residence || ""}
                    onChange={e => patch("residence", e.target.value)}
                    placeholder="如：北京 · 海淀"
                  />
                </label>
              </div>
              <label className="form-field">
                <span>人物小传</span>
                <textarea
                  rows={5}
                  value={person.biography || ""}
                  onChange={e => patch("biography", e.target.value)}
                  placeholder="记下生平、家风，或是长辈口中的一段往事。"
                />
              </label>
            </>
          )}

          {tab === 1 && (
            <>
              <div className="form-section-note">
                兄弟姐妹由父母关系推导，无需重复录入。录入时会自动校验关系，防止形成亲缘循环。
              </div>
              <div className="form-row">
                <label className="form-field">
                  <span>父亲</span>
                  <select
                    value={person.fatherId || ""}
                    onChange={e => {
                      const father = people.find(p => p.id === e.target.value);
                      setPerson(p => ({
                        ...p,
                        fatherId: father?.id || null,
                        generation: father ? father.generation + 1 : p.generation,
                      }));
                    }}
                  >
                    <option value="">无记载 / 始迁祖</option>
                    {people
                      .filter(p => p.id !== person.id && p.gender === "male")
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {generationLabel(p.generation)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>生母</span>
                  <select
                    value={person.motherId || ""}
                    onChange={e => patch("motherId", e.target.value || null)}
                  >
                    <option value="">无记载 / 谱外配偶</option>
                    {people
                      .filter(p => p.gender === "female" && p.id !== person.id)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {generationLabel(p.generation)}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label className="form-field">
                  <span>世代序号</span>
                  <input
                    type="number"
                    min={1}
                    value={person.generation || 1}
                    onChange={e => patch("generation", Number(e.target.value))}
                  />
                  <small>随父自动 +1，可按家谱记载覆写。</small>
                </label>
                <label className="form-field">
                  <span>出继 / 入继等关系备注</span>
                  <input
                    value={person.note || ""}
                    onChange={e => patch("note", e.target.value)}
                    placeholder="照录关系事实，不确定处保留存疑"
                  />
                </label>
              </div>
              <div className="form-field">
                <span>配偶记载 <small>按元配、继配、侧室顺序排列</small></span>
                <div className="spouse-list">
                  {spouses.map((spouse, i) => (
                    <div className="spouse-row" key={i}>
                      <span>{i + 1}</span>
                      <input
                        value={spouse}
                        onChange={e =>
                          setSpouses(list =>
                            list.map((s, index) => (index === i ? e.target.value : s))
                          )
                        }
                        placeholder={i === 0 ? "元配 · 某氏" : "继配 · 某氏"}
                      />
                      <button
                        type="button"
                        className="icon-button"
                        disabled={i === 0}
                        aria-label="配偶上移"
                        onClick={() =>
                          setSpouses(list => {
                            const next = [...list];
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            return next;
                          })
                        }
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="移除配偶"
                        onClick={() => setSpouses(list => list.filter((_, index) => index !== i))}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setSpouses(list => [...list, ""])}
                >
                  <Plus size={14} />补充一位配偶
                </button>
                <small>谱外配偶可仅以文字记载，不必另建人物。</small>
              </div>
              <label className="privacy-toggle">
                <div>
                  <strong>整支隐藏</strong>
                  <p>访客将看不到此人与全部子孙；管理端仍然可见。</p>
                </div>
                <input
                  type="checkbox"
                  checked={person.hidden || false}
                  onChange={e => patch("hidden", e.target.checked)}
                />
              </label>
            </>
          )}

          {tab === 2 && (
            <>
              <label className="inline-checkbox alive-checkbox">
                <input
                  type="checkbox"
                  checked={person.isAlive || false}
                  onChange={e => patch("isAlive", e.target.checked)}
                />
                目前在世 <small>在世人物默认只展示生年</small>
              </label>
              <DateFields
                title="出生"
                date={person.birth || null}
                onChange={value => patch("birth", value)}
              />
              {!person.isAlive && (
                <DateFields
                  title="逝世"
                  date={person.death || null}
                  onChange={value => patch("death", value)}
                />
              )}
              <div className="form-divider" />
              <label className="form-field">
                <span>出处谱页</span>
                <select
                  value={person.sourcePageId || ""}
                  onChange={e => patch("sourcePageId", e.target.value || null)}
                >
                  <option value="">暂不关联（家人口述 / 待考）</option>
                  {data.pages.map(p => (
                    <option key={p.id} value={p.id}>
                      卷{p.volume} · 第 {p.pageNo} 页 · {p.title}
                    </option>
                  ))}
                </select>
                <small>标为「已校对」前，必须关联原谱页。</small>
              </label>
              <label className="form-field">
                <span>原文照录</span>
                <textarea
                  rows={3}
                  value={person.original || ""}
                  onChange={e => patch("original", e.target.value)}
                  placeholder="忠实照录原谱记载，存疑处不做推断。"
                />
              </label>
              <label className="form-field">
                <span>录入状态</span>
                <select
                  value={person.status || "recorded"}
                  onChange={e => patch("status", e.target.value)}
                >
                  <option value="recorded">已录未校 · 草稿</option>
                  <option value="verified">已校对 · 已对原文</option>
                  <option value="unrecorded">未录入 · 待补充</option>
                </select>
              </label>
            </>
          )}
        </div>
        <div className="editor-footer">
          <div>
            {tab > 0 && (
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setTab(t => t - 1)}
              >
                上一步
              </button>
            )}
            {tab < 2 && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setTab(t => t + 1)}
              >
                下一步<ChevronDown size={14} className="rotate-left" />
              </button>
            )}
          </div>
          <div>
            <button type="button" className="button button-ghost" onClick={onClose}>
              取消
            </button>
            <button className="button button-primary" type="submit" disabled={saving}>
              <Save size={16} />{saving ? "保存中…" : "保存族人"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function DateFields({
  title,
  date,
  onChange,
}: {
  title: string;
  date: DualDate | null;
  onChange: (date: DualDate) => void;
}) {
  const { toast } = useArchive();
  const [notice, setNotice] = useState("");
  const [converting, setConverting] = useState(false);
  const [year, setYear] = useState(1986);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [leap, setLeap] = useState(false);
  const [hour, setHour] = useState("");
  const value = date || blankDate;

  async function convert(original: string) {
    setConverting(true);
    try {
      const result = await parseTraditionalDate(original);
      onChange(result.date);
      setNotice(result.notice);
    } catch (e) {
      toast(e instanceof Error ? e.message : "换算失败", true);
    }
    setConverting(false);
  }

  return (
    <div className="date-fieldset">
      <div className="date-field-title">
        <CalendarDays size={16} />
        <h3>{title}日期</h3>
        <span>原文优先 · 双历并存</span>
      </div>
      <label className="form-field">
        <span>老谱原文 / 农历纪年</span>
        <div className="input-with-button">
          <input
            value={value.original}
            onChange={e => onChange({ ...value, original: e.target.value })}
            placeholder="如：民国三十二年腊月十五丑时 / 约1856年 / 无考"
          />
          <button type="button" onClick={() => void convert(value.original)} disabled={converting}>
            {converting ? "换算中" : "换算"}
          </button>
        </div>
      </label>
      <div className="form-row">
        <label className="form-field">
          <span>公历（可覆写）</span>
          <input
            value={value.solar}
            onChange={e => onChange({ ...value, solar: e.target.value })}
            placeholder="YYYY 或 YYYY-MM-DD"
          />
        </label>
        <label className="form-field">
          <span>日期确定性</span>
          <select
            value={value.certainty}
            onChange={e => onChange({ ...value, certainty: e.target.value as DualDate["certainty"] })}
          >
            <option value="exact">精确日期</option>
            <option value="approximate">约 / 近似</option>
            <option value="year">仅年份</option>
            <option value="unknown">无考</option>
          </select>
        </label>
      </div>
      {notice && (
        <p className="date-notice">
          <Check size={13} />{notice}
        </p>
      )}
      <details className="lunar-picker">
        <summary>
          农历选择器 · 含闰月与时辰<ChevronDown size={13} />
        </summary>
        <div>
          <input
            aria-label="农历年"
            type="number"
            min={1901}
            max={2100}
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          />
          <span>年</span>
          <select
            aria-label="农历月"
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1} 月
              </option>
            ))}
          </select>
          <select
            aria-label="农历日"
            value={day}
            onChange={e => setDay(Number(e.target.value))}
          >
            {Array.from({ length: 30 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1} 日
              </option>
            ))}
          </select>
          <select
            aria-label="时辰"
            value={hour}
            onChange={e => setHour(e.target.value)}
          >
            <option value="">时辰无考</option>
            {"子丑寅卯辰巳午未申酉戌亥".split("").map(h => (
              <option key={h} value={h}>
                {h}时
              </option>
            ))}
          </select>
          <label>
            <input type="checkbox" checked={leap} onChange={e => setLeap(e.target.checked)} />
            闰月
          </label>
          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              void convert(`${year}年${leap ? "闰" : ""}${month}月${day}日${hour ? `${hour}时` : ""}`)
            }
          >
            应用
          </button>
        </div>
      </details>
      <p className="field-footnote">可靠换算区间 1901–2100；更早纪年仅保留年份与原文。</p>
    </div>
  );
}
