"use client";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { ClinicSummary, ConversationDto } from "@/lib/types";
import { Button, buttonClass } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";

export default function ClinicsPage() {
  const translate = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const term = query.trim();
  const { data, error, loading, reload } = useApi<ClinicSummary[]>(term ? `/clinics?search=${encodeURIComponent(term)}` : "/clinics");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function message(clinic: ClinicSummary) {
    setBusyId(clinic.id);
    setFailure(null);
    try {
      const c = await api<ConversationDto>("/chat/conversations", { method: "POST", body: { participantId: clinic.id } });
      router.push(`/customer/messages?c=${c.id}`);
    } catch (e) {
      setFailure(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5">
      <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Clinics")}</h1>

      <Input placeholder={translate("Search clinics by name")} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={translate("Search clinics")} className="max-w-[420px]" />

      {error && <ErrorState title={translate("We couldn't load the clinics.")} onRetry={reload} />}
      {failure && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-4 py-3 text-sm font-medium text-red">
          {translate(failure)}
        </div>
      )}
      {loading && <SkeletonRows rows={4} />}
      {!loading && !error && data?.length === 0 && (term ? <EmptyState title={translate("No clinics match.")} text={translate("Try a different name.")} /> : <EmptyState title={translate("No clinics yet.")} text={translate("Clinics will appear here once they join tamaz.")} />)}

      {!loading && !error && data && data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {data.map((c) => (
            <div key={c.id} className="flex flex-col gap-3 border-b border-line px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <span className="text-base font-semibold">{c.name}</span>
              <div className="flex gap-2.5 md:gap-3">
                <Button onClick={() => message(c)} loading={busyId === c.id} className="h-12 flex-1 border-line md:h-11 md:flex-none">
                  {translate("Message")}</Button>
                <Link href={`/customer/appointments/book?clinic=${c.id}`} className={buttonClass("secondary", "md", "h-12 flex-1 no-underline md:h-11 md:flex-none")}>
                  <span className="md:hidden">{translate("Book")}</span>
                  <span className="hidden md:inline">{translate("Book appointment")}</span>
                </Link>
              </div>
            </div>
          ))}
          <div className="px-6 py-3.5 text-sm text-muted">
            {translate("Showing 1 to ")}{data.length} {translate(" of ")}{data.length}
          </div>
        </div>
      )}
    </div>
  );
}
