"use client";

import { use } from "react";
import {useT} from "@/i18n/client";
import { GridScreen } from "@/components/grid/GridScreen";

/** Every case this clinic or doctor has sent, as a grid with sorting, filters, grouping and templates. */
export default function StaffCasesPage({ params }: { params: Promise<{ role: string }> }) {
  const translate = useT();
  const { role } = use(params);
  return (
    <div className="flex w-full flex-col gap-5">
      <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Cases")}</h1>
      <GridScreen grid="PRO_CASES" base={`/${role}`} emptyTitle="No cases yet." emptyText="Create a patient to start the first case." />
    </div>
  );
}
