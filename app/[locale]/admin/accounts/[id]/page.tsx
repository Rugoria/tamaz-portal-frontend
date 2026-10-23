"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { use, useState } from "react";
import { api, ApiError } from "@/lib/api";

import { useApi } from "@/lib/hooks";
import { CASE_CHIP, PAYMENT_LABEL, ROLE_LABEL } from "@/lib/status";
import type { CaseDto, ConversationDto, DoctorProfileDto, Page, UserDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Chip, RolePill } from "@/components/ui/Chip";
import { DataTable, Muted } from "@/components/ui/Table";
import { EmptyState, ErrorState, LoadError, SkeletonBlock } from "@/components/ui/states";

/** One account (clinic, doctor or patient) as the admin sees it: details, a Message button, and their cases. */
export default function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const {dateOnly} = useLocalizedFormats();
  const translate = useT();
  const { id } = use(params);
  const router = useRouter();
  const [page, setPage] = useState(0);
  const user = useApi<UserDto>(`/admin/users/${id}`);
  const isDoctor = user.data?.role === "DOCTOR";
  const isClinic = user.data?.role === "CLINIC";
  const profile = useApi<DoctorProfileDto>(isDoctor ? `/admin/doctors/${id}/profile` : isClinic ? `/admin/clinics/${id}/profile` : null);
  const cases = useApi<Page<CaseDto>>(`/admin/users/${id}/cases?page=${page}&size=10`);
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  if (user.loading) return <SkeletonBlock height={260} />;
  if (user.error || !user.data) {
    return <LoadError error={user.error} what="account" onRetry={user.reload} backHref="/admin/accounts" backLabel={translate("Back to accounts")} />;
  }
  const u = user.data;
  const back = u.role === "CLINIC" ? "Clinics" : u.role === "DOCTOR" ? "Doctors" : "Patients";
  const p = profile.data;

  async function message() {
    setMsgBusy(true);
    setMsgError(null);
    try {
      const c = await api<ConversationDto>("/chat/conversations", { method: "POST", body: { participantId: u.id } });
      router.push(`/admin/messages?c=${c.id}`);
    } catch (e) {
      setMsgError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      setMsgBusy(false);
    }
  }

  const details: [string, string, boolean?][] = [
    ["Email", u.email],
    ["Status", u.enabled ? translate("Active") : translate("Disabled")],
    ["Created", dateOnly(u.createdAt)],
  ];
  if (p?.profileComplete) {
    details.push(
      ["Clinic name", p.clinicName ?? ""],
      ["Contact number", p.contactNumber ?? ""],
      ["Address", [p.addressLine, [p.city, p.postcode].filter(Boolean).join(" "), p.state, p.country].filter(Boolean).join(", "), true],
      ["Tooth numbering system", translate(p.toothNumbering === "UNIVERSAL" ? "Universal (American)" : p.toothNumbering === "PALMER" ? "Palmer" : "Viola"), true],
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div>
        <Link href="/admin/accounts" className="flex min-h-9 items-center text-sm no-underline">
          ← {translate(back)}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{u.fullName}</h1>
            <RolePill label={translate(ROLE_LABEL[u.role])} />
          </div>
          <Button onClick={message} loading={msgBusy}>
            {translate("Message")}</Button>
        </div>
        {msgError && (
          <div role="alert" className="mt-1 text-sm text-red">
            {translate(msgError)}
          </div>
        )}
      </div>

      <section className="grid max-w-[760px] gap-x-6 gap-y-4 rounded-xl border border-line bg-surface p-6 sm:grid-cols-2">
        {details.map(([k, v, wide]) => (
          <div key={k} className={wide ? "sm:col-span-2" : ""}>
            <div className="text-xs text-muted">{translate(k)}</div>
            <div className="mt-0.5 break-words">{v}</div>
          </div>
        ))}
        {isDoctor && p && !p.profileComplete && (
          <div className="rounded-lg bg-bg px-4 py-3 text-sm text-muted sm:col-span-2">{translate("Profile not completed. This doctor hasn&apos;t added their details yet.")}</div>
        )}
        {isClinic && p && !p.profileComplete && (
          <div className="rounded-lg bg-bg px-4 py-3 text-sm text-muted sm:col-span-2">{translate("Profile not completed. This clinic hasn't added its details yet.")}</div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-lg font-semibold">{u.role === "CUSTOMER" ? translate("Linked cases") : translate("Cases")}</h2>
        {cases.error && <ErrorState title={translate("We couldn't load the cases.")} onRetry={cases.reload} />}
        {cases.loading && <SkeletonBlock height={140} />}
        {!cases.loading && !cases.error && cases.data?.content.length === 0 && (
          <EmptyState title={translate("No cases yet.")} text={u.role === "CUSTOMER" ? translate("No case has been linked to this patient.") : translate("This account hasn't created a case.")} />
        )}
        {!cases.loading && !cases.error && cases.data && cases.data.content.length > 0 && (
          <DataTable
            grid="1.4fr .6fr 1.2fr 1fr 1fr"
            columns={[
              { header: "Patient", render: (c) => <Link href={`/admin/cases/${c.id}`} className="font-semibold text-ink no-underline">{c.patientFullName}</Link> },
              { header: "Case", render: (c) => `${translate('Case')} ${c.caseNumber}` },
              { header: "Status", render: (c) => <Chip status={CASE_CHIP[c.status]} /> },
              { header: "Payment", render: (c) => (c.paymentStatus === "NOT_DUE" ? <Muted>{translate("None")}</Muted> : <Chip label={translate(PAYMENT_LABEL[c.paymentStatus])} tone={c.paymentStatus === "PAID" ? "aqua" : "amber"} />) },
              { header: "Created", render: (c) => <Muted>{dateOnly(c.createdAt)}</Muted> },
            ]}
            rows={cases.data.content}
            rowKey={(c) => c.id}
            onRowClick={(c) => router.push(`/admin/cases/${c.id}`)}
            footer={translate("Showing {from} to {to} of {total}", {from: cases.data.number * cases.data.size + 1, to: cases.data.number * cases.data.size + cases.data.content.length, total: cases.data.totalElements})}
            hasPrev={!cases.data.first}
            hasNext={!cases.data.last}
            onPrev={() => setPage((n) => n - 1)}
            onNext={() => setPage((n) => n + 1)}
          />
        )}
      </section>
    </div>
  );
}
