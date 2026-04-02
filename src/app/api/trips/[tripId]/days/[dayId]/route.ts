import { getSession as auth } from "@/lib/get-session";
import { getTripById } from "@/services/trip.service";
import { clearDayRouteCache } from "@/services/route-cache.service";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { TravelMode } from "@/generated/prisma/client";

interface RouteParams {
  params: Promise<{ tripId: string; dayId: string }>;
}

const VALID_TRAVEL_MODES: TravelMode[] = ["CAR", "WALK", "TRANSIT", "BICYCLE"];

/** PATCH /api/trips/[tripId]/days/[dayId] — update day-level settings */
export async function PATCH(request: Request, { params }: RouteParams) {
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

  const body = await request.json().catch(() => ({}));
  const { defaultTravelMode } = body;

  if (
    defaultTravelMode !== undefined &&
    !VALID_TRAVEL_MODES.includes(defaultTravelMode)
  ) {
    return NextResponse.json(
      { error: "invalid defaultTravelMode" },
      { status: 400 }
    );
  }

  const updated = await prisma.tripDay.update({
    where: { id: dayId },
    data: {
      ...(defaultTravelMode !== undefined ? { defaultTravelMode } : {}),
    },
  });

  // Travel mode change invalidates all cached legs for the day
  if (defaultTravelMode !== undefined) {
    clearDayRouteCache(dayId).catch(() => {});
  }

  return NextResponse.json(updated);
}
