import { auth } from "@/lib/auth";
import { getTripById } from "@/services/trip.service";
import { reorderSpots, moveSpotToDay } from "@/services/spot.service";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ tripId: string; dayId: string }>;
}

/**
 * PATCH /api/trips/[tripId]/days/[dayId]/spots/reorder
 *
 * Body shapes:
 *  { spotIds: string[] }                         — reorder within this day
 *  { spotId: string; targetDayId: string; sortOrder: number } — move to another day
 */
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

  const body = await request.json();

  // Move spot to a different day
  if (body.spotId && body.targetDayId !== undefined) {
    const targetDay = trip.days.find((d) => d.id === body.targetDayId);
    if (!targetDay) {
      return NextResponse.json({ error: "Target day not found" }, { status: 404 });
    }
    await moveSpotToDay(body.spotId, body.targetDayId, body.sortOrder ?? 0);
    return NextResponse.json({ ok: true });
  }

  // Reorder within day
  if (Array.isArray(body.spotIds)) {
    await reorderSpots(body.spotIds);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid body" }, { status: 400 });
}
