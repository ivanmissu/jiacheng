"use client";
import { useMemo } from "react";
import { ArrowRight, BookOpen, CalendarDays, ChevronRight, Clock3, GitBranch, MapPin, Plus, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useArchive } from "./archive-context";
import { Avatar, SectionHeading, StaticImage } from "./ui";
import { generationLabel, lifeYears } from "@/lib/types";
import { TreePreview } from "./family-tree";
import { Solar } from "lunar-javascript";

export function Overview() {
  const { data, people, navigate, openPerson, openIdentity, openEditor, requestAdmin } = useArchive();
  const generations = people.length ? Math.max(...people.map(p => p.generation)) : 0;
  const verified = data.pages.filter(p => p.status === "verified").length;
  const recorded = data.pages.filter(p => p.status === "recorded").length;
  const volumes = new Set(data.pages.map(p => p.volume)).size;

  const years = useMemo(() => {
    const valid = people
      .map(p => Number(p.birth?.solar?.slice(0, 4)))
      .filter(y => Number.isFinite(y) && y > 0);
    if (!valid.length) return { value: 0, sub: "待录入生辰年份" };
    const min = Math.min(...valid);
    const span = Math.max(1, new Date().getFullYear() - min);
    return { value: span, sub: `自公元 ${min} 年至今` };
  }, [people]);

  const { solarDateStr, lunarDateStr } = useMemo(() => {
    const now = new Date();
    const solarStr = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`;
    try {
      const lunar = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate()).getLunar();
      const lunarStr = `${lunar.getYearInGanZhi()}年 · ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
      return { solarDateStr: solarStr, lunarDateStr: lunarStr };
    } catch {
      return { solarDateStr: solarStr, lunarDateStr: "吉日良辰" };
    }
  }, []);

  const stats = [
    { label: "家族成员", value: people.length, unit: "位", sub: people.length ? "每一个名字，都是一段故事" : "点击开始录入首位族人", icon: Users, tone: "sage" },
    { label: "世代传承", value: generations, unit: "世", sub: generations ? "枝繁叶茂，绵延不息" : "待编修世代", icon: GitBranch, tone: "sand" },
    { label: "家族春秋", value: years.value, unit: "年", sub: years.sub, icon: CalendarDays, tone: "blue" },
    { label: "老谱珍藏", value: volumes, unit: "册", sub: data.pages.length ? `共 ${data.pages.length} 页，字字皆有来处` : "可在老谱档案中上传影像", icon: BookOpen, tone: "rose" },
  ];

  const storyPeople = useMemo(() => {
    const withBio = people.filter(p => p.biography && p.biography.trim()).slice(0, 3);
    return withBio.length ? withBio : people.slice(0, 3);
  }, [people]);

  const progressPercent = data.pages.length ? Math.round((verified / data.pages.length) * 100) : 0;
  const recordedPercent = data.pages.length ? Math.round((recorded / data.pages.length) * 100) : 0;

  return (
    <div className="overview-page page-enter">
      <div className="page-title-row">
        <div>
          <div className="eyebrow">FAMILY OVERVIEW</div>
          <h1>家谱总览<span className="title-dot">·</span><span className="title-fine">循根而来，向远而生</span></h1>
        </div>
        <div className="today" suppressHydrationWarning>
          <CalendarDays size={15} />
          <span suppressHydrationWarning>{solarDateStr}</span>
          <span className="lunar-date" suppressHydrationWarning>{lunarDateStr}</span>
        </div>
      </div>

      <section className="heritage-hero">
        <StaticImage asset="familyLandscape" alt="青山秀水，木本水源" className="hero-art" priority />
        <div className="hero-wash" />
        <div className="hero-content">
          <span className="hero-eyebrow"><i />李氏一脉 · 世代相承</span>
          <h2>一部家谱，<br />让思念有根可寻。</h2>
          <p>记下先人的名字，也记下我们的来处。<br className="desktop-br" />让散落四方的家人，在这里重新相连。</p>
          {people.length === 0 ? (
            <button className="button button-primary hero-button" onClick={() => openEditor({ generation: 1 })}>
              <Plus size={16} />录入第一代始祖<ArrowRight size={16} />
            </button>
          ) : (
            <button className="button button-primary hero-button" onClick={() => navigate("tree")}>
              <GitBranch size={16} />寻访家族世系<ArrowRight size={16} />
            </button>
          )}
        </div>
        <div className="hero-seal">慎终<br />追远</div>
        <div className="hero-caption"><MapPin size={12} />源远流长 · 耕读传家</div>
      </section>

      <section className="stats-grid" aria-label="家谱概况">
        {stats.map(stat => (
          <div className="stat-card" key={stat.label}>
            <div>
              <p className="stat-label">{stat.label}</p>
              <div className="stat-number">{stat.value.toLocaleString()}<span>{stat.unit}</span></div>
              <p className="stat-sub">{stat.sub}</p>
            </div>
            <span className={`stat-icon ${stat.tone}`}><stat.icon size={21} /></span>
          </div>
        ))}
      </section>

      <div className="overview-main-grid">
        <section className="card tree-overview">
          <SectionHeading
            title="世系一览"
            subtitle="根脉有迹，世代相承"
            action="完整世系"
            onAction={() => navigate("tree")}
            icon={<GitBranch size={18} />}
          />
          <div className="tree-caption">
            <span><i className="little-green-dot" />李氏世系图谱</span>
            <span>{people.length ? `共 ${people.length} 位族人` : "待录入"}</span>
          </div>
          <TreePreview />
          <div className="tree-preview-footer">
            <span><i />点击姓名，读一段家族故事</span>
            <button onClick={openIdentity}>找到我在家谱中的位置<ArrowRight size={13} /></button>
          </div>
        </section>

        <section className="card digitization-card">
          <SectionHeading title="老谱数字化" icon={<BookOpen size={18} />} />
          <div className="old-book-photo">
            <StaticImage asset="oldGenealogy" alt="线装老谱与泛黄的书页" />
            <span>李氏家乘 · 老谱珍藏</span>
          </div>
          <div className="digital-progress-title">
            <div><span className="little-green-dot" />一点一滴，续写家乘</div>
            <strong>{progressPercent}<small>%</small></strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progressPercent}%` }} />
            <span className="recorded-progress" style={{ width: `${recordedPercent}%` }} />
          </div>
          <div className="progress-legend">
            <span><i className="verified-dot" />已校 {verified} 页</span>
            <span><i className="recorded-dot" />已录 {recorded} 页</span>
            <span><i />未录 {Math.max(0, data.pages.length - verified - recorded)} 页</span>
          </div>
          <button className="continue-button" onClick={() => requestAdmin("workspace")}>
            <span>进入老谱编修工作台</span><ArrowRight size={15} />
          </button>
        </section>
      </div>

      <div className="overview-bottom-grid">
        <section className="card stories-card">
          <SectionHeading
            title="名在谱中，人在故事里"
            subtitle="读懂一个人，也就读懂一段家族的岁月"
            action="族人名录"
            onAction={() => navigate("members")}
          />
          {storyPeople.length ? (
            <div className="story-grid">
              {storyPeople.map((p, i) => (
                <button className="person-story" key={p.id} onClick={() => openPerson(p.id)}>
                  <div className={`story-avatar story-avatar-${i}`}>
                    <Avatar name={p.name} size="large" />
                    <span>{generationLabel(p.generation)}</span>
                  </div>
                  <h3>{p.name}<span>{p.courtesyName && `字 ${p.courtesyName}`}</span></h3>
                  <p className="story-years">{lifeYears(p)}</p>
                  <p className="story-excerpt">{p.biography ? `${p.biography.slice(0, 42)}……` : "生平事迹待考补。"}</p>
                  <span className="story-link">读其生平 <ArrowRight size={13} /></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "32px 16px" }}>
              <p className="muted">家谱中尚无族人记录。录入族人小传后，将在此展示长辈的故事。</p>
              <button
                className="button button-secondary"
                style={{ marginTop: 12 }}
                onClick={() => openEditor({ generation: 1 })}
              >
                <Plus size={15} />录入第一位族人
              </button>
            </div>
          )}
        </section>

        <section className="card recent-card">
          <SectionHeading title="家谱新记" icon={<Clock3 size={17} />} />
          {data.revisions.length ? (
            <div className="recent-list">
              {data.revisions.slice(0, 3).map((r, i) => (
                <button key={r.id} className="recent-item" onClick={() => r.personId ? openPerson(r.personId) : navigate("archives")}>
                  <span className={`recent-dot dot-${i}`} />
                  <div>
                    <span className="recent-time">{new Date(r.createdAt).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}</span>
                    <p>{r.action}<strong>{r.name}</strong></p>
                    <span className="recent-more">每一次补录，都让来处更清晰</span>
                  </div>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "24px 16px" }}>
              <p className="muted">暂无编修记录。每一次新增或校对都会自动留痕。</p>
            </div>
          )}
          <div className="quiet-note"><ShieldCheck size={14} />每一份记载，都值得妥善珍藏</div>
        </section>
      </div>

      <section className="kinship-banner">
        <span className="kinship-banner-icon"><Sparkles size={24} /></span>
        <div>
          <h3>见面之前，先把称呼记在心里。</h3>
          <p>选定「我是谁」，让家谱告诉你，眼前的亲人该怎么称呼。</p>
        </div>
        <button onClick={() => navigate("kinship")}>查一查亲人称谓<ArrowRight size={16} /></button>
      </section>

      <footer className="page-footer">
        <span>一字一句，皆为来处。</span>
        <span>本谱仅供族内阅览 <i /> 李氏家谱 · 世代相传</span>
      </footer>
    </div>
  );
}
