import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { SidebarShell, type NavGroup } from "@/components/shell/Sidebar";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { ToastProvider } from "@/components/ui/Toast";

// One layout for both the clinic portal (/clinic) and the doctor portal (/doctor): same screens, different menu.
export default async function StaffLayout({ children, params }: { children: ReactNode; params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (role !== "clinic" && role !== "doctor") notFound();
  const user = await requireRole(role === "clinic" ? "CLINIC" : "DOCTOR");
  const base = `/${role}`;

  const items: NavGroup["items"] = [
    { href: base, label: "Home", icon: "home", exact: true },
    { href: `${base}/patients`, label: "Patients", icon: "patients" },
    { href: `${base}/cases`, label: "Cases", icon: "cases" },
    { href: `${base}/messages`, label: "Messages", icon: "messages", dot: "messages" },
  ];
  // Only clinics receive appointment bookings; independent doctors do not take appointments through the site.
  if (role === "clinic") items.push({ href: `${base}/appointments`, label: "Appointments", icon: "calendar" });
  items.push({ href: `${base}/notifications`, label: "Notifications", icon: "bell", dot: "notifications" });
  items.push({ href: `${base}/profile`, label: "Profile", icon: "profile" });

  return (
    <ToastProvider>
      <RealtimeProvider />
      <SidebarShell groups={[{ items }]} user={user}>
        {children}
      </SidebarShell>
    </ToastProvider>
  );
}
