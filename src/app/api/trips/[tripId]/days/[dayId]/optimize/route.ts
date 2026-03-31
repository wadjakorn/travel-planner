import { getSession as auth } from "@/lib/get-session";
import { getTripById } from "@/services/trip.service";
import { optimizeRoute } from "@/services/route-optimizer.service";
import { reorderSpots } from "@/services/spot.service";
import { NextResponse } from "next/server";
import type { OptimizationMode } from "@/stores/trip-store";

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
  const mode: OptimizationMode =
    body.mode === "comfort" ? "comfort" : "time";

  let result;
  try {
    result = await optimizeRoute(day.spots, mode);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[optimize]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Persist the new spot order back to the DB
  await reorderSpots(result.orderedSpotIds);

  return NextResponse.json(result);
}
