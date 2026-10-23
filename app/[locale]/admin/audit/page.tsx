"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import { useState } from "react";

import { useApi } from "@/lib/hooks";
import type { AuditLogDto, Page } from "@/lib/types";
import { RolePill } from "@/components/ui/Chip";
import { Field, Input } from "@/components/ui/Field";
import { DataTable, Muted } from "@/components/ui/Table";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";

const ACTIONS: Record<string, string> = {
  ACCOUNT_CREATED: "Account created",
  APPOINTMENT_BOOKED: "Appointment booked",
  APPOINTMENT_RESCHEDULED: "Appointment moved by patient",
  APPOINTMENT_CANCELLED_BY_PATIENT: "Appointment cancelled by patient",
  APPOINTMENT_CANCELLED_BY_CLINIC: "Appointment cancelled by clinic",
  APPOINTMENT_MOVED_BY_CLINIC: "Appointment time changed by clinic",
  CASE_SENT: "Case sent",
  CLEARMOVES_CONFIG_UPDATED: "Integration settings changed",
  CUSTOMER_LINKED: "Patient account linked",
  DESIGN_APPROVED: "Design approved",
  DESIGN_REJECTED: "Design changes requested",
  PRODUCTION_STARTED: "Production started",
  SHIPPED: "Shipped",
  TRANSFER_FAILED: "Delivery failed",
  VIEW_TEMPLATE_CREATED: "View template created",
  VIEW_TEMPLATE_UPDATED: "View template changed",
  VIEW_TEMPLATE_SHARED: "View template shared",
  VIEW_TEMPLATE_DELETED: "View template deleted",
};

const ROLE: Record<string, string> = { ADMIN: "Admin", CLINIC: "Clinic", DOCTOR: "Doctor", CUSTOMER: "Patient" };

function item(r: AuditLogDto, translate: (s: string) => string): string {
  if (!r.entityType) return "";
  const type = r.entityType === "CASE" ? "Case" : r.entityType === "APPOINTMENT" ? "Appointment" : r.entityType === "ViewTemplate" ? "View template" : r.entityType.charAt(0) + r.entityType.slice(1).toLowerCase();
  return r.entityId ? `${translate(type)} ${r.entityId.slice(0, 8)}` : translate(type);
}

export default function AuditLogPage() {
  const {dateTime} = useLocalizedFormats();
  const translate = useT();
  const [page, setPage] = useState(0);
  const [action, setAction] = useState("");
  const [entityId, setEntityId] = useState("");

  const qs = new URLSearchParams({ page: String(page), size: "10" });
  if (action) qs.set("action", action);
  if (entityId.trim()) qs.set("entityId", entityId.trim());
  const { data, error, loading, reload } = useApi<Page<AuditLogDto>>(`/admin/audit-logs?${qs}`);

  return (
    <div className="flex w-full flex-col gap-5">
      <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Audit log")}</h1>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex w-full flex-col gap-1.5 text-sm font-medium sm:w-[300px]">
          {translate("Action")}<select value={action} onChange={(e) => (setAction(e.target.value), setPage(0))} className="h-11 rounded-lg border border-line bg-surface px-3 text-[15px] font-normal">
            <option value="">{translate("All actions")}</option>
            {Object.entries(ACTIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {translate(v)}
              </option>
            ))}
          </select>
        </label>
        <Field label={translate("Case ID")} className="w-full sm:w-[360px]">
          <Input value={entityId} onChange={(e) => (setEntityId(e.target.value), setPage(0))} placeholder={translate("Enter a case ID")} />
        </Field>
      </div>

      {error && <ErrorState title={translate("We couldn't load the audit log.")} onRetry={reload} />}
      {loading && <SkeletonRows rows={8} />}
      {!loading && !error && data && data.content.length === 0 && <EmptyState title={translate("No entries match.")} text={translate("Try another action or case ID.")} />}
      {!loading && !error && data && data.content.length > 0 && (
        <DataTable
          grid="1fr 2fr 1.4fr 1.4fr 2fr"
          columns={[
            { header: "Time", render: (r) => <Muted>{dateTime(r.createdAt)}</Muted> },
            {
              header: "Who",
              render: (r) =>
                r.actorEmail ? (
                  <div className="flex flex-col items-start gap-1">
                    <span className="break-all font-medium">{r.actorEmail}</span>
                    {r.actorRole && <RolePill label={ROLE[r.actorRole] ?? r.actorRole} />}
                  </div>
                ) : (
                  <Muted>{translate("System")}</Muted>
                ),
            },
            { header: "Action", render: (r) => <span className="font-semibold">{translate(ACTIONS[r.action] ?? r.action)}</span> },
            { header: "Item", render: (r) => item(r, translate) },
            { header: "Details", render: (r) => <span className="break-words text-muted">{r.details ?? ""}</span> },
          ]}
          rows={data.content}
          rowKey={(r) => r.id}
          footer={translate("Showing {from} to {to} of {total}", {from: data.number * data.size + 1, to: data.number * data.size + data.content.length, total: data.totalElements})}
          hasPrev={!data.first}
          hasNext={!data.last}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </div>
  );
}
