/**
 * Client-safe route cache utilities.
 * Mirror logic of route-cache.service.ts but with no Prisma imports —
 * safe to import in React components.
 */
import type { ActiveRoute, RouteLeg, TravelMode, LatLng } from "@/types";

// These types pick only what we need from the generated Prisma types
// (already present on the spot/day objects returned by the trip query)
interface CachedSpot {
  id: string;
  travelModeToNext: TravelMode | null;
  legDuration: string | null;
  legDistance: string | null;
  legPolyline: string | null;
}

interface CachedDay {
  id: string;
  defaultTravelMode: TravelMode;
  spots: CachedSpot[];
  startLegDuration: string | null;
  startLegDistance: string | null;
  startLegPolyline: string | null;
  endLegDuration: string | null;
  endLegDistance: string | null;
  endLegPolyline: string | null;
}

export function isCacheValidClient(
  day: CachedDay,
  startPoint: LatLng | null,
  endPoint: LatLng | null
): boolean {
  const spots = day.spots;
  if (spots.length < 2) return false;
  if (startPoint && !day.startLegPolyline) return false;
  if (endPoint && !day.endLegPolyline) return false;
  for (let i = 0; i < spots.length - 1; i++) {
    if (!spots[i].legPolyline) return false;
  }
  return true;
}

export function buildRouteFromCacheClient(
  day: CachedDay,
  startPoint: LatLng | null,
  endPoint: LatLng | null
): ActiveRoute | null {
  const spots = day.spots;
  const defaultMode = day.defaultTravelMode;
  const legs: RouteLeg[] = [];
  const parseSecs = (d: string) => parseInt(d.replace("s", ""), 10);

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

  for (let i = 0; i < spots.length - 1; i++) {
    const spot = spots[i];
    if (!spot.legPolyline || !spot.legDuration || !spot.legDistance) return null;
    legs.push({
      startSpotId: spot.id,
      endSpotId: spots[i + 1].id,
      duration: spot.legDuration,
      distance: spot.legDistance,
      polyline: spot.legPolyline,
      travelMode: (spot.travelModeToNext ?? defaultMode) as TravelMode,
    });
  }

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
