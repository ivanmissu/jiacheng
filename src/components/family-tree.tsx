"use client";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GitBranch, List, LocateFixed, Minus, Plus, RotateCcw, UserPlus, ZoomIn } from "lucide-react";
import { useArchive } from "./archive-context";
import { generationLabel, lifeYears, type Person } from "@/lib/types";
import { Avatar } from "./ui";
export function TreePreview() {
  const { people, openPerson } = useArchive();
  const ids = ["p8", "p9", "p9b", "p9c", "p10", "p10b", "p10c", "p10d", "p10e", "p10f"];
  const positions = [[50, 7], [18, 83], [50, 83], [82, 83], [9, 161], [27, 161], [41, 161], [59, 161], [73, 161], [91, 161]];
  if (!people.some(p => p.id === "p8")) return <div className="empty-state"><GitBranch size={25} /><h3>此支暂不展示</h3><p>家族记载由维护者妥善保管。</p></div>;
  return <div className="tree-preview"><svg className="tree-preview-lines" viewBox="0 0 100 214" preserveAspectRatio="none" aria-hidden="true"><path d="M50 44 V66 M18 83 V66 H82 V83 M50 66 V83 M18 120 V144 M9 161 V144 H27 V161 M50 120 V144 M41 161 V144 H59 V161 M82 120 V144 M73 161 V144 H91 V161" /></svg><span className="tree-generation generation-one">八世</span><span className="tree-generation generation-two">九世</span><span className="tree-generation generation-three">十世</span>{ids.map((id, i) => { const p = people.find(p => p.id === id); return p && <button key={id} className={`preview-node ${i === 0 ? "root-node" : ""} ${i > 3 ? "leaf-node" : ""}`} style={{ left: `${positions[i][0]}%`, top: positions[i][1] }} onClick={() => openPerson(id)}><span className="node-mini-seal">{i === 0 ? "祖" : p.gender === "female" ? "女" : "陈"}</span><span>{p.name}</span></button>; })}</div>;
}
type LayoutNode = { person: Person; x: number; y: number; parent: string | null };
export function FamilyTree() {
  const { people, openPerson, openEditor, me, openIdentity, navigate } = useArchive();
  const [rootId, setRootId] = useState("p8"); const [depth, setDepth] = useState(3);
  const [scale, setScale] = useState(1); const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pan, setPan] = useState({ x: 0, y: 18 }); const [viewport, setViewport] = useState({ width: 900, height: 580 });
  const [mode, setMode] = useState<"tree" | "list">("tree");
  const viewRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const root = people.find(p => p.id === rootId) || people[0];
  const childrenByParent = useMemo(() => { const map = new Map<string, Person[]>(); for (const p of people) if (p.fatherId) { const children = map.get(p.fatherId) || []; children.push(p); map.set(p.fatherId, children); } return map; }, [people]);
  const layout = useMemo(() => {
    const result: LayoutNode[] = []; let leaf = 0; const visited = new Set<string>();
    const walk = (person: Person, level: number, parent: string | null): number => {
      if (visited.has(person.id)) return 90; visited.add(person.id);
      const children = level < depth - 1 && !collapsed.has(person.id) ? childrenByParent.get(person.id) || [] : [];
      let x: number;
      if (!children.length) { x = leaf * 166 + 90; leaf++; }
      else { const xs = children.map(c => walk(c, level + 1, person.id)); x = (xs[0] + xs[xs.length - 1]) / 2; }
      result.push({ person, x, y: level * 155 + 45, parent }); return x;
    };
    if (root) walk(root, 0, null);
    return { nodes: result, width: Math.max(leaf * 166 + 20, 700), height: depth * 155 + 80 };
  }, [root, childrenByParent, depth, collapsed]);
  useEffect(() => { const node = viewRef.current; if (!node) return; const observer = new ResizeObserver(([entry]) => setViewport({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(node); return () => observer.disconnect(); }, [mode]);
  const rootX = layout.nodes.find(n => n.person.id === root?.id)?.x || 90;
  useEffect(() => { if (root) { setScale(1); setPan({ x: viewport.width / 2 - rootX, y: 18 }); } }, [rootId, depth, viewport.width, rootX]);
  const nodes = new Map(layout.nodes.map(n => [n.person.id, n]));
  const bounds = { left: -pan.x / scale - 170, right: (viewport.width - pan.x) / scale + 170, top: -pan.y / scale - 140, bottom: (viewport.height - pan.y) / scale + 140 };
  const visibleNodes = layout.nodes.filter(n => n.x >= bounds.left && n.x <= bounds.right && n.y >= bounds.top && n.y <= bounds.bottom);
  const visibleLinks = layout.nodes.filter(n => { const parent = nodes.get(n.parent || ""); return parent && Math.max(parent.x, n.x) >= bounds.left && Math.min(parent.x, n.x) <= bounds.right && n.y >= bounds.top && parent.y <= bounds.bottom; });
  function reset() { const r = nodes.get(root.id); setScale(1); setPan({ x: viewport.width / 2 - (r?.x || 0), y: 18 }); }
  function zoomTo(next: number) { next = Math.max(.35, Math.min(1.7, next)); const ratio = next / scale; const x = viewport.width / 2, y = viewport.height / 2; setPan({ x: x - (x - pan.x) * ratio, y: y - (y - pan.y) * ratio }); setScale(next); }
  function focusMe() { if (!me) return openIdentity(); const p = people.find(p => p.id === me); if (p) { setRootId(p.fatherId || p.id); setDepth(3); reset(); } }
  function pointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; const rect = e.currentTarget.getBoundingClientRect(); pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale, x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top, panX: pan.x, panY: pan.y }; drag.current = null; }
    else drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }
  function pointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return; pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; const rect = e.currentTarget.getBoundingClientRect(); const initial = pinch.current; const next = Math.max(.35, Math.min(1.7, initial.scale * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(initial.distance, 1))); const ratio = next / initial.scale; setPan({ x: (a.x + b.x) / 2 - rect.left - (initial.x - initial.panX) * ratio, y: (a.y + b.y) / 2 - rect.top - (initial.y - initial.panY) * ratio }); setScale(next); }
    else if (drag.current) setPan({ x: drag.current.panX + e.clientX - drag.current.x, y: drag.current.panY + e.clientY - drag.current.y });
  }
  function pointerEnd(e: ReactPointerEvent<HTMLDivElement>) { pointers.current.delete(e.pointerId); pinch.current = null; drag.current = null; }
  if (!root) return <div className="page-enter"><div className="page-title-row"><div><div className="eyebrow">OUR FAMILY TREE</div><h1>世系图</h1></div></div><div className="card"><div className="empty-state"><GitBranch size={30} /><h3>此支暂不展示</h3><p>家族记载由维护者妥善保管。</p></div></div></div>;
  return <div className="page-enter"><div className="page-title-row"><div><div className="eyebrow">OUR FAMILY TREE</div><h1>世系图<span className="title-dot">·</span><span className="title-fine">一脉相承，枝叶相连</span></h1></div><button className="button button-primary" onClick={() => openEditor()}><UserPlus size={16} />新增族人</button></div>
    <div className="card full-tree-card"><div className="tree-toolbar"><div className="tree-filters"><label>起始先祖<select value={rootId} onChange={e => setRootId(e.target.value)}>{people.filter(p => p.generation < 13).map(p => <option key={p.id} value={p.id}>{p.name} · {generationLabel(p.generation)}</option>)}</select></label><label>显示<select value={depth} onChange={e => setDepth(Number(e.target.value))}>{[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} 代世系</option>)}</select></label></div><div className="tree-toolbar-actions"><button className="button button-ghost" onClick={focusMe}><LocateFixed size={16} />定位到我</button><div className="segmented"><button className={mode === "tree" ? "active" : ""} onClick={() => setMode("tree")} aria-label="图形模式"><GitBranch size={16} /></button><button className={mode === "list" ? "active" : ""} onClick={() => setMode("list")} aria-label="列表模式"><List size={16} /></button></div></div></div>
    {mode === "list" ? <div className="tree-list">{[...layout.nodes].sort((a, b) => a.person.generation - b.person.generation).map(n => <button key={n.person.id} style={{ paddingLeft: (n.person.generation - root.generation) * 24 + 24 }} onClick={() => openPerson(n.person.id)}><GitBranch size={15} /><Avatar name={n.person.name} size="small" /><strong>{n.person.name}</strong><span>{generationLabel(n.person.generation)}</span><span>{lifeYears(n.person)}</span></button>)}</div> : <div className="tree-viewport" ref={viewRef} onWheel={e => { if (e.ctrlKey || e.metaKey) zoomTo(scale - e.deltaY * .004); }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
      <div className="tree-canvas" style={{ width: layout.width, height: layout.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "top left" }}><svg width={layout.width} height={layout.height} className="full-tree-lines">{visibleLinks.map(n => { const parent = nodes.get(n.parent!); return parent && <path key={n.person.id} d={`M ${parent.x} ${parent.y + 94} V ${n.y - 30} H ${n.x} V ${n.y}`} />; })}</svg>{visibleNodes.map(({ person, x, y }) => <div key={person.id} className={`full-tree-node ${person.id === me ? "is-me" : ""}`} style={{ left: x - 68, top: y }}><button className="tree-person-button" onClick={() => openPerson(person.id)}><span className="node-gen">{generationLabel(person.generation)}{person.id === me && <b>我</b>}</span><h3>{person.name}</h3><p>{lifeYears(person)}</p></button>{childrenByParent.has(person.id) && <button className="collapse-node" title={collapsed.has(person.id) ? "展开后代" : "收起后代"} onClick={() => setCollapsed(current => { const next = new Set(current); if (next.has(person.id)) next.delete(person.id); else next.add(person.id); return next; })}>{collapsed.has(person.id) ? <Plus size={12} /> : <Minus size={12} />}</button>}</div>)}</div>
      <div className="tree-map-label"><GitBranch size={17} /><span>{root?.name}支系</span><small>颍川陈氏宗谱</small></div><div className="zoom-controls"><button aria-label="放大" onClick={() => zoomTo(scale + .15)}><Plus size={17} /></button><span>{Math.round(scale * 100)}%</span><button aria-label="缩小" onClick={() => zoomTo(scale - .15)}><Minus size={17} /></button><i /><button aria-label="重置视图" onClick={reset}><RotateCcw size={16} /></button></div><div className="tree-navigation-hint"><ZoomIn size={13} />单指平移 · 双指缩放 · 点击人物读小传</div>
    </div>}
    <div className="tree-bottom-note"><span><i className="little-green-dot" />当前支系 {layout.nodes.length} 位族人 · {depth} 代窗口</span><button className="text-link" onClick={() => navigate("members")}>在名录中查找族人<List size={14} /></button></div></div><div className="info-callout"><GitBranch size={20} /><div><strong>从一人，找到一脉。</strong><p>点击节点下方的圆钮展开或折叠后代。每一次向上追溯，都是与家族历史的重逢。</p></div></div>
  </div>;
}
