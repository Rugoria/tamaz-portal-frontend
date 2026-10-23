import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { SHOW_PENDING } from "@/lib/pending";
import { SidebarShell, type NavGroup } from "@/components/shell/Sidebar";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { ToastProvider } from "@/components/ui/Toast";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("ADMIN");

  const oversight: NavGroup["items"] = [
    { href: "/admin", label: "Overview", exact: true },
    { href: "/admin/submissions", label: "Submissions" },
    { href: "/admin/cases", label: "Cases" },
    { href: "/admin/patients", label: "Patients" },
  ];
  if (SHOW_PENDING) oversight.push({ href: "/admin/tracking", label: "Tracking" });

  const groups: NavGroup[] = [
    { items: [{ href: "/admin/notifications", label: "Notifications", dot: "notifications" }] },
    { heading: "Oversight", items: oversight },
    {
      heading: "People",
      items: [
        { href: "/admin/accounts", label: "Accounts" },
        { href: "/admin/views", label: "Views" },
        { href: "/admin/messages", label: "Messages", dot: "messages" },
      ],
    },
    {
      heading: "System",
      items: [
        { href: "/admin/settings", label: "Integration settings" },
        { href: "/admin/audit", label: "Audit log" },
      ],
    },
  ];

  return (
    <ToastProvider>
      <RealtimeProvider />
      <SidebarShell groups={groups} user={user} width={260} brandBadge="Admin">
        {children}
      </SidebarShell>
    </ToastProvider>
  );
}
