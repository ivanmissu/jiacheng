"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { pinyin } from "pinyin-pro";
import { ArrowDownUp, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Download, FileText, GitBranch, Grid2X2, List, Plus, Printer, Search, SlidersHorizontal, Upload, UserRound, Users } from "lucide-react";
import { useArchive } from "./archive-context";
import { Avatar, Badge, EmptyState, StaticImage } from "./ui";
import { birthYear, formatGenerationName, generationLabel, lifeYears, type Person } from "@/lib/types";
import { kinship } from "@/lib/kinship";

export function matchesPerson(person: Person, query: string) {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  return [
    person.name,
    person.generationName,
    formatGenerationName(person.generationName),
    person.motherName,
    ...person.aliases,
    person.nativePlace,
    person.residence,
    String(person.generation),
    generationLabel(person.generation),
    pinyin(person.name, { pattern: "first", toneType: "none" }).replace(/\s/g, ""),
  ].some(value => value.toLowerCase().includes(q));
}

export function Members() {
  const { people, query, setQuery, openPerson, openEditor, navigate } = useArchive();
  const [generation, setGeneration] = useState("");
  const [status, setStatus] = useState("");
  const [layout, setLayout] = useState("list");
  const [sort, setSort] = useState("generation");
  const generations = [...new Set(people.map(p => p.generation))].sort((a, b) => a - b);
  const filtered = useMemo(
    () =>
      people
        .filter(
          p =>
            matchesPerson(p, query) &&
            (!generation || p.generation === Number(generation)) &&
            (!status || p.status === status)
        )
        .sort((a, b) =>
          sort === "name" ? a.name.localeCompare(b.name, "zh-CN") : a.generation - b.generation
        ),
    [people, query, generation, status, sort]
  );

  return (
    <div className="page-enter">
      <div className="page-title-row">
        <div>
          <div className="eyebrow">FAMILY MEMBERS</div>
          <h1>族人名录<span className="title-dot">·</span><span className="title-fine">每一个名字，都值得被记住</span></h1>
        </div>
        <button className="button button-primary" onClick={() => openEditor()}>
          <Plus size={16} />录入新族人
        </button>
      </div>
      <div className="card">
        <div className="filter-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索姓名、字辈、别名、拼音首字母、籍贯…"
              aria-label="搜索族人"
            />
            {query && <button onClick={() => setQuery("")} aria-label="清除搜索">×</button>}
          </div>
          <select aria-label="按世代筛选" value={generation} onChange={e => setGeneration(e.target.value)}>
            <option value="">全部世代</option>
            {generations.map(g => (
              <option key={g} value={g}>{generationLabel(g)}</option>
            ))}
          </select>
          <select aria-label="按状态筛选" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">全部状态</option>
            <option value="verified">已校对</option>
            <option value="recorded">已录未校</option>
          </select>
          <div className="segmented">
            <button
              className={layout === "list" ? "active" : ""}
              onClick={() => setLayout("list")}
              aria-label="列表显示"
            >
              <List size={16} />
            </button>
            <button
              className={layout === "grid" ? "active" : ""}
              onClick={() => setLayout("grid")}
              aria-label="卡片显示"
            >
              <Grid2X2 size={16} />
            </button>
          </div>
        </div>
        <div className="results-bar">
          <span>
            共 <strong>{filtered.length}</strong> 位族人{query && ` · 与「${query}」相关`}
          </span>
          <label>
            <ArrowDownUp size={13} />
            <select value={sort} onChange={e => setSort(e.target.value)} aria-label="排序方式">
              <option value="generation">按世代排列</option>
              <option value="name">按姓名排列</option>
            </select>
          </label>
        </div>
        {!filtered.length ? (
          <EmptyState
            title={people.length ? "未找到符合条件的族人" : "家谱名录尚无记录"}
            description={people.length ? "可尝试清除筛选条件或更换搜索词" : "点击右上角「录入新族人」开启编修"}
          />
        ) : layout === "list" ? (
          <div className="table-scroll">
            <table className="members-table">
              <thead>
                <tr>
                  <th>姓名 / 字辈</th>
                  <th>世代</th>
                  <th>父亲</th>
                  <th>生卒年份</th>
                  <th>籍贯</th>
                  <th>录入状态</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => openPerson(p.id)}
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === "Enter") openPerson(p.id);
                    }}
                  >
                    <td>
                      <div className="table-person">
                        <Avatar name={p.name} gender={p.gender} size="small" />
                        <div>
                          <strong>
                            {p.name}
                            {p.hidden && <span className="hidden-label">整支隐藏</span>}
                          </strong>
                          <span>
                            {p.generationName
                              ? formatGenerationName(p.generationName)
                              : p.gender === "female"
                              ? "女"
                              : "男"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{generationLabel(p.generation)}</td>
                    <td>{people.find(f => f.id === p.fatherId)?.name || "始迁祖"}</td>
                    <td className="number-text">{lifeYears(p)}</td>
                    <td className="muted">{p.nativePlace || "—"}</td>
                    <td><Badge status={p.status} /></td>
                    <td><ChevronRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="member-grid">
            {filtered.map(p => (
              <button className="member-card" key={p.id} onClick={() => openPerson(p.id)}>
                <Avatar name={p.name} gender={p.gender} />
                <h3>{p.name}</h3>
                <p>
                  {generationLabel(p.generation)} ·{" "}
                  {p.generationName ? formatGenerationName(p.generationName) : p.gender === "female" ? "女" : "男"}
                </p>
                <span>{lifeYears(p)}</span>
                <Badge status={p.status} />
              </button>
            ))}
          </div>
        )}
        <div className="table-footer">
          <span>名在谱中，情在心里。</span>
          <button className="text-link" onClick={() => navigate("book")}>
            <Printer size={14} />生成打印版谱书<ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Timeline() {
  const { people, openPerson } = useArchive();
  const [generation, setGeneration] = useState("");
  const [branch, setBranch] = useState("");

  const topBranches = useMemo(() => {
    return people.filter(p => p.generation <= 2);
  }, [people]);

  const events = useMemo(() => {
    let scoped = people;
    if (branch) {
      const ids = new Set([branch]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const p of people) {
          if (p.fatherId && ids.has(p.fatherId) && !ids.has(p.id)) {
            ids.add(p.id);
            changed = true;
          }
        }
      }
      scoped = scoped.filter(p => ids.has(p.id));
    }
    return scoped
      .filter(p => !generation || p.generation === Number(generation))
      .flatMap(p => {
        const list = [
          {
            year: Number(birthYear(p)),
            title: `${p.name}出生`,
            text: `${generationLabel(p.generation)}${p.nativePlace ? ` · ${p.nativePlace}` : ""}`,
            person: p,
            type: "birth",
          },
        ];
        if (p.death?.solar) {
          list.push({
            year: Number(p.death.solar.slice(0, 4)),
            title: `${p.name}辞世`,
            text: p.death.original || "见本谱生卒记载",
            person: p,
            type: "death",
          });
        }
        return list;
      })
      .filter(e => Number.isFinite(e.year))
      .sort((a, b) => a.year - b.year);
  }, [people, generation, branch]);

  return (
    <div className="page-enter">
      <div className="page-title-row">
        <div>
          <div className="eyebrow">THROUGH THE YEARS</div>
          <h1>家族时间轴<span className="title-dot">·</span><span className="title-fine">把家族，放回时间的长河</span></h1>
        </div>
        <span className="subtle-count">
          {events.length ? `共记录 ${events.length} 条岁序记忆` : "暂无生卒时间记载"}
        </span>
      </div>
      <div className="timeline-intro">
        <StaticImage asset="familyLandscape" alt="故乡山水" priority />
        <div>
          <span>岁月无声，谱有回响。</span>
          <p>从始祖肇启家业，到子孙繁衍散居四海，每一个年份，都是家族前行的一个坐标。</p>
        </div>
      </div>
      <div className="card timeline-card">
        <div className="filter-toolbar">
          <span className="filter-label"><SlidersHorizontal size={16} />筛选记忆</span>
          <select value={branch} onChange={e => setBranch(e.target.value)}>
            <option value="">全部支系</option>
            {topBranches.map(p => (
              <option value={p.id} key={p.id}>{p.name}支系</option>
            ))}
          </select>
          <select value={generation} onChange={e => setGeneration(e.target.value)}>
            <option value="">全部世代</option>
            {[...new Set(people.map(p => p.generation))].map(g => (
              <option key={g} value={g}>{generationLabel(g)}</option>
            ))}
          </select>
          <span className="filter-result">{events.length} 条记载</span>
        </div>
        <div className="timeline-events">
          {events.length ? (
            events.map((event, i) => (
              <div className="timeline-event" key={`${event.person.id}-${event.type}`}>
                <div className="event-year">
                  {i === 0 || events[i - 1].year !== event.year ? (
                    <>
                      <strong>{event.year}</strong><span>公元</span>
                    </>
                  ) : null}
                </div>
                <span className={`event-dot ${event.type}`} />
                <button onClick={() => openPerson(event.person.id)}>
                  <span className="event-type">{event.type === "birth" ? "生命伊始" : "音容长存"}</span>
                  <h3>{event.title}<ArrowUpRight size={15} /></h3>
                  <p>{event.text}</p>
                </button>
              </div>
            ))
          ) : (
            <EmptyState title="暂无生卒纪年" description="录入含出生或逝世年份的族人资料后，将自动在此生成时间轴。" />
          )}
        </div>
      </div>
    </div>
  );
}

export function Archives() {
  const { data, openSource, requestAdmin, mutate, toast } = useArchive();
  const [volume, setVolume] = useState(1);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pages = data.pages.filter(p => p.volume === volume && (!status || p.status === status));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (data.role !== "admin") {
      requestAdmin("archives");
      return;
    }
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    setUploading(true);
    try {
      const uploads = await Promise.all(
        sorted.map(async file => {
          if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
            throw new Error("请使用 5MB 内的 JPG、PNG 或 WebP 图片");
          }
          const image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          return { title: file.name.replace(/\.[^.]+$/, ""), image };
        })
      );
      await mutate({ action: "uploadPages", volume, pages: uploads }, `已按文件名顺序存档 ${uploads.length} 张谱页`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "上传失败", true);
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="page-enter">
      <div className="page-title-row">
        <div>
          <div className="eyebrow">THE ORIGINAL RECORDS</div>
          <h1>老谱档案<span className="title-dot">·</span><span className="title-fine">字字可溯，页页有据</span></h1>
        </div>
        <button
          className="button button-primary"
          disabled={uploading}
          onClick={() => (data.role === "admin" ? fileInput.current?.click() : requestAdmin("archives"))}
        >
          <Upload size={16} />{uploading ? "正在存档…" : "上传谱页"}
        </button>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={e => void upload(e.target.files)}
        />
      </div>

      <div className="volume-grid">
        {[1, 2, 3].map(v => {
          const vPages = data.pages.filter(p => p.volume === v);
          const verified = vPages.filter(p => p.status === "verified").length;
          return (
            <button
              className={`volume-card ${volume === v ? "selected" : ""}`}
              key={v}
              onClick={() => setVolume(v)}
            >
              <div className="volume-spine">
                <span>李氏家谱</span>
                <small>卷{["", "一", "二", "三"][v]}</small>
              </div>
              <div>
                <span className="eyebrow">VOLUME 0{v}</span>
                <h3>卷{["", "一", "二", "三"][v]} · {v === 1 ? "谱序与世系" : v === 2 ? "世系行传" : "家训与艺文"}</h3>
                <p>共 {vPages.length} 页</p>
                <div className="progress-track">
                  <span style={{ width: `${(verified / Math.max(vPages.length, 1)) * 100}%` }} />
                </div>
                <small>已校对 {verified} / {vPages.length} 页</small>
              </div>
              {volume === v && <span className="volume-check"><Check size={13} /></span>}
            </button>
          );
        })}
      </div>

      <div className="card archive-pages-card">
        <div className="filter-toolbar">
          <h2>卷{["", "一", "二", "三"][volume]}谱页<span>{pages.length} 页</span></h2>
          <div className="archive-tabs">
            {[
              ["", "全部"],
              ["unrecorded", "未录入"],
              ["recorded", "已录未校"],
              ["verified", "已校对"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={key === status ? "active" : ""}
                onClick={() => setStatus(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="source-page-grid">
          {pages.length ? (
            pages.map(p => (
              <button className="source-page-card" key={p.id} onClick={() => openSource(p.id)}>
                <div className="source-thumb">
                  <img loading="lazy" src={p.image} alt={`卷${p.volume}第${p.pageNo}页原谱`} />
                  <span>第 {String(p.pageNo).padStart(2, "0")} 页</span>
                </div>
                <div className="source-page-caption">
                  <span>{p.title}</span>
                  <Badge status={p.status} />
                </div>
              </button>
            ))
          ) : (
            <EmptyState
              title={data.pages.length ? "本册暂无此状态的谱页" : "尚未上传老谱扫描件"}
              description={data.pages.length ? "切换状态筛选，继续翻阅老谱。" : "点击右上角「上传谱页」批量存档老谱照片。"}
            />
          )}
        </div>
      </div>

      <div className="info-callout">
        <BookOpen size={20} />
        <div>
          <strong>原图不可变，记载有出处。</strong>
          <p>每个已校对的人物都关联原谱页。点击谱页，可以将原图、照录文字与族人条目并排核对。</p>
        </div>
      </div>
    </div>
  );
}

export function KinshipCalculator() {
  const { people, me, openPerson, openShare, openIdentity } = useArchive();
  const [from, setFrom] = useState(me || people[0]?.id || "");
  const [to, setTo] = useState(people[1]?.id || people[0]?.id || "");

  useEffect(() => {
    if (!from && people[0]) setFrom(people[0].id);
    if (!to && people[1]) setTo(people[1].id);
  }, [people, from, to]);

  if (people.length < 2) {
    return (
      <div className="page-enter">
        <div className="page-title-row">
          <div>
            <div className="eyebrow">CONNECTED BY FAMILY</div>
            <h1>称谓计算<span className="title-dot">·</span><span className="title-fine">亲缘有远近，称呼有温度</span></h1>
          </div>
          <button className="button button-secondary" onClick={openIdentity}>
            <UserRound size={16} />设置「我是谁」
          </button>
        </div>
        <div className="card">
          <div className="empty-state">
            <Users size={32} />
            <h3>亲缘称谓查询</h3>
            <p>家谱中录入两位或更多家族成员后，可在此查询彼此的白话称谓与世系亲缘路径。</p>
          </div>
        </div>
      </div>
    );
  }

  const a = people.find(p => p.id === from);
  const b = people.find(p => p.id === to);
  const forward = kinship(from, to, people);
  const backward = kinship(to, from, people);

  return (
    <div className="page-enter">
      <div className="page-title-row">
        <div>
          <div className="eyebrow">CONNECTED BY FAMILY</div>
          <h1>称谓计算<span className="title-dot">·</span><span className="title-fine">亲缘有远近，称呼有温度</span></h1>
        </div>
        <button className="button button-secondary" onClick={openIdentity}>
          <UserRound size={16} />设置「我是谁」
        </button>
      </div>

      <div className="kinship-layout">
        <section className="card kinship-calculator">
          <div className="kinship-intro-icon"><Users size={30} /></div>
          <h2>我们，该怎么称呼彼此？</h2>
          <p>选两位家人，沿着家谱找一找你们之间的联系。</p>
          <div className="kinship-selects">
            <label>
              <span>从这位家人出发</span>
              <select value={from} onChange={e => setFrom(e.target.value)}>
                {people.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {generationLabel(p.generation)}{p.id === me ? "（我）" : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="swap-button"
              aria-label="互换两位家人"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
            >
              <ArrowDownUp size={21} />
            </button>
            <label>
              <span>想知道这位的称呼</span>
              <select value={to} onChange={e => setTo(e.target.value)}>
                {people.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {generationLabel(p.generation)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="kinship-result">
            <div>
              <span>{a?.name} 应称 {b?.name}</span>
              <strong>{forward.title || "亲缘路径见下方"}</strong>
            </div>
            <i />
            <div>
              <span>{b?.name} 应称 {a?.name}</span>
              <strong>{backward.title || "亲缘路径见下方"}</strong>
            </div>
          </div>

          <div className="relationship-path">
            <span>亲缘路径</span>
            <p>{a?.name}的{forward.path}</p>
            <div>
              {forward.ids.map((id, i) => {
                const p = people.find(item => item.id === id);
                return (
                  p && (
                    <div className="path-step" key={id}>
                      {i > 0 && <ChevronRight size={14} />}
                      <button onClick={() => openPerson(id)}>
                        <Avatar name={p.name} size="small" />
                        {p.name}
                      </button>
                    </div>
                  )
                );
              })}
            </div>
          </div>

          <button className="button button-primary full-width" onClick={() => b && openShare(b)}>
            存下这份亲缘<Download size={16} />
          </button>
        </section>

        <aside className="kinship-aside">
          <div className="quote-card">
            <span>亲</span>
            <h3>血脉相连，<br />不止一个称呼。</h3>
            <p>不论远近，不分四方。<br />找到彼此，就是一家人。</p>
            <GitBranch size={66} />
          </div>
          <div className="info-callout">
            <FileText size={19} />
            <div>
              <strong>不确定的称谓，我们不猜。</strong>
              <p>目前覆盖直系与常见父系旁系。未覆盖的关系，完整显示白话亲缘路径，绝不臆造称谓。长幼按已录生年判断，同年不强分长幼。</p>
            </div>
          </div>
          <p className="privacy-note">「我是谁」仅保存在当前浏览器，不会上传。</p>
        </aside>
      </div>
    </div>
  );
}

export function FamilyBook() {
  const { people, data } = useArchive();
  const [generation, setGeneration] = useState("");

  const chapters = useMemo(() => {
    const result: { generation: number; persons: Person[] }[] = [];
    for (const g of [...new Set(people.map(p => p.generation))].sort((a, b) => a - b)) {
      if (generation && g !== Number(generation)) continue;
      const group = people.filter(p => p.generation === g);
      for (let i = 0; i < group.length; i += 6) {
        result.push({ generation: g, persons: group.slice(i, i + 6) });
      }
    }
    return result;
  }, [people, generation]);

  return (
    <div className="page-enter book-screen">
      <div className="page-title-row no-print">
        <div>
          <div className="eyebrow">A LEGACY IN PRINT</div>
          <h1>家族谱书<span className="title-dot">·</span><span className="title-fine">把来处，装订成册</span></h1>
        </div>
        <button className="button button-primary" onClick={() => window.print()}>
          <Printer size={16} />打印 / 存为 PDF
        </button>
      </div>

      <div className="book-toolbar card no-print">
        <span><BookOpen size={17} />欧式行传体 · A4 纵向 · 共 {chapters.length + 2} 页</span>
        <select value={generation} onChange={e => setGeneration(e.target.value)}>
          <option value="">全部世代</option>
          {[...new Set(people.map(p => p.generation))].map(g => (
            <option key={g} value={g}>{generationLabel(g)}</option>
          ))}
        </select>
        <p>打印时请选择 A4、关闭浏览器页眉页脚，并开启背景图形。</p>
      </div>

      <div className="book-pages">
        <article className="print-page book-cover">
          <span className="book-cover-top">李 氏 家 乘</span>
          <div className="book-cover-title">李氏家谱</div>
          <div className="book-cover-seal">李氏<br />家乘</div>
          <p>木有本 · 水有源 · 人有祖</p>
          <span className="book-cover-bottom">公元二〇二六年 · 重修数字谱</span>
          <span className="printed-page-number">1</span>
        </article>

        <article className="print-page book-index">
          <div className="print-running-header">李氏家谱 · 目录</div>
          <h2>世代目录</h2>
          <p>一脉流芳，世泽绵长。</p>
          {chapters.map(
            (chapter, i) =>
              (i === 0 || chapters[i - 1].generation !== chapter.generation) && (
                <div key={i}>
                  <span>{generationLabel(chapter.generation)}</span>
                  <i />
                  <span>{i + 3}</span>
                </div>
              )
          )}
          <span className="printed-page-number">2</span>
        </article>

        {chapters.map((chapter, i) => (
          <article className="print-page book-chapter" key={i}>
            <div className="print-running-header">李氏家谱 · 世系行传</div>
            <h2>{generationLabel(chapter.generation)}<small>世泽绵延 · 行传</small></h2>
            {chapter.persons.map(p => (
              <section className="book-person" key={p.id}>
                <div>
                  <h3>{p.name}</h3>
                  <span>
                    {p.generationName ? formatGenerationName(p.generationName) : p.gender === "female" ? "女" : "男"}
                  </span>
                  <span>{lifeYears(p)}</span>
                </div>
                <p>
                  {p.fatherId
                    ? `${people.find(f => f.id === p.fatherId)?.name || "失考"}之${p.gender === "female" ? "女" : "子"}。`
                    : "本支始迁祖。"}
                  {(people.find(m => m.id === p.motherId)?.name || p.motherName)
                    ? `生母：${people.find(m => m.id === p.motherId)?.name || p.motherName}。`
                    : ""}
                  {p.spouse ? `配偶：${p.spouse}。` : ""}
                  {p.nativePlace ? `籍贯${p.nativePlace}。` : ""}
                  {p.biography ? p.biography.slice(0, 125) : "生平事迹待考补。"}
                </p>
                {p.sourcePageId && (
                  <small>
                    出处：{data.pages.find(s => s.id === p.sourcePageId)?.volume || 1} 册 · 第{" "}
                    {data.pages.find(s => s.id === p.sourcePageId)?.pageNo || 1} 页
                  </small>
                )}
              </section>
            ))}
            <span className="printed-page-number">{i + 3}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
