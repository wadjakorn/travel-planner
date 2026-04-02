import { getSession as auth } from "@/lib/get-session";
import { getTripById } from "@/services/trip.service";
import { computeRoute } from "@/services/route-optimizer.service";
import {
  isCacheValid,
  buildRouteFromCache,
  persistRouteLegs,
} from "@/services/route-cache.service";
import { NextResponse } from "next/server";
import type { TravelMode } from "@/generated/prisma/client";

interface RouteParams {
  params: Promise<{ tripId: string; dayId: string }>;
}

const VALID_TRAVEL_MODES: TravelMode[] = ["CAR", "WALK", "TRANSIT", "BICYCLE"];

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
      { error: "Need at least 2 spots to compute a route" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const rawMode = body.defaultMode ?? day.defaultTravelMode ?? "CAR";
  const defaultMode: TravelMode = VALID_TRAVEL_MODES.includes(rawMode) ? rawMode : "CAR";
  const startPoint = body.startPoint ?? null;
  const endPoint = body.endPoint ?? null;
  const force: boolean = body.force ?? false;

  // ── Serve from cache if valid ─────────────────────────────────────
  if (!force && isCacheValid(day, startPoint, endPoint)) {
    const cached = buildRouteFromCache(day, defaultMode, startPoint, endPoint);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  // ── Compute fresh from Google Routes API ──────────────────────────
  let result;
  try {
    result = await computeRoute(day.spots, { optimize: false, defaultMode, startPoint, endPoint });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[show-route]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Persist asynchronously (don't block the response)
  persistRouteLegs(dayId, result).catch((e) =>
    console.error("[show-route] persistRouteLegs failed:", e)
  );

  return NextResponse.json(result);
}
