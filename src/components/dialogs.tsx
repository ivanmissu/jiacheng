"use client";
import { useRef, useState, type FormEvent } from "react";
import { toPng } from "html-to-image";
import { ArrowRight, Check, Copy, Download, GitBranch, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { useArchive } from "./archive-context";
import { Avatar, EmptyState, Modal, StaticImage } from "./ui";
import { matchesPerson } from "./screens";
import { generationLabel, lifeYears, type Person } from "@/lib/types";

export function IdentityDialog({ onClose }: { onClose: () => void }) {
  const { people, me, setMe, toast } = useArchive();
  const [query, setQuery] = useState("");
  const filtered = people.filter(p => matchesPerson(p, query)).sort((a, b) => b.generation - a.generation);
  return (
    <Modal title="在家谱里，找到自己" subtitle="选定后，家谱会告诉你该如何称呼每位亲人。" onClose={onClose}>
      <div className="identity-privacy"><ShieldCheck size={16} />身份只保存在当前浏览器，不会上传。</div>
      <div className="search-field identity-search">
        <Search size={17} />
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索你的名字，或拼音首字母" />
      </div>
      <div className="identity-results">
        {filtered.length ? (
          filtered.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setMe(p.id);
                toast(`你好，${p.name}。已找到你在家谱中的位置。`);
                onClose();
              }}
            >
              <Avatar name={p.name} gender={p.gender} />
              <div>
                <strong>{p.name}</strong>
                <span>{generationLabel(p.generation)} · {lifeYears(p)}</span>
              </div>
              {me === p.id ? <Check size={18} /> : <ArrowRight size={16} />}
            </button>
          ))
        ) : (
          <EmptyState title={people.length ? "未找到该族人" : "家谱尚无记录"} description={people.length ? "请检查输入是否有误" : "请先由维护者录入族人条目"} />
        )}
      </div>
      <div className="identity-bottom">
        <p>找不到自己？请联系家谱维护者补录。</p>
        {me && (
          <button
            className="text-link"
            onClick={() => {
              setMe(null);
              toast("已清除本机身份设定");
              onClose();
            }}
          >
            清除当前身份
          </button>
        )}
      </div>
    </Modal>
  );
}

export function AdminDialog({ onClose, onSuccess, demo }: { onClose: () => void; onSuccess: () => Promise<void>; demo: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin", password }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败");
      setBusy(false);
    }
  }

  return (
    <Modal title="以维护者身份进入" subtitle="单人编修，守护一部家谱。" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="login-icon"><LockKeyhole size={30} /></div>
        {demo ? (
          <div className="demo-login-note">
            <strong>李氏家谱 · 维护者编修模式</strong>
            <p>当前未配置独立管理密码，可直接进入管理与编修。正式部署到生产环境（如 Cloudflare）时，建议在环境变量中配置 ADMIN_PASSWORD 口令。</p>
          </div>
        ) : (
          <label className="form-field">
            <span>独立管理口令</span>
            <input
              autoFocus
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="输入维护者专用口令"
              required
            />
          </label>
        )}
        {error && <p className="error-message">{error}</p>}
        <button className="button button-primary full-width" type="submit" disabled={busy}>
          {busy ? "正在验证…" : demo ? "进入编修工作台" : "验证并进入"}<ArrowRight size={16} />
        </button>
        <p className="login-footnote">
          <ShieldCheck size={13} />管理会话与访客会话独立，口令不会暴露给其他族人。
        </p>
      </form>
    </Modal>
  );
}

export function ShareDialog({ person, onClose }: { person?: Person; onClose: () => void }) {
  const { people, toast } = useArchive();
  const posterRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState("");
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/${person ? `#person/${person.id}` : "#overview"}`;

  async function generate() {
    if (!posterRef.current) return;
    setBusy(true);
    try {
      await document.fonts.ready;
      const url = await toPng(posterRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#f6f4ec",
        fontEmbedCSS: "",
      });
      setImage(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jiacheng-li-${person?.id || "family"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("长图已生成，可下载或长按图片保存");
    } catch {
      toast("当前浏览器无法生成图片，请直接截取预览保存", true);
    }
    setBusy(false);
  }

  const generations = people.length ? Math.max(...people.map(p => p.generation)) : 0;

  return (
    <Modal
      title={person ? "把一段生平，分享给家人" : "把一部家谱，带回家人身边"}
      subtitle="浏览器本地生成，不上传身份信息。"
      onClose={onClose}
      className="share-modal"
    >
      <div className="share-preview-wrap">
        {image ? (
          <img className="generated-share-image" src={image} alt="家谱分享长图，微信内可长按保存" />
        ) : (
          <div className="share-poster" ref={posterRef}>
            <div className="poster-brand">
              <span className="mini-brand-seal">李</span>李氏家乘<span>JIACHENG</span>
            </div>
            <StaticImage asset="familyLandscape" alt="家族故乡山水" className="poster-landscape" loading="eager" />
            <div className="poster-heading">
              <span>李氏一脉 · 世代相承</span>
              <h2>{person ? person.name : "木有本，水有源。"}</h2>
              <p>
                {person
                  ? `${generationLabel(person.generation)}${person.courtesyName ? ` · 字${person.courtesyName}` : ""}　${lifeYears(person)}`
                  : "一部家谱，让思念有根可寻。"}
              </p>
            </div>
            <div className="poster-body">
              {person ? (
                <>
                  <div className="poster-quote">
                    {person.biography?.slice(0, 150) || `${person.name}，${generationLabel(person.generation)}。一生的故事，待后人慢慢补录。`}
                  </div>
                  <div className="poster-person-chain">
                    <GitBranch size={17} />
                    <span>{people.find(p => p.id === person.fatherId)?.name || "始迁祖"}</span>
                    <ArrowRight size={14} />
                    <strong>{person.name}</strong>
                  </div>
                </>
              ) : (
                <>
                  <p className="poster-quote">
                    记下先人的名字，也记下我们的来处。<br />让散落四方的家人，重新相连。
                  </p>
                  <div className="poster-stat-row">
                    <div><strong>{people.length}</strong><span>位家人</span></div>
                    <div><strong>{generations}</strong><span>代传承</span></div>
                    <div><strong>绵延</strong><span>流长</span></div>
                  </div>
                </>
              )}
            </div>
            <div className="poster-footer">
              <span>一字一句，皆为来处。</span>
              <small>打开「李氏家谱」，寻访我们的家族故事</small>
              <div className="poster-bottom-seal">一脉<br />相承</div>
            </div>
          </div>
        )}
      </div>
      <div className="share-actions">
        <button
          className="button button-secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              toast("家谱链接已复制，分享时请另行告知家人访问码");
            } catch {
              toast("请从下方链接框手动复制");
            }
          }}
        >
          <Copy size={15} />复制链接
        </button>
        <button className="button button-primary" disabled={busy} onClick={() => void generate()}>
          <Download size={15} />{busy ? "正在生成…" : image ? "再次下载长图" : "保存分享长图"}
        </button>
      </div>
      <input className="share-link" readOnly value={link} aria-label="家谱分享链接" onFocus={e => e.target.select()} />
      <p className="share-footnote">微信内可长按生成的图片保存；生成失败时可直接截屏。</p>
    </Modal>
  );
}

export function SourceDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, people, openPerson, requestAdmin, setSourceId } = useArchive();
  const page = data.pages.find(p => p.id === id);
  const related = people.filter(p => p.sourcePageId === id);
  const [zoom, setZoom] = useState(false);
  if (!page) return null;
  return (
    <Modal
      title={`《李氏家谱》卷${page.volume} · 第${page.pageNo}页`}
      subtitle="原图与条目并排对照，让每一份记载都有出处。"
      onClose={onClose}
      wide
      className="source-modal"
    >
      <div className="source-compare">
        <div className={`source-compare-image ${zoom ? "zoomed" : ""}`}>
          <button onClick={() => setZoom(z => !z)} title="点击切换放大原图">
            <img src={page.image} alt={`卷${page.volume}第${page.pageNo}页扫描原图`} />
          </button>
        </div>
        <div className="source-compare-text">
          <span className="eyebrow">ORIGINAL RECORD</span>
          <h3>原文照录</h3>
          <p className="original-transcription">
            {page.transcription || related.map(p => p.original).filter(Boolean).join("\n\n") || "本页原文尚待照录。可从下方关联人物查看已整理的结构化条目。"}
          </p>
          <h3 className="source-related-heading">本页关联族人 <span>{related.length}</span></h3>
          {related.map(p => (
            <button className="source-related-person" key={p.id} onClick={() => openPerson(p.id)}>
              <Avatar name={p.name} size="small" />
              <div>
                <strong>{p.name}</strong>
                <span>{generationLabel(p.generation)} · {p.courtesyName || "字无考"}</span>
              </div>
              <ArrowRight size={15} />
            </button>
          ))}
          <button
            className="button button-secondary full-width"
            onClick={() => {
              setSourceId(page.id);
              onClose();
              requestAdmin("workspace");
            }}
          >
            在编修工作台打开<ArrowRight size={15} />
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function AccessGate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "visitor", password }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "访问失败");
      setBusy(false);
    }
  }

  return (
    <div className="access-page">
      <StaticImage asset="familyLandscape" alt="故乡山水" priority />
      <div className="access-card">
        <div className="access-logo">
          <span className="brand-seal">李氏</span>
          <h1>李氏家谱</h1>
          <span>JIACHENG · FAMILY ARCHIVE</span>
        </div>
        <h2>家人的故事，只说给家人听。</h2>
        <p>输入家族访问码，回到我们的家谱。</p>
        <form onSubmit={submit}>
          <label className="form-field">
            <span>家族访问码</span>
            <input
              type="password"
              value={password}
              autoFocus
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="请输入访问码"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="button button-primary full-width" disabled={busy}>
            {busy ? "正在验证…" : "走进家谱"}<ArrowRight size={16} />
          </button>
        </form>
        <small><ShieldCheck size={13} />全站会话保护 · 30 天内免重复输入</small>
      </div>
      <span className="access-footer">木有本，水有源。寻根问祖，亦是寻心安处。</span>
    </div>
  );
}
