import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { CustomerShell } from "@/components/shell/CustomerShell";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { ToastProvider } from "@/components/ui/Toast";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("CUSTOMER");
  return (
    <ToastProvider>
      <RealtimeProvider />
      <CustomerShell user={user}>{children}</CustomerShell>
    </ToastProvider>
  );
}
