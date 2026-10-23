"use client";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { signOut } from "@/lib/api";
import { initials } from "@/lib/format";
import { useUnread } from "@/lib/unread";
import type { SessionUser } from "@/lib/types";
import { Icon, type ICONS } from "./Icon";
import { TimeZoneSync } from "./TimeZoneSync";
import {LanguageSelector} from '@/components/LanguageSelector';

const TABS: { href: string; label: string; short: string; icon: keyof typeof ICONS }[] = [
  { href: "/customer/aligners", label: "My aligners", short: "Aligners", icon: "homeSolid" },
  { href: "/customer/messages", label: "Messages", short: "Messages", icon: "messages" },
  { href: "/customer/clinics", label: "Clinics", short: "Clinics", icon: "clinic" },
  { href: "/customer/appointments", label: "Appointments", short: "Bookings", icon: "calendar" },
];

export function CustomerShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const translate = useT();
  const pathname = usePathname();
  const unread = useUnread();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabs = TABS;
  const isOn = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenu(false);
  }
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  const bell = (
    <Link
      href="/customer/notifications"
      aria-label={unread.notifications ? translate("Notifications, {v0} unread", {v0: unread.notifications}) : translate("Notifications")}
      className={`relative flex h-11 w-11 items-center justify-center rounded-lg border ${isOn("/customer/notifications") ? "border-accent" : "border-line"} bg-surface-2 text-ink`}
    >
      <Icon name="bell" />
      {unread.notifications > 0 && <span className="absolute end-2.5 top-2 h-[9px] w-[9px] rounded-full border-2 border-white bg-accent" />}
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <TimeZoneSync userKey={user.email} />
      {/* Desktop top bar */}
      <header className="relative hidden h-16 items-center gap-9 border-b border-line bg-surface px-10 md:flex">
        <span className="text-2xl font-semibold">tamaz</span>
        <nav aria-label={translate("Main")} className="flex h-full flex-1 gap-7">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex h-full items-center border-b-2 text-[15px] no-underline ${isOn(t.href) ? "border-accent font-semibold text-accent" : "border-transparent font-medium text-muted hover:text-ink"}`}
            >
              {translate(t.label)}
              {t.href.endsWith("messages") && unread.messages > 0 && <span className="ms-2 h-2 w-2 rounded-full bg-accent" aria-label={translate("Unread")} />}
            </Link>
          ))}
        </nav>
        {bell}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            aria-haspopup="menu"
            aria-expanded={menu}
            className={`flex h-11 items-center gap-2.5 rounded-lg border bg-surface ps-1.5 pe-2.5 ${menu ? "border-accent" : "border-line"}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-aqua-soft text-[13px] font-semibold text-aqua-deep">{initials(user.fullName)}</span>
            <span className="text-sm font-medium">{user.fullName}</span>
            <Icon name="chevronDown" size={14} />
          </button>
          {menu && (
            <div role="menu" className="absolute end-0 top-[52px] z-30 w-[280px] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_8px_24px_rgba(11,31,58,.12)]">
              <div className="border-b border-line p-4">
                <div className="font-semibold">{user.fullName}</div>
                <div className="mt-0.5 break-all text-sm text-muted">{user.email}</div>
              </div>
              <div className="p-1.5">
                <Link role="menuitem" href="/customer/account" onClick={() => setMenu(false)} className="flex h-11 w-full items-center rounded-lg px-2.5 text-[15px] text-ink no-underline hover:bg-bg hover:text-ink">
                  {translate("Account")}</Link>
                <button role="menuitem" onClick={signOut} className="flex h-11 w-full items-center rounded-lg px-2.5 text-[15px] hover:bg-bg">
                  {translate("Sign out")}</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Phone top bar */}
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-4 md:hidden">
        <span className="text-[22px] font-semibold">tamaz</span>
        <div className="flex items-center">
          <Link href="/customer/account" className="flex h-11 items-center px-2 text-sm text-muted no-underline">{translate("Account")}</Link>
          <button onClick={signOut} className="h-11 px-2 text-sm text-muted">
            {translate("Sign out")}</button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-12 md:pt-10"><LanguageSelector/>{children}</main>

      {/* Phone tab bar */}
      <nav aria-label={translate("Main")} className="fixed inset-x-0 bottom-0 z-30 flex h-[68px] border-t border-line bg-surface md:hidden">
        {[...tabs.map((t) => ({ href: t.href, label: t.short, icon: t.icon, dot: t.href.endsWith("messages") && unread.messages > 0 })), { href: "/customer/notifications", label: translate("Alerts"), icon: "bell" as const, dot: unread.notifications > 0 }].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={isOn(t.href) ? "page" : undefined}
            className={`relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-[3px] text-xs no-underline ${isOn(t.href) ? "font-semibold text-accent" : "font-medium text-muted"}`}
          >
            <Icon name={t.icon} size={22} />
            {translate(t.label)}
            {t.dot && <span className="absolute start-[calc(50%+6px)] top-2 h-2 w-2 rounded-full border-2 border-white bg-accent" />}
          </Link>
        ))}
      </nav>
    </div>
  );
}
