import { prisma } from "@/lib/prisma";
import type { ActiveRoute, RouteLeg, TravelMode } from "@/types";
import type { TripDayWithSpots } from "@/types";
import type { LatLng } from "@/types";

// ─── Persist ──────────────────────────────────────────────────────────────

/**
 * Write all leg data from a computed route back to the database.
 * - Legs with `startSpotId` matching a real spot → stored on that Spot row
 * - Leg with `startSpotId === "__endpoint_start__"` → stored on TripDay.startLeg*
 * - Leg with `startSpotId` === last real spot AND `endSpotId === "__endpoint_end__"` → stored on TripDay.endLeg*
 */
export async function persistRouteLegs(
  dayId: string,
  route: ActiveRoute
): Promise<void> {
  const updates: ReturnType<typeof prisma.spot.update | typeof prisma.tripDay.update>[] = [];

  for (const leg of route.legs) {
    if (leg.startSpotId === "__endpoint_start__") {
      updates.push(
        prisma.tripDay.update({
          where: { id: dayId },
          data: {
            startLegDuration: leg.duration,
            startLegDistance: leg.distance,
            startLegPolyline: leg.polyline,
          },
        })
      );
    } else if (leg.endSpotId === "__endpoint_end__") {
      updates.push(
        prisma.tripDay.update({
          where: { id: dayId },
          data: {
            endLegDuration: leg.duration,
            endLegDistance: leg.distance,
            endLegPolyline: leg.polyline,
          },
        })
      );
    } else {
      // Regular spot-to-spot leg — store on the start spot
      updates.push(
        prisma.spot.update({
          where: { id: leg.startSpotId },
          data: {
            legDuration: leg.duration,
            legDistance: leg.distance,
            legPolyline: leg.polyline,
          },
        })
      );
    }
  }

  // If no endpoint legs were in this route, explicitly clear any stale endpoint cache
  const hasStartEndpoint = route.legs.some(
    (l) => l.startSpotId === "__endpoint_start__"
  );
  const hasEndEndpoint = route.legs.some(
    (l) => l.endSpotId === "__endpoint_end__"
  );

  if (!hasStartEndpoint || !hasEndEndpoint) {
    updates.push(
      prisma.tripDay.update({
        where: { id: dayId },
        data: {
          ...(!hasStartEndpoint
            ? { startLegDuration: null, startLegDistance: null, startLegPolyline: null }
            : {}),
          ...(!hasEndEndpoint
            ? { endLegDuration: null, endLegDistance: null, endLegPolyline: null }
            : {}),
        },
      })
    );
  }

  if (updates.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(updates as any);
  }
}

// ─── Build from cache ──────────────────────────────────────────────────────

/**
 * Reconstruct an ActiveRoute entirely from cached DB fields.
 * Returns null if any expected leg is missing (cache incomplete).
 */
export function buildRouteFromCache(
  day: TripDayWithSpots,
  defaultMode: TravelMode,
  startPoint: LatLng | null,
  endPoint: LatLng | null
): ActiveRoute | null {
  const legs: RouteLeg[] = [];
  const spots = day.spots;
  const parseSecs = (d: string) => parseInt(d.replace("s", ""), 10);

  // Start endpoint leg
  if (startPoint) {
    if (!day.startLegPolyline || !day.startLegDuration || !day.startLegDistance) {
      return null;
    }
    legs.push({
      startSpotId: "__endpoint_start__",
      endSpotId: spots[0].id,
      duration: day.startLegDuration,
      distance: day.startLegDistance,
      polyline: day.startLegPolyline,
      travelMode: defaultMode,
    });
  }

  // Spot-to-spot legs (all spots except last need a cached leg)
  for (let i = 0; i < spots.length - 1; i++) {
    const spot = spots[i];
    if (!spot.legPolyline || !spot.legDuration || !spot.legDistance) {
      return null;
    }
    legs.push({
      startSpotId: spot.id,
      endSpotId: spots[i + 1].id,
      duration: spot.legDuration,
      distance: spot.legDistance,
      polyline: spot.legPolyline,
      travelMode: (spot.travelModeToNext ?? defaultMode) as TravelMode,
    });
  }

  // End endpoint leg
  if (endPoint) {
    if (!day.endLegPolyline || !day.endLegDuration || !day.endLegDistance) {
      return null;
    }
    legs.push({
      startSpotId: spots[spots.length - 1].id,
      endSpotId: "__endpoint_end__",
      duration: day.endLegDuration,
      distance: day.endLegDistance,
      polyline: day.endLegPolyline,
      travelMode: defaultMode,
    });
  }

  if (legs.length === 0) return null;

  const totalSecs = legs.reduce((sum, l) => sum + parseSecs(l.duration), 0);
  const totalDistKm = legs.reduce((sum, l) => sum + parseFloat(l.distance), 0);

  return {
    orderedSpotIds: null,
    totalDuration: `${totalSecs}s`,
    totalDistance: `${totalDistKm.toFixed(1)} km`,
    legs,
    wasOptimized: false,
  };
}

// ─── Validate cache ────────────────────────────────────────────────────────

/**
 * Returns true if all expected legs are cached and no spots-without-legs exist.
 * Only checks for presence of polyline (the most expensive field to compute).
 */
export function isCacheValid(
  day: TripDayWithSpots,
  startPoint: LatLng | null,
  endPoint: LatLng | null
): boolean {
  const spots = day.spots;
  if (spots.length < 2) return false;

  // Endpoint legs
  if (startPoint && !day.startLegPolyline) return false;
  if (endPoint && !day.endLegPolyline) return false;

  // Spot-to-spot legs (all but last spot need a cached leg)
  for (let i = 0; i < spots.length - 1; i++) {
    if (!spots[i].legPolyline) return false;
  }

  return true;
}

// ─── Clear cache ───────────────────────────────────────────────────────────

/** Clear all leg cache for every spot in a day + the day's endpoint legs. */
export async function clearDayRouteCache(dayId: string): Promise<void> {
  await prisma.$transaction([
    prisma.spot.updateMany({
      where: { tripDayId: dayId },
      data: { legDuration: null, legDistance: null, legPolyline: null },
    }),
    prisma.tripDay.update({
      where: { id: dayId },
      data: {
        startLegDuration: null,
        startLegDistance: null,
        startLegPolyline: null,
        endLegDuration: null,
        endLegDistance: null,
        endLegPolyline: null,
      },
    }),
  ]);
}

/** Clear only the cached leg for a single spot (spot → next spot). */
export async function clearSpotLegCache(spotId: string): Promise<void> {
  await prisma.spot.update({
    where: { id: spotId },
    data: { legDuration: null, legDistance: null, legPolyline: null },
  });
}

/** Clear only the endpoint legs for a day (used when accommodation changes). */
export async function clearDayEndpointLegCache(dayId: string): Promise<void> {
  await prisma.tripDay.update({
    where: { id: dayId },
    data: {
      startLegDuration: null,
      startLegDistance: null,
      startLegPolyline: null,
      endLegDuration: null,
      endLegDistance: null,
      endLegPolyline: null,
    },
  });
}
