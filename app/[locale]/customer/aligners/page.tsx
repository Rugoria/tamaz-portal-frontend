"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";

import { CASE_CHIP, PATIENT_EXPLAIN } from "@/lib/status";
import type { CaseDto } from "@/lib/types";
import { buttonClass } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GridScreen } from "@/components/grid/GridScreen";

export default function MyAlignersPage() {
  const translate = useT();
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5">
      <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("My aligners")}</h1>
      <GridScreen
        grid="MY_ALIGNERS"
        emptyTitle="No aligner case yet."
        emptyText="When your clinic adds you to a case, it appears here."
        renderCard={(c: CaseDto) => <AlignerCard c={c} />}
      />
    </div>
  );
}

function AlignerCard({ c }: { c: CaseDto }) {
  const {relative} = useLocalizedFormats();
  const translate = useT();
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-[18px] md:flex-row md:items-center md:gap-6 md:p-6">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="text-[17px] font-semibold md:text-lg">{c.patientFullName}</div>
        <div className="text-sm text-muted">{translate("Treated by ")}{c.ownerName}</div>
        <div className="flex flex-wrap gap-2">
          <Chip status={CASE_CHIP[c.status]} />
          {c.paymentStatus === "DUE" && <Chip label={translate("Payment due")} tone="amber" />}
          {c.paymentStatus === "PAID" && <Chip label={translate("Paid")} tone="aqua" />}
        </div>
        <div>{translate(PATIENT_EXPLAIN[c.status])}</div>
      </div>
      <div className="flex flex-col gap-3 md:items-end">
        <span className="text-[13px] text-muted">{translate("Updated ")}{relative(c.updatedAt)}</span>
        <Link href={`/customer/aligners/${c.id}`} className={buttonClass("secondary", "md", "no-underline md:min-w-0 h-12 md:h-11")}>
          {translate("View progress")}</Link>
      </div>
    </article>
  );
}
