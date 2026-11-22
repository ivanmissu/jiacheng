"use client";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GitBranch, List, LocateFixed, Minus, Plus, RotateCcw, UserPlus, ZoomIn } from "lucide-react";
import { useArchive } from "./archive-context";
import { generationLabel, lifeYears, type Person } from "@/lib/types";
import { Avatar } from "./ui";

export function TreePreview() {
  const { people, openPerson, openEditor } = useArchive();

  if (!people.length) {
    return (
      <div className="empty-state">
        <GitBranch size={25} />
        <h3>家谱世系待录入</h3>
        <p>录入第一位始祖后，世系图谱将自动在此呈现。</p>
        <button
          className="button button-secondary"
          style={{ marginTop: 12 }}
          onClick={() => openEditor({ generation: 1 })}
        >
          <Plus size={15} />录入第一代始祖
        </button>
      </div>
    );
  }

  // Find root ancestor with lowest generation
  const sorted = [...people].sort((a, b) => a.generation - b.generation);
  const root = sorted[0];

  const childrenByParent = new Map<string, Person[]>();
  for (const p of people) {
    if (p.fatherId) {
      const children = childrenByParent.get(p.fatherId) || [];
      children.push(p);
      childrenByParent.set(p.fatherId, children);
    }
  }

  // Preview is space-limited: at most 3 children per level, lines follow actual nodes.
  const gen2 = (childrenByParent.get(root.id) || []).slice(0, 3);
  const gen2Left = (i: number) =>
    gen2.length === 1 ? 50 : gen2.length === 2 ? 30 + i * 40 : 18 + i * 32;

  // Group third generation by parent so lines cluster under their own parent.
  const gen3ByParent = new Map<string, Person[]>();
  for (const parent of gen2) {
    const kids = (childrenByParent.get(parent.id) || []).slice(0, 2);
    if (kids.length) gen3ByParent.set(parent.id, kids);
  }
  const gen3 = [...gen3ByParent.values()].flat();

  const previewNodes: { person: Person; left: number; top: number; level: number }[] = [
    { person: root, left: 50, top: 7, level: 1 },
  ];

  gen2.forEach((p, i) => {
    previewNodes.push({ person: p, left: gen2Left(i), top: 83, level: 2 });
  });

  const gen3LeftById = new Map<string, number>();
  gen2.forEach((parent, pi) => {
    const kids = gen3ByParent.get(parent.id) || [];
    const parentLeft = gen2Left(pi);
    kids.forEach((p, i) => {
      const left =
        kids.length === 1
          ? parentLeft
          : Math.max(8, Math.min(92, parentLeft + (i === 0 ? -8 : 8)));
      gen3LeftById.set(p.id, left);
      previewNodes.push({ person: p, left, top: 161, level: 3 });
    });
  });

  // Draw lines dynamically: only for nodes actually shown (no extra lines for single child).
  const lineParts: string[] = [];
  if (gen2.length === 1) {
    lineParts.push("M50 44 V83");
  } else if (gen2.length > 1) {
    const xs = gen2.map((_, i) => gen2Left(i));
    lineParts.push("M50 44 V66");
    lineParts.push(`M${Math.min(...xs)} 66 H${Math.max(...xs)}`);
    for (const x of xs) lineParts.push(`M${x} 66 V83`);
  }
  gen2.forEach((parent, pi) => {
    const kids = gen3ByParent.get(parent.id) || [];
    if (!kids.length) return;
    const parentLeft = gen2Left(pi);
    const childXs = kids.map(k => gen3LeftById.get(k.id) ?? parentLeft);
    if (childXs.length === 1) {
      lineParts.push(`M${parentLeft} 120 V144 H${childXs[0]} V161`);
    } else {
      lineParts.push(`M${parentLeft} 120 V144`);
      lineParts.push(`M${Math.min(...childXs)} 144 H${Math.max(...childXs)}`);
      for (const x of childXs) lineParts.push(`M${x} 144 V161`);
    }
  });
  const linesD = lineParts.join(" ");

  return (
    <div className="tree-preview">
      <svg className="tree-preview-lines" viewBox="0 0 100 214" preserveAspectRatio="none" aria-hidden="true">
        {linesD && <path d={linesD} />}
      </svg>
      <span className="tree-generation generation-one">{generationLabel(root.generation)}</span>
      {gen2.length > 0 && <span className="tree-generation generation-two">{generationLabel(root.generation + 1)}</span>}
      {gen3.length > 0 && <span className="tree-generation generation-three">{generationLabel(root.generation + 2)}</span>}
      {previewNodes.map((item, i) => (
        <button
          key={item.person.id}
          className={`preview-node ${i === 0 ? "root-node" : ""} ${item.level > 2 ? "leaf-node" : ""}`}
          style={{ left: `${item.left}%`, top: item.top }}
          onClick={() => openPerson(item.person.id)}
        >
          <span className="node-mini-seal">
            {i === 0 ? "祖" : item.person.gender === "female" ? "女" : "李"}
          </span>
          <span>{item.person.name}</span>
        </button>
      ))}
    </div>
  );
}

type LayoutNode = { person: Person; x: number; y: number; parent: string | null };

export function FamilyTree() {
  const { people, openPerson, openEditor, me, openIdentity, navigate } = useArchive();

  const sortedPeople = useMemo(() => [...people].sort((a, b) => a.generation - b.generation), [people]);
  const defaultRootId = sortedPeople[0]?.id || "";

  const [rootId, setRootId] = useState(defaultRootId);
  // null = show all generations (有多少级显示多少级); number = limit to N generations
  const [depth, setDepth] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pan, setPan] = useState({ x: 0, y: 18 });
  const [viewport, setViewport] = useState({ width: 900, height: 580 });
  const [mode, setMode] = useState<"tree" | "list">("tree");
  const viewRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number; x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    if (!rootId && defaultRootId) {
      setRootId(defaultRootId);
    }
  }, [defaultRootId, rootId]);

  const root = people.find(p => p.id === rootId) || sortedPeople[0];

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const p of people) {
      if (p.fatherId) {
        const children = map.get(p.fatherId) || [];
        children.push(p);
        map.set(p.fatherId, children);
      }
    }
    return map;
  }, [people]);

  // Longest descendant chain from root (ignoring collapsed), so depth can show all.
  const maxDepth = useMemo(() => {
    if (!root) return 1;
    let max = 1;
    const seen = new Set<string>();
    const dfs = (person: Person, level: number) => {
      if (seen.has(person.id)) return;
      seen.add(person.id);
      max = Math.max(max, level);
      for (const c of childrenByParent.get(person.id) || []) dfs(c, level + 1);
    };
    dfs(root, 1);
    return max;
  }, [root, childrenByParent]);

  const effectiveDepth = depth === null ? maxDepth : Math.min(depth, maxDepth);

  // Switching branch shows all generations of the new branch by default.
  useEffect(() => {
    setDepth(null);
  }, [rootId]);

  // Keep a limited depth valid when the branch shrinks (e.g. members removed).
  useEffect(() => {
    if (depth !== null && depth > maxDepth) setDepth(null);
  }, [depth, maxDepth]);

  const layout = useMemo(() => {
    const result: LayoutNode[] = [];
    let leaf = 0;
    const visited = new Set<string>();
    const walk = (person: Person, level: number, parent: string | null): number => {
      if (visited.has(person.id)) return 90;
      visited.add(person.id);
      const children = level < effectiveDepth - 1 && !collapsed.has(person.id) ? childrenByParent.get(person.id) || [] : [];
      let x: number;
      if (!children.length) {
        x = leaf * 166 + 90;
        leaf++;
      } else {
        const xs = children.map(c => walk(c, level + 1, person.id));
        x = (xs[0] + xs[xs.length - 1]) / 2;
      }
      result.push({ person, x, y: level * 155 + 45, parent });
      return x;
    };
    if (root) walk(root, 0, null);
    const maxY = result.length ? Math.max(...result.map(n => n.y)) : 45;
    return { nodes: result, width: Math.max(leaf * 166 + 20, 700), height: maxY + 134 };
  }, [root, childrenByParent, effectiveDepth, collapsed]);

  useEffect(() => {
    const node = viewRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height })
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [mode]);

  const rootX = layout.nodes.find(n => n.person.id === root?.id)?.x || 90;

  useEffect(() => {
    if (root) {
      setScale(1);
      setPan({ x: viewport.width / 2 - rootX, y: 18 });
    }
  }, [rootId, effectiveDepth, viewport.width, rootX]);

  const nodes = new Map(layout.nodes.map(n => [n.person.id, n]));
  const bounds = {
    left: -pan.x / scale - 170,
    right: (viewport.width - pan.x) / scale + 170,
    top: -pan.y / scale - 140,
    bottom: (viewport.height - pan.y) / scale + 140,
  };
  const visibleNodes = layout.nodes.filter(
    n => n.x >= bounds.left && n.x <= bounds.right && n.y >= bounds.top && n.y <= bounds.bottom
  );
  const visibleLinks = layout.nodes.filter(n => {
    const parent = nodes.get(n.parent || "");
    return (
      parent &&
      Math.max(parent.x, n.x) >= bounds.left &&
      Math.min(parent.x, n.x) <= bounds.right &&
      n.y >= bounds.top &&
      parent.y <= bounds.bottom
    );
  });

  function reset() {
    if (!root) return;
    const r = nodes.get(root.id);
    setScale(1);
    setPan({ x: viewport.width / 2 - (r?.x || 0), y: 18 });
  }

  function zoomTo(next: number) {
    next = Math.max(0.35, Math.min(1.7, next));
    const ratio = next / scale;
    const x = viewport.width / 2;
    const y = viewport.height / 2;
    setPan({ x: x - (x - pan.x) * ratio, y: y - (y - pan.y) * ratio });
    setScale(next);
  }

  function focusMe() {
    if (!me) return openIdentity();
    const p = people.find(p => p.id === me);
    if (p) {
      setRootId(p.fatherId || p.id);
      setDepth(null);
      reset();
    }
  }

  function pointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const rect = e.currentTarget.getBoundingClientRect();
      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale,
        x: (a.x + b.x) / 2 - rect.left,
        y: (a.y + b.y) / 2 - rect.top,
        panX: pan.x,
        panY: pan.y,
      };
      drag.current = null;
    } else drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }

  function pointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const rect = e.currentTarget.getBoundingClientRect();
      const initial = pinch.current;
      const next = Math.max(
        0.35,
        Math.min(1.7, (initial.scale * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(initial.distance, 1))
      );
      const ratio = next / initial.scale;
      setPan({
        x: (a.x + b.x) / 2 - rect.left - (initial.x - initial.panX) * ratio,
        y: (a.y + b.y) / 2 - rect.top - (initial.y - initial.panY) * ratio,
      });
      setScale(next);
    } else if (drag.current) {
      setPan({
        x: drag.current.panX + e.clientX - drag.current.x,
        y: drag.current.panY + e.clientY - drag.current.y,
      });
    }
  }

  function pointerEnd(e: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    drag.current = null;
  }

  if (!people.length || !root) {
    return (
      <div className="page-enter">
        <div className="page-title-row">
          <div>
            <div className="eyebrow">OUR FAMILY TREE</div>
            <h1>世系图<span className="title-dot">·</span><span className="title-fine">一脉相承，枝叶相连</span></h1>
          </div>
          <button className="button button-primary" onClick={() => openEditor({ generation: 1 })}>
            <UserPlus size={16} />录入第一代始祖
          </button>
        </div>
        <div className="card">
          <div className="empty-state">
            <GitBranch size={32} />
            <h3>李氏家谱尚无记录</h3>
            <p>点击上方「录入第一代始祖」，开启李氏世系图谱。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-title-row">
        <div>
          <div className="eyebrow">OUR FAMILY TREE</div>
          <h1>世系图<span className="title-dot">·</span><span className="title-fine">一脉相承，枝叶相连</span></h1>
        </div>
        <button className="button button-primary" onClick={() => openEditor()}>
          <UserPlus size={16} />新增族人
        </button>
      </div>

      <div className="card full-tree-card">
        <div className="tree-toolbar">
          <div className="tree-filters">
            <label>
              起始先祖
              <select value={rootId} onChange={e => setRootId(e.target.value)}>
                {people.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {generationLabel(p.generation)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              显示
              <select
                value={depth === null ? "all" : String(effectiveDepth)}
                onChange={e => setDepth(e.target.value === "all" ? null : Number(e.target.value))}
              >
                <option value="all">全部（{maxDepth} 代）</option>
                {Array.from({ length: Math.max(0, maxDepth - 2) }, (_, i) => i + 2).map(n => (
                  <option key={n} value={n}>
                    {n} 代世系
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="tree-toolbar-actions">
            <button className="button button-ghost" onClick={focusMe}>
              <LocateFixed size={16} />定位到我
            </button>
            <div className="segmented">
              <button
                className={mode === "tree" ? "active" : ""}
                onClick={() => setMode("tree")}
                aria-label="图形模式"
              >
                <GitBranch size={16} />
              </button>
              <button
                className={mode === "list" ? "active" : ""}
                onClick={() => setMode("list")}
                aria-label="列表模式"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {mode === "list" ? (
          <div className="tree-list">
            {[...layout.nodes]
              .sort((a, b) => a.person.generation - b.person.generation)
              .map(n => (
                <button
                  key={n.person.id}
                  style={{ paddingLeft: (n.person.generation - root.generation) * 24 + 24 }}
                  onClick={() => openPerson(n.person.id)}
                >
                  <GitBranch size={15} />
                  <Avatar name={n.person.name} size="small" />
                  <strong>{n.person.name}</strong>
                  <span>{generationLabel(n.person.generation)}</span>
                  <span>{lifeYears(n.person)}</span>
                </button>
              ))}
          </div>
        ) : (
          <div
            className="tree-viewport"
            ref={viewRef}
            onWheel={e => {
              if (e.ctrlKey || e.metaKey) zoomTo(scale - e.deltaY * 0.004);
            }}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerEnd}
            onPointerCancel={pointerEnd}
          >
            <div
              className="tree-canvas"
              style={{
                width: layout.width,
                height: layout.height,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <svg width={layout.width} height={layout.height} className="full-tree-lines">
                {visibleLinks.map(n => {
                  const parent = nodes.get(n.parent!);
                  return parent && <path key={n.person.id} d={`M ${parent.x} ${parent.y + 94} V ${n.y - 30} H ${n.x} V ${n.y}`} />;
                })}
              </svg>
              {visibleNodes.map(({ person, x, y }) => (
                <div
                  key={person.id}
                  className={`full-tree-node ${person.id === me ? "is-me" : ""}`}
                  style={{ left: x - 68, top: y }}
                >
                  <button className="tree-person-button" onClick={() => openPerson(person.id)}>
                    <span className="node-gen">
                      {generationLabel(person.generation)}
                      {person.id === me && <b>我</b>}
                    </span>
                    <h3>{person.name}</h3>
                    <p>{lifeYears(person)}</p>
                  </button>
                  {childrenByParent.has(person.id) && (
                    <button
                      className="collapse-node"
                      title={collapsed.has(person.id) ? "展开后代" : "收起后代"}
                      onClick={() =>
                        setCollapsed(current => {
                          const next = new Set(current);
                          if (next.has(person.id)) next.delete(person.id);
                          else next.add(person.id);
                          return next;
                        })
                      }
                    >
                      {collapsed.has(person.id) ? <Plus size={12} /> : <Minus size={12} />}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="tree-map-label">
              <GitBranch size={17} />
              <span>{root?.name}支系</span>
              <small>李氏家谱</small>
            </div>
            <div className="zoom-controls">
              <button aria-label="放大" onClick={() => zoomTo(scale + 0.15)}>
                <Plus size={17} />
              </button>
              <span>{Math.round(scale * 100)}%</span>
              <button aria-label="缩小" onClick={() => zoomTo(scale - 0.15)}>
                <Minus size={17} />
              </button>
              <i />
              <button aria-label="重置视图" onClick={reset}>
                <RotateCcw size={16} />
              </button>
            </div>
            <div className="tree-navigation-hint">
              <ZoomIn size={13} />单指平移 · 双指缩放 · 点击人物读小传
            </div>
          </div>
        )}

        <div className="tree-bottom-note">
          <span>
            <i className="little-green-dot" />当前支系 {layout.nodes.length} 位族人 · {depth === null ? `全部 ${maxDepth} 代` : `${effectiveDepth} 代窗口（共 ${maxDepth} 代）`}
          </span>
          <button className="text-link" onClick={() => navigate("members")}>
            在名录中查找族人<List size={14} />
          </button>
        </div>
      </div>

      <div className="info-callout">
        <GitBranch size={20} />
        <div>
          <strong>从一人，找到一脉。</strong>
          <p>点击节点下方的圆钮展开或折叠后代。每一次向上追溯，都是与家族历史的重逢。</p>
        </div>
      </div>
    </div>
  );
}
