import { auth } from "@/lib/auth";
import { getTripById, deleteTrip } from "@/services/trip.service";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ tripId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params;
  const trip = await getTripById(tripId, session.user.id);

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json(trip);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params;

  const existing = await getTripById(tripId, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  await deleteTrip(tripId, session.user.id);
  return new NextResponse(null, { status: 204 });
}
