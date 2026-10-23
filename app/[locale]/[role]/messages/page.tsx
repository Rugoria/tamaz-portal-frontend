import { MessagesView } from "@/components/features/MessagesView";

export default async function StaffMessages({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  return <MessagesView role={role === "doctor" ? "DOCTOR" : "CLINIC"} />;
}
