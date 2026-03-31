import { getSession as auth } from "@/lib/get-session";
import { getTripById } from "@/services/trip.service";
import { addSpot } from "@/services/spot.service";
import { NextResponse } from "next/server";
import type { SpotType } from "@/generated/prisma/client";

interface RouteParams {
  params: Promise<{ tripId: string; dayId: string }>;
}

const VALID_SPOT_TYPES: SpotType[] = [
  "ATTRACTION",
  "HOTEL",
  "RESTAURANT",
  "CAFE",
  "SHOPPING",
  "TRANSPORT",
  "CUSTOM",
];

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId, dayId } = await params;

  // Verify trip belongs to user
  const trip = await getTripById(tripId, session.user.id);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Verify day belongs to this trip
  const day = trip.days.find((d) => d.id === dayId);
  if (!day) {
    return NextResponse.json({ error: "Day not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, lat, lng, type, placeId, address, notes, stayMinutes } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "lat and lng must be numbers" }, { status: 400 });
  }
  if (!type || !VALID_SPOT_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_SPOT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const spot = await addSpot({
    name: name.trim(),
    lat,
    lng,
    type,
    tripDayId: dayId,
    placeId: placeId ?? undefined,
    address: address ?? undefined,
    notes: notes ?? undefined,
    stayMinutes: typeof stayMinutes === "number" ? stayMinutes : undefined,
  });

  return NextResponse.json(spot, { status: 201 });
}
