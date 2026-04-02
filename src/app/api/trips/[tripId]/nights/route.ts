import { getSession as auth } from "@/lib/get-session";
import { getTripById } from "@/services/trip.service";
import {
  getNightsWithAccommodations,
  setNightAccommodation,
  updateArrivalDeparture,
} from "@/services/accommodation.service";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ tripId: string }>;
}

/** GET /api/trips/[tripId]/nights — list all nights with their accommodation */
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

  const nights = await getNightsWithAccommodations(tripId);
  return NextResponse.json(nights);
}

/**
 * PATCH /api/trips/[tripId]/nights — update night assignment or arrival/departure.
 *
 * Body variants:
 *   { date: "2026-04-13", accommodationId: string | null }
 *   { arrival: { name, address, lat, lng } | null }
 *   { departure: { name, address, lat, lng } | null }
 */
export async function PATCH(request: Request, { params }: RouteParams) {
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

  // ── Night assignment ──────────────────────────────────────────────
  if ("date" in body) {
    const { date, accommodationId } = body;
    if (typeof date !== "string") {
      return NextResponse.json(
        { error: "date must be a string (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    const night = await setNightAccommodation(
      tripId,
      new Date(date),
      accommodationId ?? null
    );
    return NextResponse.json(night);
  }

  // ── Arrival / departure ───────────────────────────────────────────
  if ("arrival" in body || "departure" in body) {
    const arrival = body.arrival ?? null;
    const departure = body.departure ?? null;

    const updated = await updateArrivalDeparture(tripId, {
      arrivalName: arrival?.name ?? null,
      arrivalAddress: arrival?.address ?? null,
      arrivalLat: arrival?.lat ?? null,
      arrivalLng: arrival?.lng ?? null,
      departureName: departure?.name ?? null,
      departureAddress: departure?.address ?? null,
      departureLat: departure?.lat ?? null,
      departureLng: departure?.lng ?? null,
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
}
