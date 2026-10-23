"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { useT } from "@/i18n/client";
import { useApi } from "@/lib/hooks";
import type { DoctorProfileDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ErrorState, SkeletonBlock } from "@/components/ui/states";
import { DetailsTab } from "@/components/profile/DetailsTab";
import { OfficesTab } from "@/components/profile/OfficesTab";
import { PreferencesTab } from "@/components/profile/PreferencesTab";

type Tab = "details" | "offices" | "prefs";

/** Offices and clinical preferences are saved for the person but not used when a case is sent yet (waiting on the client). */
const TABS: { key: Tab; label: string; pending: boolean }[] = [
  { key: "details", label: "Details", pending: false },
  { key: "offices", label: "Related offices", pending: true },
  { key: "prefs", label: "Clinical preferences", pending: true },
];

const PENDING_NOTE: Record<Exclude<Tab, "details">, string> = {
  offices: "Your offices are saved for you. They are not used when you send a case yet.",
  prefs: "Your choices are saved. They are not sent with a case yet.",
};

/** The profile of a clinic or a doctor: three tabs (a list on a wide screen, a select on a phone). */
export default function ProfilePage({ params }: { params: Promise<{ role: string }> }) {
  const translate = useT();
  const { role } = use(params);
  if (role !== "clinic" && role !== "doctor") notFound();

  const { data, error, loading, reload } = useApi<DoctorProfileDto>("/me/profile");
  if (loading) return <SkeletonBlock height={360} />;
  if (error || !data) return <ErrorState title={translate("We couldn't load your profile.")} onRetry={reload} />;
  return <ProfileScreen data={data} reload={reload} />;
}

function ProfileScreen({ data, reload }: { data: DoctorProfileDto; reload: () => Promise<unknown> }) {
  const translate = useT();
  const [tab, setTab] = useState<Tab>("details");
  const [editing, setEditing] = useState(!data.contactNumber);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Profile")}</h1>
        {tab === "details" && !editing && <Button onClick={() => setEditing(true)}>{translate("Edit profile")}</Button>}
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium md:hidden">
        {translate("Profile section")}
        <select value={tab} onChange={(e) => setTab(e.target.value as Tab)} className="h-11 rounded-lg border border-line bg-surface px-3 text-[15px] font-normal text-ink">
          {TABS.map((t) => (
            <option key={t.key} value={t.key}>
              {translate(t.label)}
              {t.pending ? ` (${translate("Pending client decision").toLowerCase()})` : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="grid items-start gap-6 md:grid-cols-[190px_minmax(0,1fr)] lg:grid-cols-[230px_minmax(0,1fr)]">
        <div role="tablist" aria-orientation="vertical" aria-label={translate("Profile section")} className="hidden flex-col gap-1 md:flex">
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.key)}
                className={`flex min-h-11 flex-col items-start gap-1 rounded-lg px-3 py-2 text-start ${on ? "bg-surface-2 font-semibold text-accent-deep" : "font-medium text-muted hover:bg-bg hover:text-ink"}`}
              >
                {translate(t.label)}
                {t.pending && <span className="rounded bg-pending-bg px-1.5 py-0.5 text-[11px] font-semibold text-pending-ink">{translate("Pending client decision")}</span>}
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 max-w-[760px] flex-col gap-4">
          {tab !== "details" && (
            <div className="flex flex-col items-start gap-1.5">
              <span className="rounded bg-pending-bg px-2 py-0.5 text-xs text-pending-ink">{translate("Pending client decision")}</span>
              <span className="text-sm text-muted">{translate(PENDING_NOTE[tab])}</span>
            </div>
          )}
          {tab === "details" && <DetailsTab data={data} reload={reload} editing={editing} setEditing={setEditing} />}
          {tab === "offices" && <OfficesTab />}
          {tab === "prefs" && <PreferencesTab />}
        </div>
      </div>
    </div>
  );
}
