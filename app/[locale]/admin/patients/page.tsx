"use client";

import {useT} from "@/i18n/client";
import { GridScreen } from "@/components/grid/GridScreen";

/** The names clinics and doctors have typed on cases (not the patient accounts, which are under Accounts). */
export default function AdminPatientsPage() {
  const translate = useT();
  return (
    <div className="flex w-full flex-col gap-5">
      <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Patients")}</h1>
      <GridScreen grid="ADMIN_PATIENTS" emptyTitle="No patients yet." emptyText="Patients appear here once a clinic or doctor creates a case." />
    </div>
  );
}
