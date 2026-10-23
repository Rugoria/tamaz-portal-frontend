import { BookFlow } from "./BookFlow";

// The URL's ?clinic= and ?reschedule= are read here, on the server, and passed down as plain values.
export default async function BookAppointmentPage({ searchParams }: { searchParams: Promise<{ clinic?: string; reschedule?: string }> }) {
  const { clinic, reschedule } = await searchParams;
  return <BookFlow clinicParam={clinic ?? null} rescheduleId={reschedule ?? null} />;
}
