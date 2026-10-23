"use client";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "@/lib/api";
import { useUnread } from "@/lib/unread";
import { accountFor } from "@/lib/routes";
import type { SessionUser } from "@/lib/types";
import { Icon, type ICONS } from "./Icon";
import { TimeZoneSync } from "./TimeZoneSync";
import {LanguageSelector} from '@/components/LanguageSelector';

export interface NavItem {
  href: string;
  label: string;
  icon?: keyof typeof ICONS;
  /** Which unread count puts a dot on this item. */
  dot?: "notifications" | "messages";
  /** Exact match only (for the Home / Overview links). */
  exact?: boolean;
}

export interface NavGroup {
  heading?: string;
  items: NavItem[];
}

function NavList({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const translate = useT();
  const pathname = usePathname();
  const unread = useUnread();
  return (
    <nav aria-label={translate("Main")} className="flex flex-col gap-0.5">
      {groups.map((g, gi) => (
        <div key={gi} className="mb-2.5 flex flex-col gap-0.5">
          {g.heading && <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-[.8px] text-muted">{translate(g.heading)}</div>}
          {g.items.map((i) => {
            const on = i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/");
            const hasDot = i.dot ? unread[i.dot] > 0 : false;
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={onNavigate}
                aria-current={on ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-lg px-3 no-underline ${on ? "bg-surface-2 font-semibold text-accent-deep" : "font-medium text-muted hover:bg-bg hover:text-ink"} ${!i.icon && !on ? "text-ink" : ""}`}
              >
                {i.icon && <Icon name={i.icon} />}
                <span className="flex-1">{translate(i.label)}</span>
                {hasDot && <span className="h-2 w-2 rounded-full bg-accent" aria-label={translate("Unread")} />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SidebarBody({ groups, user, brandBadge, onNavigate }: { groups: NavGroup[]; user: SessionUser; brandBadge?: string; onNavigate?: () => void }) {
  const translate = useT();
  return (
    <div className="flex h-full flex-col px-3 py-5">
      <div className="flex items-baseline gap-2 px-3 pb-5">
        <span className="text-2xl font-semibold">tamaz</span>
        {brandBadge && <span className="text-xs font-semibold uppercase tracking-[.8px] text-aqua">{translate(brandBadge)}</span>}
      </div>
      {/* The menu scrolls when it is taller than the screen; the person and Sign out stay pinned below it. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NavList groups={groups} onNavigate={onNavigate} />
      </div>
      <div className="shrink-0 border-t border-line px-3 pt-4">
        <div className="font-semibold">{user.fullName}</div>
        <div className="mt-0.5 break-all text-[13px] text-muted">{user.email}</div>
        <div className="mt-2 flex items-center gap-4">
          <Link href={accountFor(user.role)} onClick={onNavigate} className="flex h-11 items-center text-muted no-underline hover:text-ink">
            {translate("Account")}</Link>
          <button onClick={signOut} className="flex h-11 items-center text-muted hover:text-ink">
            {translate("Sign out")}</button>
        </div>
      </div>
    </div>
  );
}

/** Desktop sidebar plus the phone header with a slide-in drawer. `children` is the page. */
export function SidebarShell({
  groups,
  user,
  width = 240,
  brandBadge,
  children,
}: {
  groups: NavGroup[];
  user: SessionUser;
  width?: number;
  brandBadge?: string;
  children: ReactNode;
}) {
  const translate = useT();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Close the phone menu when the page changes (adjusting state while rendering, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex min-h-screen">
      <TimeZoneSync userKey={user.email} />
      <aside className="sticky top-0 hidden h-dvh flex-none border-r border-line bg-surface md:block" style={{ width }}>
        <SidebarBody groups={groups} user={user} brandBadge={brandBadge} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-line bg-surface px-1 md:hidden">
          <button onClick={() => setOpen(true)} aria-label={translate("Open menu")} className="flex h-11 w-11 items-center justify-center">
            <Icon name="menu" size={22} />
          </button>
          <span className="text-xl font-semibold">tamaz</span>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:p-8"><LanguageSelector/>{children}</main>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0" style={{ background: "rgba(11,31,58,.45)" }} onClick={() => setOpen(false)} />
          <div className="absolute start-0 top-0 h-full w-[290px] bg-surface" role="dialog" aria-modal="true" aria-label={translate("Menu")}>
            <SidebarBody groups={groups} user={user} brandBadge={brandBadge} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
