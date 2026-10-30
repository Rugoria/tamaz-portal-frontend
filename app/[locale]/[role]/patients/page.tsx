"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { api } from "@/lib/api";
import {surnameFirst} from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { CASE_CHIP } from "@/lib/status";
import { useDebounced } from "@/lib/useDebounced";
import type { CaseDto, Page, PatientDetailsDto, PatientSummary } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Field";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { FilterChips } from "@/components/ui/Tabs";
import { Icon } from "@/components/shell/Icon";
import { GridScreen } from "@/components/grid/GridScreen";
import { EditPatientDialog, NewPatientDialog } from "@/components/patient/PatientDialogs";

type Filter = "ALL" | "DRAFTS" | "ACTION" | "PROGRESS" | "FINISHED";

const LETTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PAGE_SIZE = 30;

export default function PatientsPage({ params }: { params: Promise<{ role: string }> }) {
  const {dateOnly} = useLocalizedFormats();
  const translate = useT();
  const { role } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const base = `/${role}`;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [letter, setLetter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  // The full grid (sorting, filters, grouping, templates) replaces the list and details layout until you go back.
  const [fullGrid, setFullGrid] = useState(search.get("view") === "grid");
  const [selectedKey, setSelectedKey] = useState<string | null>(search.get("p"));

  // The backend does the searching, filtering, sorting and paging. Typing waits until you pause.
  const q = useDebounced(query.trim());
  const qs = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE), filter });
  if (q) qs.set("search", q);
  if (letter) qs.set("letter", letter.toLowerCase());
  const { data, error, loading, reload } = useApi<Page<PatientSummary>>(`/patients?${qs}`);
  const detailsOfSelected = useApi<PatientDetailsDto>(selectedKey ? `/patients/details?key=${encodeURIComponent(selectedKey)}` : null);
  const casesOfSelected = useApi<CaseDto[]>(selectedKey ? `/patients/cases?key=${encodeURIComponent(selectedKey)}` : null);

  const shown = data?.content ?? [];
  const selected = shown.find((p) => p.patientKey === selectedKey) ?? null;
  // A patient opened from a link (?p=) may not be on this page of the list; the cases call above still finds them.
  const selectedName = selected?.name ?? casesOfSelected.data?.[0]?.patientFullName ?? null;
  const detail = selectedKey && selectedName ? { key: selectedKey, name: selectedName, cases: casesOfSelected.data ?? [] } : null;
  const filtered = filter !== "ALL" || !!q || !!letter;

  // Letters that have a patient on the current page are highlighted; clicking one filters on the server.
  const present = new Set(shown.map((p) => surnameFirst(p.name)[0]?.toUpperCase()));

  if (fullGrid) {
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Patients")}</h1>
          <div className="flex gap-2">
            <Button onClick={() => setFullGrid(false)}>{translate("Back to the list")}</Button>
            <Button variant="primary" onClick={() => setDialog(true)}>{translate("New patient")}</Button>
          </div>
        </div>
        <GridScreen key={String(dialog)} grid="PRO_PATIENTS" base={base} emptyTitle="No patients yet." emptyText="Add your first patient." />
        {dialog && <NewPatientDialog role={role} onClose={() => setDialog(false)} onCreated={(c) => { setDialog(false); router.push(`${base}/cases/${c.id}`); }} />}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 md:flex-row md:gap-6">
      {/* List */}
      <div className={`${detail ? "hidden md:flex" : "flex"} w-full min-w-0 flex-none flex-col gap-3 md:w-[460px]`}>
        <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Patients")}</h1>
        <Input placeholder={translate("Enter patient name")} value={query} onChange={(e) => (setQuery(e.target.value), setPage(0))} aria-label={translate("Search patients")} />
        <div className="flex flex-wrap items-center gap-2">
          <FilterChips<Filter>
            options={[
              { key: "ALL", label: "All" },
              { key: "DRAFTS", label: "Drafts" },
              { key: "ACTION", label: "Needs action" },
              { key: "PROGRESS", label: "In progress" },
              { key: "FINISHED", label: "Finished" },
            ]}
            active={filter}
            onChange={(f) => (setFilter(f), setPage(0))}
          />
          {filtered && (
            <button
              onClick={() => {
                setFilter("ALL");
                setQuery("");
                setLetter(null);
                setPage(0);
              }}
              className="min-h-9 px-1.5 text-sm text-accent"
            >
              {translate("Reset filter")}</button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted">{loading ? translate("Loading patients") : translate("{v0} {v1} found", {v0: data?.totalElements ?? 0, v1: translate(data?.totalElements === 1 ? "patient" : "patients")})}</span>
          <Button variant="primary" onClick={() => setDialog(true)}>
            {translate("New patient")}</Button>
        </div>
        <button onClick={() => setFullGrid(true)} className="min-h-11 self-start text-sm font-medium text-accent-deep">{translate("Open full grid")}</button>

        {error && <ErrorState title={translate("We couldn't load your patients.")} onRetry={reload} />}
        {loading && <SkeletonRows rows={6} />}
        {!loading && !error && shown.length === 0 && !filtered && <EmptyState title={translate("No patients yet.")} text={translate("Add your first patient.")} />}
        {!loading && !error && shown.length === 0 && filtered && <EmptyState title={translate("No patients match.")} text={translate("Try another name or reset the filter.")} />}

        {!loading && !error && shown.length > 0 && (
          <div className="flex min-h-0 gap-1.5">
            <div className="hidden w-[18px] flex-none flex-col justify-between py-0.5 text-center text-xs md:flex">
              {LETTERS.map((l) => (
                <button
                  key={l}
                  onClick={() => (setLetter(letter === l ? null : l), setPage(0))}
                  aria-label={translate("Surnames starting with {v0}", {v0: l})}
                  aria-pressed={letter === l}
                  className={`leading-none ${letter === l ? "font-bold text-ink" : present.has(l) ? "font-semibold text-accent" : "text-[#8696AB]"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-line bg-surface">
              {shown.map((p, i) => {
                const l = surnameFirst(p.name)[0]?.toUpperCase();
                const newGroup = i === 0 || l !== surnameFirst(shown[i - 1].name)[0]?.toUpperCase();
                return (
                  <div key={p.patientKey}>
                    {newGroup && <div className="border-b border-line bg-bg px-4 py-1.5 text-xs font-semibold text-aqua">{l}</div>}
                    <button
                      onClick={() => setSelectedKey(p.patientKey)}
                      aria-current={p.patientKey === selectedKey ? "true" : undefined}
                      className={`flex min-h-[52px] w-full items-center gap-2.5 border-b border-line px-4 py-2.5 text-start ${p.patientKey === selectedKey ? "bg-surface-2" : "bg-surface hover:bg-bg"}`}
                    >
                      <span className="h-2 w-2 flex-none rounded-full" style={{ background: p.needsAction ? "var(--red)" : "transparent" }} aria-label={p.needsAction ? translate("Needs action") : undefined} />
                      <span className="min-w-0 flex-1 truncate font-medium">{surnameFirst(p.name)}</span>
                      {p.latestStatus ? <Chip status={CASE_CHIP[p.latestStatus]} /> : <Chip label="No cases" />}
                    </button>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-4 py-2.5 text-sm text-muted">
                <span>
                  {translate("Showing ")}{data!.number * data!.size + 1} {translate(" to ")}{data!.number * data!.size + shown.length} {translate(" of ")}{data!.totalElements}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((n) => n - 1)} disabled={data!.first} className="h-9 rounded-lg border border-line bg-surface px-3 text-muted disabled:cursor-not-allowed enabled:text-ink">
                    {translate("Previous")}</button>
                  <button onClick={() => setPage((n) => n + 1)} disabled={data!.last} className="h-9 rounded-lg border border-line bg-surface px-3 text-muted disabled:cursor-not-allowed enabled:text-ink">
                    {translate("Next")}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className={`${detail ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col gap-4`}>
        {!detail && !loading && (data?.totalElements ?? 0) > 0 && <div className="m-auto text-muted">{translate("Select a patient to see their details.")}</div>}
        {detail && (
          <>
            <button onClick={() => setSelectedKey(null)} className="flex min-h-11 items-center gap-1 text-start text-sm text-accent md:hidden">
              <Icon name="back" size={16} /> {translate(" Patients")}</button>
            <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 md:p-6">
              <h2 className="m-0 text-[22px] font-semibold">{detail.name}</h2>
              {casesOfSelected.loading && <div className="tz-pulse text-sm text-muted">{translate("Loading cases")}</div>}
              {casesOfSelected.error && <ErrorState title={translate("We couldn't load this patient's cases.")} onRetry={casesOfSelected.reload} />}
              {detail.cases.length > 0 && (
                <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-3">
                  <div>
                    <dt className="text-xs text-muted">{translate("Cases")}</dt>
                    <dd className="m-0 mt-0.5 text-sm">{detail.cases.length}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">{translate("Latest case")}</dt>
                    <dd className="m-0 mt-1">
                      <Chip status={CASE_CHIP[detail.cases[0].status]} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">{translate("Patient account")}</dt>
                    <dd className="m-0 mt-0.5 text-sm">{detail.cases.some((c) => c.customerId) ? translate("Linked") : translate("Not linked")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">{translate("First case")}</dt>
                    <dd className="m-0 mt-0.5 text-sm">{dateOnly(detail.cases[detail.cases.length - 1].createdAt)}</dd>
                  </div>
                </dl>
              )}
              <PatientDetailsView d={detailsOfSelected.data} loading={detailsOfSelected.loading} error={!!detailsOfSelected.error} onRetry={detailsOfSelected.reload} role={role} />
              <div>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const c = await api<CaseDto>("/cases", { method: "POST", body: { patientFullName: detail.name } });
                      router.push(`${base}/cases/${c.id}`);
                    } catch {
                      casesOfSelected.reload();
                    }
                  }}
                  className="px-5 font-semibold"
                >
                  {translate("New case")}</Button>
                <Button variant="ghost" onClick={() => setEditing(true)} className="ms-2 px-4">{translate("Edit details")}</Button>
              </div>
            </section>

            {detail.cases.map((c) => (
              <Link key={c.id} href={`${base}/cases/${c.id}`} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 text-ink no-underline hover:border-accent hover:text-ink md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[17px] font-semibold">{translate("Case ")}{c.caseNumber}</span>
                    <Chip status={CASE_CHIP[c.status]} />
                  </div>
                  <span className="text-[13px] text-muted">{translate("Created ")}{dateOnly(c.createdAt)}</span>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>

      {editing && detail && detailsOfSelected.data && (
        <EditPatientDialog
          patientKey={detail.key}
          name={detail.name}
          role={role}
          current={detailsOfSelected.data}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            detailsOfSelected.reload();
          }}
        />
      )}
      {dialog && (
        <NewPatientDialog
          role={role}
          onClose={() => setDialog(false)}
          onCreated={(c) => {
            setDialog(false);
            router.push(`${base}/cases/${c.id}`);
          }}
        />
      )}
    </div>
  );
}

/** What is recorded about the patient, or a hint that nothing is yet. */
function PatientDetailsView({ d, loading, error, onRetry, role }: { d: PatientDetailsDto | undefined; loading: boolean; error: boolean; onRetry: () => void; role: string }) {
  const t = useT();
  const { dateOnly } = useLocalizedFormats();
  if (loading) return <div className="tz-pulse text-sm text-muted">{t("Loading")}</div>;
  if (error || !d) return <ErrorState title={t("We couldn't load this patient's details.")} onRetry={onRetry} />;
  const rows: [string, string | null][] = [
    ["Office ID", d.officeId],
    ["Date of birth", d.dateOfBirth ? dateOnly(d.dateOfBirth) : null],
    ["Gender", d.gender ? t(d.gender === "MALE" ? "Male" : "Female") : null],
    ...(role === "clinic" ? ([["Responsible doctor", d.responsibleDoctor]] as [string, string | null][]) : []),
    ["Email", d.email],
    ["Phone", d.phone],
    ["Address", d.address],
    ["Treatment status", d.treatmentStatus === "COMPLETED" ? t("Treatment completed") : t("In treatment")],
  ];
  const shown = rows.filter(([, v]) => v);
  return (
    <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-line pt-4">
      {shown.map(([k, v]) => (
        <div key={k} className={k === "Address" ? "col-span-2" : ""}>
          <dt className="text-xs text-muted">{t(k)}</dt>
          <dd className="m-0 mt-0.5 break-words text-sm">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
