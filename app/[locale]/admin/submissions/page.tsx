"use client";

import {useT} from "@/i18n/client";
import { GridScreen } from "@/components/grid/GridScreen";

export default function SubmissionsPage() {
  const translate = useT();
  return (
    <div className="flex w-full flex-col gap-5">
      <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Submissions")}</h1>
      <GridScreen grid="ADMIN_SUBMISSIONS" emptyTitle="No submissions yet." emptyText="Submissions appear here when a clinic or doctor sends a case." />
    </div>
  );
}
