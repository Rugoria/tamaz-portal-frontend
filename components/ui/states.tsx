"use client";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import type { ReactNode } from "react";
import { Button } from "./Button";

export function EmptyState({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  const translate = useT();
  return (
    <div className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
      <div className="text-lg font-semibold">{translate(title)}</div>
      {text && <div className="mx-auto mt-1.5 max-w-md text-muted">{translate(text)}</div>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function ErrorState({ title, onRetry, hint = "Check your connection and try again." }: { title: string; onRetry?: () => void; hint?: string | null }) {
  const translate = useT();
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-line bg-red-soft px-6 py-5">
      <div>
        <div className="font-semibold text-red">{translate(title)}</div>
        {hint && <div className="mt-1 text-sm">{translate(hint)}</div>}
      </div>
      {onRetry && <Button onClick={onRetry}>{translate("Try again")}</Button>}
    </div>
  );
}

/** Pulsing placeholder rows while a list loads. */
export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  const translate = useT();
  return (
    <div className="tz-pulse rounded-xl border border-line bg-surface px-5 py-2" aria-busy="true" aria-label={translate("Loading")}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-[52px] items-center gap-5 border-b border-surface-2 last:border-b-0">
          <div className="h-3.5 w-[14%] rounded bg-surface-2" />
          <div className="h-3.5 w-1/5 rounded bg-surface-2" />
          <div className="h-[22px] w-[90px] rounded-full bg-surface-2" />
          <div className="h-3.5 w-1/4 rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonBlock({ height = 200 }: { height?: number }) {
  const translate = useT();
  return <div className="tz-pulse rounded-xl bg-surface-2" style={{ height }} aria-busy="true" aria-label={translate("Loading")} />;
}

/** The yellow "Pending client decision" tag from the design. Anything carrying it is preview-only. */
export function PendingTag({ text = "Pending client decision" }: { text?: string }) {
  const translate = useT();
  return <span className="ms-2 rounded bg-pending-bg px-2 py-0.5 align-middle text-xs text-pending-ink">{translate(text)}</span>;
}

/** A note shown on a preview-only screen so nobody mistakes it for working data. */
export function PreviewNote({ children }: { children: ReactNode }) {
  const translate = useT();
  return (
    <div className="rounded-lg border border-amber-line bg-amber-soft px-4 py-2.5 text-sm text-pending-ink">
      <PendingTag text={translate("Preview only")} /> {children}
    </div>
  );
}

/**
 * Error for a page that loads one item (a case, an account). A 404 or 403 means the item is missing or not the
 * viewer's, which is not a connection problem, so it gets no retry. Anything else keeps the connection message.
 */
export function LoadError({ error, what, onRetry, backHref, backLabel }: { error: { status?: number } | undefined; what: string; onRetry: () => void; backHref: string; backLabel: string }) {
  const translate = useT();
  if (error?.status === 404 || error?.status === 403) {
    return (
      <div className="flex flex-col gap-3">
        <ErrorState title={translate("This {v0} doesn't exist or you can't open it.", {v0: translate(what)})} hint={translate("It may have been removed, or the link is wrong.")} />
        <Link href={backHref} className="flex min-h-11 items-center text-sm no-underline">
          ← {translate(backLabel)}
        </Link>
      </div>
    );
  }
  return <ErrorState title={translate("We couldn't load this {v0}.", {v0: translate(what)})} onRetry={onRetry} />;
}
