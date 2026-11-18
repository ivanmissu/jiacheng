"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { ArrowRight, X, Search } from "lucide-react";
import { statusLabels, type EntryStatus } from "@/lib/types";
export function Badge({ status, children }: { status?: EntryStatus; children?: ReactNode }) { return <span className={`badge ${status || "neutral"}`}><i />{children || (status && statusLabels[status])}</span>; }
export function Avatar({ name, gender = "male", size = "normal" }: { name: string; gender?: string; size?: "small" | "normal" | "large" }) { return <span className={`avatar avatar-${size} ${gender === "female" ? "female" : ""}`}>{name.slice(-1)}</span>; }
export function SectionHeading({ title, subtitle, action, onAction, icon }: { title: string; subtitle?: string; action?: string; onAction?: () => void; icon?: ReactNode }) {
  return <div className="section-heading"><div><h2>{icon}{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <button className="text-link" onClick={onAction}>{action}<ArrowRight size={14} /></button>}</div>;
}
export function Modal({ title, subtitle, onClose, children, wide = false, className = "" }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean; className?: string }) {
  const id = useId(); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = ref.current;
    node?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && node) {
        const focusable = node.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]');
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", key); previous?.focus(); };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className={`modal ${wide ? "modal-wide" : ""} ${className}`} role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} tabIndex={-1}><header className="modal-header"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="关闭" onClick={onClose}><X size={21} /></button></header><div className="modal-body">{children}</div></div></div>;
}
export function EmptyState({ title = "还没有找到相关记录", description = "试试其他名字、字辈或籍贯关键词。" }: { title?: string; description?: string }) { return <div className="empty-state"><Search size={30} /><h3>{title}</h3><p>{description}</p></div>; }
