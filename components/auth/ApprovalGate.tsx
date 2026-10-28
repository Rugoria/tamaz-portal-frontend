"use client";

import type { ReactNode } from "react";
import { useT } from "@/i18n/client";
import { signOut } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { pollMs, useRealtimeLive } from "@/lib/realtime";
import type { MeStatusDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { SkeletonBlock } from "@/components/ui/states";

/**
 * Wraps the clinic and doctor portals. While the admin has not approved the account, every screen is replaced by one waiting message (the backend refuses
 * everything else anyway). The screen follows the decision by itself: a live update, or a check every 30 seconds.
 */
export function ApprovalGate({ children }: { children: ReactNode }) {
  const translate = useT();
  const streaming = useRealtimeLive();
  const status = useApi<MeStatusDto>("/me/status", { refreshInterval: pollMs(30000, streaming) });

  if (status.loading && !status.data) return <SkeletonBlock height={240} />;
  const s = status.data?.approvalStatus;
  if (s !== "PENDING" && s !== "REJECTED") return <>{children}</>;

  return (
    <div className="mx-auto mt-10 flex w-full max-w-[520px] flex-col gap-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
      {s === "PENDING" ? (
        <>
          <h1 className="m-0 text-[22px] font-semibold sm:text-2xl">{translate("Your account is waiting for approval")}</h1>
          <p className="m-0 text-muted">{translate("The tamaz team is checking your details. We will email you as soon as your account is approved. You do not need to do anything.")}</p>
        </>
      ) : (
        <>
          <h1 className="m-0 text-[22px] font-semibold sm:text-2xl">{translate("Your application was not approved.")}</h1>
          {status.data?.reason && (
            <p className="m-0">
              <span className="text-muted">{translate("Reason")}: </span>
              {status.data.reason}
            </p>
          )}
          <p className="m-0 text-muted">{translate("You are welcome to apply again with corrected details.")}</p>
        </>
      )}
      <div>
        <Button variant="ghost" onClick={() => void signOut()}>
          {translate("Sign out")}</Button>
      </div>
    </div>
  );
}
