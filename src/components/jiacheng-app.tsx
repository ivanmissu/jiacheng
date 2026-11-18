"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, Cloud, Database, FilePenLine, GitBranch, HeartHandshake, Home, LayoutDashboard, LockKeyhole, LogOut, Menu, Search, Settings2, Share2, ShieldCheck, Sprout, Users, X } from "lucide-react";
import { ArchiveContext, type PageKey } from "./archive-context";
import type { ArchiveData, Person } from "@/lib/types";
import { Overview } from "./overview";
import { FamilyTree } from "./family-tree";
import { Archives, FamilyBook, KinshipCalculator, Members, Timeline } from "./screens";
import { Workspace } from "./workspace";
import { Backups } from "./backups";
import { PersonDetail } from "./person-detail";
import { PersonEditor } from "./person-editor";
import { AdminDialog, IdentityDialog, ShareDialog, SourceDialog } from "./dialogs";
import { Modal } from "./ui";
const pageNames: Record<PageKey, string> = { overview: "家谱总览", tree: "世系图", members: "族人名录", timeline: "家族时间轴", archives: "老谱档案", kinship: "称谓计算", workspace: "老谱工作台", backups: "管理与备份", book: "家族谱书" };
const readingNav = [{ key: "overview", label: "家谱总览", icon: LayoutDashboard }, { key: "tree", label: "世系图", icon: GitBranch }, { key: "members", label: "族人名录", icon: Users }, { key: "timeline", label: "家族时间轴", icon: CalendarDays }, { key: "archives", label: "老谱档案", icon: BookOpen }] as const;
export default function JiachengApp({ initialData }: { initialData: ArchiveData }) {
  const [data, setData] = useState(initialData); const [page, setPage] = useState<PageKey>("overview");
  const [me, setMeState] = useState<string | null>(null); const [query, setQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null); const [editor, setEditor] = useState<Partial<Person> | null>(null);
  const [identityOpen, setIdentityOpen] = useState(false); const [adminOpen, setAdminOpen] = useState(false);
  const [share, setShare] = useState<{ person?: Person } | null>(null); const [source, setSource] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState("page-1-12"); const [mobileMenu, setMobileMenu] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false); const [prefaceOpen, setPrefaceOpen] = useState(false); const [treeMenuOpen, setTreeMenuOpen] = useState(false);
  const [pending, setPending] = useState<{ page?: PageKey; editor?: Partial<Person> }>({});
  const [notification, setNotification] = useState<{ id: number; message: string; error: boolean } | null>(null);
  const people = data.persons.filter(p => !p.deletedAt);
  const person = people.find(p => p.id === selectedPerson); const myPerson = people.find(p => p.id === me);
  const toast = useCallback((message: string, error = false) => setNotification({ id: Date.now(), message, error }), []);
  useEffect(() => { if (!notification) return; const timeout = setTimeout(() => setNotification(null), 4500); return () => clearTimeout(timeout); }, [notification]);
  useEffect(() => {
    try { const stored = localStorage.getItem("jiacheng-my-person"); if (stored && initialData.persons.some(p => p.id === stored && !p.deletedAt)) setMeState(stored); } catch { /* Browsers with blocked storage can still use the app. */ }
    const readHash = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (hash.startsWith("person/")) { setSelectedPerson(hash.slice(7)); setPage("overview"); }
      else if (hash in pageNames) setPage(hash as PageKey);
    };
    readHash(); window.addEventListener("hashchange", readHash); return () => window.removeEventListener("hashchange", readHash);
  }, [initialData.persons]);
  const setMe = useCallback((id: string | null) => { setMeState(id); try { if (id) localStorage.setItem("jiacheng-my-person", id); else localStorage.removeItem("jiacheng-my-person"); } catch { toast("当前浏览器禁止本地存储，身份仅在本次访问保留"); } }, [toast]);
  const navigate = useCallback((next: PageKey) => { setPage(next); setMobileMenu(false); window.history.replaceState(null, "", `#${next}`); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const openPerson = useCallback((id: string) => { setSource(null); setSelectedPerson(id); }, []);
  const openSource = useCallback((id: string) => { setSelectedPerson(null); setSource(id); }, []);
  const openShare = useCallback((p?: Person) => { setSelectedPerson(null); setShare({ person: p }); }, []);
  const openEditor = useCallback((p: Partial<Person> = {}) => { setSelectedPerson(null); if (data.role === "admin") setEditor(p); else { setPending({ editor: p }); setAdminOpen(true); } }, [data.role]);
  const requestAdmin = useCallback((next: PageKey = "workspace") => { setMobileMenu(false); if (data.role === "admin") navigate(next); else { setPending({ page: next }); setAdminOpen(true); } }, [data.role, navigate]);
  const mutate = useCallback(async (input: Record<string, unknown>, message = "已保存") => {
    try { const res = await fetch("/api/archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }); const result = await res.json(); if (!res.ok) throw new Error(result.error || "操作失败"); setData(result.archive); toast(message); return true; }
    catch (e) { toast(e instanceof Error ? e.message : "网络暂时不可用，请重试", true); return false; }
  }, [toast]);
  async function adminSuccess() {
    const response = await fetch("/api/archive"); if (!response.ok) throw new Error("管理会话验证失败，请重试");
    setData(await response.json()); setAdminOpen(false); toast("已进入维护者模式，编修记录会自动留存");
    if (pending.editor) setEditor(pending.editor); else if (pending.page) navigate(pending.page);
    setPending({});
  }
  async function logout() {
    try { await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); window.location.reload(); } catch { toast("退出失败，请重试", true); }
  }
  const closePerson = useCallback(() => setSelectedPerson(null), []); const closeSource = useCallback(() => setSource(null), []);
  const closeEditor = useCallback(() => setEditor(null), []); const closeShare = useCallback(() => setShare(null), []);
  const closeIdentity = useCallback(() => setIdentityOpen(false), []); const closeAdmin = useCallback(() => setAdminOpen(false), []);
  function renderPage() {
    if ((page === "workspace" || page === "backups") && data.role !== "admin") return <div className="card protected-page"><LockKeyhole size={34} /><h1>这一页，留给家谱的维护者。</h1><p>族人可以安心阅读，编修与备份需要独立管理身份。</p><button className="button button-primary" onClick={() => requestAdmin(page)}>以维护者身份进入<ArrowRight size={16} /></button></div>;
    switch (page) { case "tree": return <FamilyTree />; case "members": return <Members />; case "timeline": return <Timeline />; case "archives": return <Archives />; case "kinship": return <KinshipCalculator />; case "workspace": return <Workspace />; case "backups": return <Backups />; case "book": return <FamilyBook />; default: return <Overview />; }
  }
  return <ArchiveContext.Provider value={{ data, people, page, navigate, me, setMe, openIdentity: () => setIdentityOpen(true), openPerson, openEditor, openSource, openShare, requestAdmin, mutate, toast, query, setQuery, sourceId, setSourceId }}><div className="app-shell">
    {mobileMenu && <button className="sidebar-scrim" aria-label="关闭导航" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}><button className="brand" onClick={() => navigate("overview")} aria-label="家乘首页"><span className="brand-seal"><span>家</span><span>乘</span></span><span className="brand-wordmark"><strong>家乘<span>JIACHENG</span></strong><small>一家之史，一脉之承</small></span></button>
      <div className="family-switcher-wrap"><button className="family-switcher" onClick={() => setTreeMenuOpen(v => !v)} aria-expanded={treeMenuOpen}><span className="family-switcher-icon"><BookOpen size={19} /></span><span><strong>颍川陈氏宗谱</strong><small>颍川堂 · 安徽歙县</small></span><ChevronDown size={14} /></button>{treeMenuOpen && <div className="family-switcher-menu"><span>当前家谱</span><button onClick={() => { navigate("overview"); setTreeMenuOpen(false); }}><Check size={14} />颍川陈氏宗谱</button><button onClick={() => { setPrefaceOpen(true); setTreeMenuOpen(false); }}><BookOpen size={14} />阅读家谱序言</button></div>}</div>
      <div className="nav-group-label">阅 读 家 谱</div><nav className="primary-nav" aria-label="家谱导航">{readingNav.map(item => <button className={`nav-item ${page === item.key ? "active" : ""}`} onClick={() => navigate(item.key)} key={item.key}><item.icon size={18} /><span>{item.label}</span>{page === item.key && <ChevronRight size={14} className="nav-active-chevron" />}</button>)}</nav>
      <div className="nav-group-label tools-label">家 乘 工 具</div><nav className="primary-nav" aria-label="家谱工具"><button className={`nav-item ${page === "kinship" ? "active" : ""}`} onClick={() => navigate("kinship")}><HeartHandshake size={18} /><span>称谓计算</span></button><button className={`nav-item ${page === "book" ? "active" : ""}`} onClick={() => navigate("book")}><BookOpen size={18} /><span>家族谱书</span></button><button className={`nav-item ${page === "workspace" ? "active" : ""}`} onClick={() => requestAdmin("workspace")}><FilePenLine size={18} /><span>老谱工作台</span><span className="nav-small-label">编修</span></button></nav>
      <div className="sidebar-bottom"><div className="sidebar-quote"><Sprout size={64} /><span className="quote-tiny-line" /><h3>木有本，水有源。</h3><p>有谱可循，有家可归。</p><button onClick={() => setPrefaceOpen(true)}>读一读我们的家谱序<ArrowRight size={12} /></button></div><button className={`nav-item backup-nav ${page === "backups" ? "active" : ""}`} onClick={() => requestAdmin("backups")}><Database size={17} /><span>管理与备份</span><ShieldCheck size={13} className="backup-nav-shield" /></button><div className="sidebar-user"><span className="sidebar-user-icon">{data.role === "admin" ? <FilePenLine size={17} /> : <UserRoundIcon />}</span><div><strong>{data.role === "admin" ? "维护者模式" : "访客模式"}</strong><small><i />{data.role === "admin" ? "单人编修 · 自动留痕" : "家族专属 · 安心阅览"}</small></div><button className="icon-button" aria-label={data.role === "admin" ? "退出管理模式" : "进入管理模式"} onClick={() => data.role === "admin" ? void logout() : requestAdmin("workspace")}>{data.role === "admin" ? <LogOut size={16} /> : <Settings2 size={16} />}</button></div></div>
    </aside><div className="app-main"><header className="topbar"><div className="topbar-breadcrumb"><button className="icon-button mobile-menu-toggle" onClick={() => setMobileMenu(v => !v)} aria-label="打开导航"><Menu size={21} /></button><button className="breadcrumb-home" onClick={() => navigate("overview")} aria-label="返回总览"><Home size={15} /></button><ChevronRight size={12} /><button onClick={() => setPrefaceOpen(true)}>颍川陈氏</button><ChevronRight size={12} /><span>{pageNames[page]}</span></div><div className="topbar-actions"><div className="global-search"><Search size={15} /><input placeholder="寻一个名字…" aria-label="全站搜索族人" value={page === "members" ? query : ""} onChange={e => { setQuery(e.target.value); if (page !== "members") navigate("members"); }} /></div><span className="protected-status"><span className="little-green-dot" /><span>{data.demo ? "家族专属空间" : "会话已保护"}</span><LockKeyhole size={12} /></span><span className="topbar-divider" /><button className="identity-button" onClick={() => setIdentityOpen(true)}><span className="header-avatar">{myPerson ? myPerson.name.slice(-1) : <UserRoundIcon />}</span><span>{myPerson ? `我是 ${myPerson.name}` : "我是谁"}</span><ChevronDown size={13} /></button><button className="icon-button help-button" aria-label="使用帮助" onClick={() => setHelpOpen(true)}><CircleHelp size={18} /></button></div></header><main className={`content ${page === "workspace" ? "content-workspace" : ""}`}>{renderPage()}</main></div>
    <button className="floating-share" onClick={() => openShare()} aria-label="分享家谱"><Share2 size={18} /><span>分享家谱</span></button>
    {notification && <div className={`toast ${notification.error ? "toast-error" : ""}`} role="status">{notification.error ? <CircleHelp size={18} /> : <Check size={18} />}<span>{notification.message}</span><button aria-label="关闭提示" onClick={() => setNotification(null)}><X size={15} /></button></div>}
    {person && <PersonDetail person={person} onClose={closePerson} />}{editor && <PersonEditor key={editor.id || "new"} initial={editor} onClose={closeEditor} />}{identityOpen && <IdentityDialog onClose={closeIdentity} />}{adminOpen && <AdminDialog demo={data.demo} onClose={closeAdmin} onSuccess={adminSuccess} />}{share && <ShareDialog person={share.person} onClose={closeShare} />}{source && <SourceDialog id={source} onClose={closeSource} />}
    {helpOpen && <Modal title="从一个名字，走进家族" subtitle="家乘使用小记" onClose={() => setHelpOpen(false)}><div className="help-steps">{[{ n: "01", title: "先找到自己", text: "点击右上角「我是谁」，从家谱中选择你的名字。这个选择只保存在当前浏览器。" }, { n: "02", title: "顺着世系，认识家人", text: "展开世系图或搜索族人，点击名字读小传、看出处，也可以查双方的亲缘称谓。" }, { n: "03", title: "把故事，带回家人身边", text: "生成分享长图，或者打开「家族谱书」，通过浏览器打印成 PDF。" }, { n: "04", title: "让记载，有据可循", text: "维护者从「老谱工作台」逐页照录与校对，在「管理与备份」下载数据并定期演练恢复。" }].map(item => <div key={item.n}><span>{item.n}</span><div><h3>{item.title}</h3><p>{item.text}</p></div></div>)}</div><div className="form-section-note">原型中的人物、记载与老谱影像均为演示内容。未接入云盘、OSS 与自动备份，不应直接用于保存真实家族隐私。</div></Modal>}
    {prefaceOpen && <Modal title="颍川陈氏宗谱 · 序" subtitle="颍川堂 · 丙午年数字重录" onClose={() => setPrefaceOpen(false)}><div className="preface-text"><span className="preface-seal">根脉<br />永续</span><p>木之有本，水之有源，人之有祖，理一而已矣。</p><p>吾陈氏一脉，祖籍颍川。伯源公南迁徽州，卜居歙县呈坎，依山水而筑，耕读而传。自始迁以降，世代绵延，子孙或守故土，或远赴四方，虽行迹各异，根脉未尝稍离。</p><p>老谱一部，历经岁月，纸页渐黄。今将先人名讳、生卒行传，一字一句录于云端；亦将长辈口述、故乡影像，陆续补入。所录皆有所本，存疑不妄断，失考不强求。</p><p>愿后之览者，知来处，念亲恩，敦族谊。让每一个漂泊在外的家人，都能在此找到归途。</p><p className="preface-signature">陈氏后人 敬录<br />公元二〇二六年 · 丙午冬</p></div></Modal>}
  </div></ArchiveContext.Provider>;
}
function UserRoundIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="3.3" /><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2" /></svg>; }
