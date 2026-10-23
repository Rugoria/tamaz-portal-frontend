import { NotificationsView } from "@/components/features/NotificationsView";

export default async function StaffNotifications({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  return <NotificationsView role={role === "doctor" ? "DOCTOR" : "CLINIC"} base={`/${role}`} />;
}
