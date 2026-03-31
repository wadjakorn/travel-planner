import { getSession as auth } from "@/lib/get-session";
import { getTripById } from "@/services/trip.service";
import { redirect, notFound } from "next/navigation";
import { TripView } from "@/components/trip/trip-view";

interface TripPageProps {
  params: Promise<{ tripId: string }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tripId } = await params;
  const trip = await getTripById(tripId, session.user.id);

  if (!trip) notFound();

  return <TripView trip={trip} />;
}
