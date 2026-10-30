"use client";

import Link from "@/i18n/navigation";
import useSWR from "swr";
import { useLocalizedFormats } from "@/i18n/formats";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import { CASE_CHIP, CHIPS, JOB_CHIP, ROLE_LABEL } from "@/lib/status";
import type { AdminPatientRow, AdminTransferJobDto, CaseDto, CaseStatus, PatientSummary, TransferJobStatus, UserDto } from "@/lib/types";
import { Chip, RolePill } from "@/components/ui/Chip";
import { builtInConfig, type ColumnDef, type ViewConfig } from "@/lib/grid/engine";

/**
 * One place that says, for every grid a view template can be made for: where its rows come from, how each field shows,
 * and the plain value used to sort, filter and group. The field list itself comes from the backend (`/views/grids`).
 */

const MAX_ROWS = 2000;

/** Loads a paged endpoint (or a plain list) to the end, up to MAX_ROWS rows. The grid sorts and filters what it receives. */
async function loadAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  const sep = path.includes("?") ? "&" : "?";
  for (let page = 0; out.length < MAX_ROWS; page++) {
    const res = await api<{ content: T[]; last: boolean } | T[]>(`${path}${sep}page=${page}&size=200`);
    if (Array.isArray(res)) return res;
    out.push(...res.content);
    if (res.last || res.content.length === 0) break;
  }
  return out;
}

export function useGridRows<T>(path: string | null) {
  const { data, error, isLoading, mutate } = useSWR<T[]>(path ? ["grid-rows", path] : null, () => loadAll<T>(path!), { revalidateOnFocus: false });
  return { rows: data, error: !!error, loading: isLoading, reload: () => mutate() };
}

const caseOptions = (): { value: string; label: string }[] => (Object.keys(CASE_CHIP) as CaseStatus[]).map((s) => ({ value: s, label: CHIPS[CASE_CHIP[s]][0] }));
const jobOptions = (): { value: string; label: string }[] => (["QUEUED", "IN_PROGRESS", "SUCCEEDED", "FAILED"] as TransferJobStatus[]).map((s) => ({ value: s, label: CHIPS[JOB_CHIP[s]][0] }));
const PAYMENT = [
  { value: "NOT_DUE", label: "None" },
  { value: "DUE", label: "Payment due" },
  { value: "PAID", label: "Paid" },
];
const ACCOUNT = [
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

export interface GridSpec {
  path: string | null;
  defs: ColumnDef<any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  rowKey: (row: any) => string; // eslint-disable-line @typescript-eslint/no-explicit-any
  rowHref?: (row: any) => string; // eslint-disable-line @typescript-eslint/no-explicit-any
  rowBg?: (row: any) => string | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  builtIn: ViewConfig;
  /** Phone / "cards" layout is the same for every grid except My aligners, which keeps its card design. */
  cards?: boolean;
}

/** `base` is where a clinic or doctor's pages live ("/clinic" or "/doctor"). */
export function useGridSpec(grid: string, base = "/clinic"): GridSpec {
  const t = useT();
  const { dateOnly } = useLocalizedFormats();
  const date = (v: string) => <span className="text-muted">{dateOnly(v)}</span>;
  const yesNo = (v: boolean) => (v ? t("Yes") : t("No"));
  const groupYesNo = (v: unknown) => (v ? t("Yes") : t("No"));
  const sentBy = (name: string, role: AdminTransferJobDto["ownerRole"]) => (
    <div className="flex flex-col items-start gap-1">
      <span className="font-medium">{name}</span>
      <RolePill label={t(ROLE_LABEL[role])} />
    </div>
  );
  const payChip = (p: CaseDto["paymentStatus"]) => (p === "NOT_DUE" ? <span className="text-muted">{t("None")}</span> : <Chip label={p === "PAID" ? "Paid" : "Payment due"} tone={p === "PAID" ? "aqua" : "amber"} />);
  const caseLabel = (v: unknown) => t(v == null ? "No cases" : CHIPS[CASE_CHIP[v as CaseStatus]]?.[0] ?? String(v));
  // A patient whose cases were all deleted has no latest case: no status, and the row opens the owner (admin) or the patient (clinic, doctor).
  const latestChip = (s: CaseStatus | null) => (s ? <Chip status={CASE_CHIP[s]} /> : <Chip label="No cases" />);
  const adminPatientHref = (r: AdminPatientRow) => (r.latestCaseId ? `/admin/cases/${r.latestCaseId}` : `/admin/accounts/${r.ownerId}`);
  const proPatientHref = (r: PatientSummary) => (r.latestCaseId ? `${base}/cases/${r.latestCaseId}` : `${base}/patients?p=${encodeURIComponent(r.patientKey)}`);
  const payLabel = (v: unknown) => t(PAYMENT.find((o) => o.value === v)?.label ?? String(v));
  const linkChip = (linked: boolean) => <Chip label={linked ? "Linked" : "Not linked"} tone={linked ? "aqua" : "neutral"} />;
  const accountLabel = (v: unknown) => t(v === "active" ? "Active" : "Disabled");
  const accountChip = (u: UserDto) => <Chip label={u.enabled ? "Active" : "Disabled"} tone={u.enabled ? "green" : "neutral"} />;
  const accountDefs = (): ColumnDef<UserDto>[] => [
    { key: "name", label: "Name", type: "TEXT", width: 1.4, value: (u) => u.fullName, render: (u) => <Link href={`/admin/accounts/${u.id}`} className="font-semibold text-ink no-underline hover:text-accent">{u.fullName}</Link> },
    { key: "email", label: "Email", type: "TEXT", width: 1.6, value: (u) => u.email, render: (u) => <span className="break-all">{u.email}</span> },
    { key: "status", label: "Status", type: "STATUS", groupable: true, options: ACCOUNT, groupLabel: accountLabel, value: (u) => (u.enabled ? "active" : "disabled"), render: accountChip },
    { key: "created", label: "Created", type: "DATE", value: (u) => u.createdAt, render: (u) => date(u.createdAt) },
  ];
  const userSpec = (path: string): GridSpec => {
    const defs = accountDefs();
    return { path, defs, rowKey: (u: UserDto) => u.id, rowHref: (u: UserDto) => `/admin/accounts/${u.id}`, builtIn: builtInConfig(defs) };
  };

  switch (grid) {
    case "ADMIN_CASES": {
      const defs: ColumnDef<CaseDto>[] = [
        { key: "patient", label: "Patient", type: "TEXT", width: 1.2, value: (r) => r.patientFullName, render: (r) => <Link href={`/admin/cases/${r.id}`} className="font-semibold text-ink no-underline">{r.patientFullName}</Link> },
        { key: "sentBy", label: "Sent by", type: "TEXT", groupable: true, width: 1.4, value: (r) => r.ownerName, render: (r) => sentBy(r.ownerName, r.ownerRole) },
        { key: "status", label: "Status", type: "STATUS", groupable: true, options: caseOptions(), groupLabel: caseLabel, width: 1.2, value: (r) => r.status, render: (r) => <Chip status={CASE_CHIP[r.status]} /> },
        { key: "payment", label: "Payment", type: "STATUS", groupable: true, options: PAYMENT, groupLabel: payLabel, value: (r) => r.paymentStatus, render: (r) => payChip(r.paymentStatus) },
        { key: "patientAccount", label: "Patient account", type: "BOOLEAN", groupable: true, groupLabel: (v) => (v ? t("Linked") : t("Not linked")), value: (r) => r.customerId !== null, render: (r) => linkChip(r.customerId !== null) },
        { key: "created", label: "Created", type: "DATE", value: (r) => r.createdAt, render: (r) => date(r.createdAt) },
        { key: "updated", label: "Updated", type: "DATE", value: (r) => r.updatedAt, render: (r) => date(r.updatedAt) },
      ];
      return { path: "/cases", defs, rowKey: (r: CaseDto) => r.id, rowHref: (r: CaseDto) => `/admin/cases/${r.id}`, builtIn: builtInConfig(defs, [{ key: "created", dir: "desc" }]) };
    }
    case "ADMIN_SUBMISSIONS": {
      const defs: ColumnDef<AdminTransferJobDto>[] = [
        { key: "patient", label: "Patient", type: "TEXT", width: 1.2, value: (r) => r.patientFullName, render: (r) => <Link href={`/admin/cases/${r.caseId}`} className="font-semibold text-ink no-underline">{r.patientFullName}</Link> },
        { key: "sentBy", label: "Sent by", type: "TEXT", groupable: true, width: 1.4, value: (r) => r.ownerName, render: (r) => sentBy(r.ownerName, r.ownerRole) },
        { key: "version", label: "Version", type: "NUMBER", width: 0.7, value: (r) => r.submissionVersion, render: (r) => `V${r.submissionVersion}` },
        { key: "delivery", label: "Delivery", type: "STATUS", groupable: true, options: jobOptions(), groupLabel: (v) => t(CHIPS[JOB_CHIP[v as TransferJobStatus]]?.[0] ?? String(v)), value: (r) => r.status, render: (r) => <Chip status={JOB_CHIP[r.status]} /> },
        { key: "caseStatus", label: "Case status", type: "STATUS", groupable: true, options: caseOptions(), groupLabel: caseLabel, width: 1.2, value: (r) => r.caseStatus, render: (r) => <Chip status={CASE_CHIP[r.caseStatus]} /> },
        { key: "attempts", label: "Attempts", type: "NUMBER", width: 0.7, value: (r) => r.attemptCount, render: (r) => r.attemptCount },
        { key: "reference", label: "Reference", type: "TEXT", value: (r) => r.externalCaseId ?? "", render: (r) => <span className="break-all font-mono text-[13px]">{r.externalCaseId ?? "—"}</span> },
        { key: "lastError", label: "Last error", type: "TEXT", width: 1.6, value: (r) => r.lastError ?? "", render: (r) => <span className="text-red">{r.lastError ?? ""}</span> },
        { key: "sent", label: "Sent", type: "DATE", value: (r) => r.createdAt, render: (r) => date(r.createdAt) },
      ];
      const cfg = builtInConfig(defs, [{ key: "sent", dir: "desc" }]);
      return { path: "/admin/transfer-jobs", defs, rowKey: (r: AdminTransferJobDto) => r.id, rowHref: (r: AdminTransferJobDto) => `/admin/cases/${r.caseId}`, rowBg: (r: AdminTransferJobDto) => (r.status === "FAILED" ? "#FDF3F2" : undefined), builtIn: cfg };
    }
    case "ADMIN_PATIENTS": {
      const defs: ColumnDef<AdminPatientRow>[] = [
        { key: "patient", label: "Patient", type: "TEXT", width: 1.2, value: (r) => r.name, render: (r) => <Link href={adminPatientHref(r)} className="font-semibold text-ink no-underline">{r.name}</Link> },
        { key: "owner", label: "Owner", type: "TEXT", groupable: true, width: 1.4, value: (r) => r.ownerName, render: (r) => sentBy(r.ownerName, r.ownerRole) },
        { key: "cases", label: "Cases", type: "NUMBER", width: 0.7, value: (r) => r.caseCount, render: (r) => r.caseCount },
        { key: "latestStatus", label: "Latest status", type: "STATUS", groupable: true, options: caseOptions(), groupLabel: caseLabel, width: 1.2, value: (r) => r.latestStatus, render: (r) => latestChip(r.latestStatus) },
        { key: "needsAction", label: "Needs action", type: "BOOLEAN", groupable: true, groupLabel: groupYesNo, width: 0.9, value: (r) => r.needsAction, render: (r) => (r.needsAction ? <Chip label="Needs action" tone="red" /> : <span className="text-muted">{yesNo(false)}</span>) },
        { key: "updated", label: "Last updated", type: "DATE", value: (r) => r.lastUpdatedAt, render: (r) => date(r.lastUpdatedAt) },
        { key: "patientAccount", label: "Patient account", type: "BOOLEAN", groupable: true, groupLabel: (v) => (v ? t("Linked") : t("Not linked")), value: (r) => r.linked, render: (r) => linkChip(r.linked) },
      ];
      return { path: "/admin/patients", defs, rowKey: (r: AdminPatientRow) => `${r.ownerId}:${r.patientKey}`, rowHref: adminPatientHref, builtIn: builtInConfig(defs, [{ key: "updated", dir: "desc" }]) };
    }
    case "ADMIN_PATIENT_ACCOUNTS":
      return userSpec("/admin/customers");
    case "ADMIN_CLINICS":
      return userSpec("/admin/clinics");
    case "ADMIN_DOCTORS":
      return userSpec("/admin/doctors");
    case "PRO_PATIENTS": {
      const defs: ColumnDef<PatientSummary>[] = [
        { key: "patient", label: "Patient", type: "TEXT", width: 1.4, value: (r) => r.name, render: (r) => <Link href={proPatientHref(r)} className="font-semibold text-ink no-underline">{r.name}</Link> },
        { key: "cases", label: "Cases", type: "NUMBER", width: 0.7, value: (r) => r.caseCount, render: (r) => r.caseCount },
        { key: "latestStatus", label: "Latest status", type: "STATUS", groupable: true, options: caseOptions(), groupLabel: caseLabel, width: 1.2, value: (r) => r.latestStatus, render: (r) => latestChip(r.latestStatus) },
        { key: "needsAction", label: "Needs action", type: "BOOLEAN", groupable: true, groupLabel: groupYesNo, width: 0.9, value: (r) => r.needsAction, render: (r) => (r.needsAction ? <span className="inline-flex items-center gap-1.5 font-medium text-red"><span className="h-2 w-2 rounded-full bg-red" />{t("Needs action")}</span> : <span className="text-muted">{yesNo(false)}</span>) },
        { key: "updated", label: "Last updated", type: "DATE", value: (r) => r.lastUpdatedAt, render: (r) => date(r.lastUpdatedAt) },
        { key: "patientAccount", label: "Patient account", type: "BOOLEAN", groupable: true, groupLabel: (v) => (v ? t("Linked") : t("Not linked")), value: (r) => r.linked, render: (r) => linkChip(r.linked) },
      ];
      return { path: "/patients", defs, rowKey: (r: PatientSummary) => r.patientKey, rowHref: proPatientHref, builtIn: builtInConfig(defs, [{ key: "updated", dir: "desc" }]) };
    }
    case "PRO_CASES": {
      const defs: ColumnDef<CaseDto>[] = [
        { key: "patient", label: "Patient", type: "TEXT", width: 1.4, value: (r) => r.patientFullName, render: (r) => <Link href={`${base}/cases/${r.id}`} className="font-semibold text-ink no-underline">{r.patientFullName}</Link> },
        { key: "status", label: "Status", type: "STATUS", groupable: true, options: caseOptions(), groupLabel: caseLabel, width: 1.2, value: (r) => r.status, render: (r) => <Chip status={CASE_CHIP[r.status]} /> },
        { key: "payment", label: "Payment", type: "STATUS", groupable: true, options: PAYMENT, groupLabel: payLabel, value: (r) => r.paymentStatus, render: (r) => payChip(r.paymentStatus) },
        { key: "created", label: "Sent date", type: "DATE", value: (r) => r.createdAt, render: (r) => date(r.createdAt) },
        { key: "updated", label: "Updated", type: "DATE", value: (r) => r.updatedAt, render: (r) => date(r.updatedAt) },
      ];
      return { path: "/cases", defs, rowKey: (r: CaseDto) => r.id, rowHref: (r: CaseDto) => `${base}/cases/${r.id}`, builtIn: builtInConfig(defs, [{ key: "updated", dir: "desc" }]) };
    }
    case "MY_ALIGNERS":
    default: {
      const defs: ColumnDef<CaseDto>[] = [
        { key: "patient", label: "Patient name", type: "TEXT", value: (r) => r.patientFullName, render: (r) => r.patientFullName },
        { key: "treatedBy", label: "Treated by", type: "TEXT", groupable: true, value: (r) => r.ownerName, render: (r) => r.ownerName },
        { key: "status", label: "Status", type: "STATUS", groupable: true, options: caseOptions(), groupLabel: caseLabel, value: (r) => r.status, render: (r) => <Chip status={CASE_CHIP[r.status]} /> },
        { key: "payment", label: "Payment", type: "STATUS", groupable: true, options: PAYMENT, groupLabel: payLabel, value: (r) => r.paymentStatus, render: (r) => payChip(r.paymentStatus) },
        { key: "updated", label: "Updated", type: "DATE", value: (r) => r.updatedAt, render: (r) => date(r.updatedAt) },
      ];
      return { path: "/cases", defs, rowKey: (r: CaseDto) => r.id, rowHref: (r: CaseDto) => `/customer/aligners/${r.id}`, builtIn: builtInConfig(defs, [{ key: "updated", dir: "desc" }]), cards: true };
    }
  }
}
