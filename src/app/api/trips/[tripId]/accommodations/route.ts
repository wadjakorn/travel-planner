import { getSession as auth } from "@/lib/get-session";
import { getTripById } from "@/services/trip.service";
import {
  getAccommodations,
  createAccommodation,
} from "@/services/accommodation.service";
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

  const accommodations = await getAccommodations(tripId);
  return NextResponse.json(accommodations);
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params;
  const trip = await getTripById(tripId, session.user.id);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, address, lat, lng, placeId } = body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "name must be a non-empty string" },
      { status: 400 }
    );
  }
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "lat and lng must be numbers" },
      { status: 400 }
    );
  }

  const accommodation = await createAccommodation(tripId, {
    name: name.trim(),
    address: address ?? undefined,
    lat,
    lng,
    placeId: placeId ?? undefined,
  });

  return NextResponse.json(accommodation, { status: 201 });
}
