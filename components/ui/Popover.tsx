"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A button that opens a small panel under it. Closes on Escape, on a click outside, and (optionally) when you pick something.
 * `children` can be a function that gets `close`, so a menu item can close the panel after it acts.
 */
export function Popover({
  trigger,
  children,
  align = "start",
  label,
  triggerClassName = "",
  width = 260,
}: {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "end";
  label: string;
  triggerClassName?: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)} className={triggerClassName}>
        {trigger}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={`absolute top-full z-40 mt-1.5 rounded-xl border border-line bg-surface p-2 shadow-[0_8px_24px_rgba(11,31,58,.14)] ${align === "end" ? "end-0" : "start-0"}`}
          style={{ width, maxWidth: "calc(100vw - 32px)" }}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

/** A row inside a popover menu. */
export function MenuItem({ children, onClick, active, danger, disabled }: { children: ReactNode; onClick?: () => void; active?: boolean; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-start text-[15px] disabled:text-muted/60 ${danger ? "text-red" : active ? "bg-accent-soft font-semibold text-accent-deep" : "text-ink hover:bg-bg"}`}
    >
      {children}
    </button>
  );
}
