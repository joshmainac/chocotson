import MeetingDemo from "@/components/MeetingDemo";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return <MeetingDemo bookingId={bookingId} />;
}
