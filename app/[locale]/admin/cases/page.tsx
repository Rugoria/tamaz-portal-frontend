"use client";

import {useT} from "@/i18n/client";
import { GridScreen } from "@/components/grid/GridScreen";

export default function AdminCasesPage() {
  const translate = useT();
  return (
    <div className="flex w-full flex-col gap-5">
      <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Cases")}</h1>
      <GridScreen grid="ADMIN_CASES" emptyTitle="No cases yet." emptyText="Cases appear here once a clinic or doctor creates one." />
    </div>
  );
}
