import { getSession as auth } from "@/lib/get-session";
import { getTripById } from "@/services/trip.service";
import { computeRoute } from "@/services/route-optimizer.service";
import { reorderSpots } from "@/services/spot.service";
import { NextResponse } from "next/server";
import type { TravelMode } from "@/generated/prisma/client";

interface RouteParams {
  params: Promise<{ tripId: string; dayId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId, dayId } = await params;
  const trip = await getTripById(tripId, session.user.id);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const day = trip.days.find((d) => d.id === dayId);
  if (!day) {
    return NextResponse.json({ error: "Day not found" }, { status: 404 });
  }

  if (day.spots.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 spots to optimize" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  // "time" → CAR, "comfort" → TRANSIT (legacy mode names), or direct TravelMode
  const rawMode = body.mode ?? "time";
  const defaultMode: TravelMode =
    rawMode === "comfort" ? "TRANSIT" : rawMode === "time" ? "CAR" : rawMode;
  const startPoint = body.startPoint ?? null;
  const endPoint = body.endPoint ?? null;

  let result;
  try {
    result = await computeRoute(day.spots, { optimize: true, defaultMode, startPoint, endPoint });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[optimize]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Persist the new spot order back to the DB (only when actually optimized)
  if (result.wasOptimized && result.orderedSpotIds) {
    await reorderSpots(result.orderedSpotIds);
  }

  return NextResponse.json(result);
}
