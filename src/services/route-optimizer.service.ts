import type { Spot } from "@/generated/prisma/client";
import type { ActiveRoute, RouteLeg, TravelMode } from "@/types";
import type { OptimizationMode } from "@/stores/trip-store";
import { TRAVEL_MODE_TO_GOOGLE } from "@/stores/trip-store";

const ROUTES_API_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

interface RoutesApiWaypoint {
  location: {
    latLng: {
      latitude: number;
      longitude: number;
    };
  };
}

interface RoutesApiLeg {
  duration: string;
  distanceMeters: number;
  polyline: { encodedPolyline: string };
}

function makeWaypoint(lat: number, lng: number): RoutesApiWaypoint {
  return { location: { latLng: { latitude: lat, longitude: lng } } };
}

// ─── Single-leg fetch (used for per-leg re-fetch on travel mode change) ────

export async function computeSingleLeg(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  travelMode: TravelMode
): Promise<{ duration: string; distance: string; polyline: string }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

  const googleMode = TRAVEL_MODE_TO_GOOGLE[travelMode];
  const isDrive = googleMode === "DRIVE";

  const body = {
    origin: makeWaypoint(origin.lat, origin.lng),
    destination: makeWaypoint(destination.lat, destination.lng),
    travelMode: googleMode,
    ...(isDrive ? { routingPreference: "TRAFFIC_AWARE" } : {}),
    computeAlternativeRoutes: false,
    languageCode: "en-US",
  };

  const response = await fetch(ROUTES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Routes API ${response.status}:`, error);
    throw new Error(`Routes API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const route = data.routes[0];
  return {
    duration: route.duration,
    distance: `${(route.distanceMeters / 1000).toFixed(1)} km`,
    polyline: route.polyline.encodedPolyline,
  };
}

// ─── Multi-leg route fetch ─────────────────────────────────────────────────

interface ComputeRouteOptions {
  /** Optimize waypoint order? (false = show-route, true = optimize) */
  optimize?: boolean;
  /** Travel mode for all legs (when no per-spot override is set). */
  defaultMode?: TravelMode;
  /** Optional fixed origin before the first spot (hotel / arrival location). */
  startPoint?: { lat: number; lng: number } | null;
  /** Optional fixed destination after the last spot (hotel / departure location). */
  endPoint?: { lat: number; lng: number } | null;
}

/**
 * Compute a route for all spots in a day.
 * When optimize=false, spots keep their current order and no reordering happens.
 * When optimize=true, the Google API reorders intermediate waypoints for best time.
 *
 * Per-leg travel modes: the function uses spot.travelModeToNext if set,
 * falling back to defaultMode. Because the Routes API only supports a single
 * travel mode per request, we split multi-mode days into sequential single-leg
 * fetches and aggregate the results.
 */
export async function computeRoute(
  spots: Spot[],
  options: ComputeRouteOptions = {}
): Promise<ActiveRoute> {
  const { optimize = false, defaultMode = "CAR", startPoint, endPoint } = options;

  if (spots.length < 2) {
    throw new Error("Need at least 2 spots to compute a route");
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

  // Determine the effective travel mode for each leg (spot[i] → spot[i+1]).
  // If ALL legs share the same mode, we can do one multi-waypoint request.
  // Otherwise we fall back to sequential single-leg requests.
  const legModes: TravelMode[] = spots.slice(0, -1).map((s) =>
    (s.travelModeToNext ?? defaultMode) as TravelMode
  );

  const allSameMode = legModes.every((m) => m === legModes[0]);
  const singleMode = allSameMode ? legModes[0] : null;

  // ── Path A: All legs same mode → single API call (may optimise order) ────
  let result: ActiveRoute;
  if (singleMode !== null) {
    result = await computeRouteSingleMode(spots, singleMode, optimize);
  } else {
    // ── Path B: Mixed modes → sequential single-leg requests (no optimise) ─
    result = await computeRouteMixedModes(spots, legModes);
  }

  // ── Endpoint legs (hotel → first spot and last spot → hotel) ─────────────
  // Computed in parallel; failures are non-fatal (silently skipped).
  const parseSecs = (d: string) => parseInt(d.replace("s", ""), 10);

  const orderedIds = result.orderedSpotIds ?? spots.map((s) => s.id);
  const firstSpot = spots.find((s) => s.id === orderedIds[0]) ?? spots[0];
  const lastSpot =
    spots.find((s) => s.id === orderedIds[orderedIds.length - 1]) ??
    spots[spots.length - 1];

  const [startLeg, endLeg] = await Promise.all([
    startPoint
      ? computeSingleLeg(startPoint, { lat: firstSpot.lat, lng: firstSpot.lng }, defaultMode)
          .then((r) => ({
            startSpotId: "__endpoint_start__",
            endSpotId: firstSpot.id,
            ...r,
            travelMode: defaultMode,
          } as RouteLeg))
          .catch(() => null)
      : Promise.resolve(null),
    endPoint
      ? computeSingleLeg({ lat: lastSpot.lat, lng: lastSpot.lng }, endPoint, defaultMode)
          .then((r) => ({
            startSpotId: lastSpot.id,
            endSpotId: "__endpoint_end__",
            ...r,
            travelMode: defaultMode,
          } as RouteLeg))
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  if (!startLeg && !endLeg) return result;

  const allLegs: RouteLeg[] = [
    ...(startLeg ? [startLeg] : []),
    ...result.legs,
    ...(endLeg ? [endLeg] : []),
  ];
  const totalSecs = allLegs.reduce((sum, l) => sum + parseSecs(l.duration), 0);
  const totalDistKm = allLegs.reduce(
    (sum, l) => sum + parseFloat(l.distance),
    0
  );

  return {
    ...result,
    legs: allLegs,
    totalDuration: `${totalSecs}s`,
    totalDistance: `${totalDistKm.toFixed(1)} km`,
  };
}

async function computeRouteSingleMode(
  spots: Spot[],
  travelMode: TravelMode,
  optimize: boolean
): Promise<ActiveRoute> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  const googleMode = TRAVEL_MODE_TO_GOOGLE[travelMode];
  const isDrive = googleMode === "DRIVE";

  const origin = makeWaypoint(spots[0].lat, spots[0].lng);
  const destination = makeWaypoint(
    spots[spots.length - 1].lat,
    spots[spots.length - 1].lng
  );
  const intermediates = spots.slice(1, -1).map((s) =>
    makeWaypoint(s.lat, s.lng)
  );

  const canOptimize = optimize && isDrive && intermediates.length > 0;

  const body = {
    origin,
    destination,
    ...(intermediates.length > 0 ? { intermediates } : {}),
    travelMode: googleMode,
    ...(isDrive ? { routingPreference: "TRAFFIC_AWARE" } : {}),
    ...(canOptimize ? { optimizeWaypointOrder: true } : {}),
    computeAlternativeRoutes: false,
    languageCode: "en-US",
  };

  const response = await fetch(ROUTES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.optimizedIntermediateWaypointIndex,routes.polyline.encodedPolyline,routes.duration,routes.distanceMeters,routes.legs.duration,routes.legs.distanceMeters,routes.legs.polyline.encodedPolyline",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Routes API ${response.status}:`, error);
    throw new Error(`Routes API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const route = data.routes[0];

  // Reorder spots based on optimized waypoint order (only for DRIVE + optimized)
  const optimizedOrder: number[] =
    route.optimizedIntermediateWaypointIndex ?? [];
  const orderedSpotIds = canOptimize
    ? [
        spots[0].id,
        ...optimizedOrder.map((i: number) => spots[i + 1].id),
        spots[spots.length - 1].id,
      ]
    : spots.map((s) => s.id);

  const legs: RouteLeg[] = route.legs.map(
    (leg: RoutesApiLeg, i: number) => ({
      startSpotId: orderedSpotIds[i],
      endSpotId: orderedSpotIds[i + 1],
      duration: leg.duration,
      distance: `${(leg.distanceMeters / 1000).toFixed(1)} km`,
      polyline: leg.polyline.encodedPolyline,
      travelMode,
    })
  );

  // Sum durations (format: "Xs")
  const totalSecs = legs.reduce(
    (sum, l) => sum + parseInt(l.duration.replace("s", ""), 10),
    0
  );
  const totalDistKm = legs.reduce(
    (sum, l) => sum + parseFloat(l.distance),
    0
  );

  return {
    orderedSpotIds: canOptimize ? orderedSpotIds : null,
    totalDuration: `${totalSecs}s`,
    totalDistance: `${totalDistKm.toFixed(1)} km`,
    legs,
    wasOptimized: canOptimize,
  };
}

async function computeRouteMixedModes(
  spots: Spot[],
  legModes: TravelMode[]
): Promise<ActiveRoute> {
  const legResults = await Promise.all(
    spots.slice(0, -1).map((spot, i) =>
      computeSingleLeg(
        { lat: spot.lat, lng: spot.lng },
        { lat: spots[i + 1].lat, lng: spots[i + 1].lng },
        legModes[i]
      ).then((r) => ({
        ...r,
        startSpotId: spot.id,
        endSpotId: spots[i + 1].id,
        travelMode: legModes[i],
      }))
    )
  );

  const legs: RouteLeg[] = legResults;
  const totalSecs = legs.reduce(
    (sum, l) => sum + parseInt(l.duration.replace("s", ""), 10),
    0
  );
  const totalDistKm = legs.reduce(
    (sum, l) => sum + parseFloat(l.distance),
    0
  );

  return {
    orderedSpotIds: null,
    totalDuration: `${totalSecs}s`,
    totalDistance: `${totalDistKm.toFixed(1)} km`,
    legs,
    wasOptimized: false,
  };
}

// ─── Legacy optimizeRoute wrapper (kept for backward compat) ──────────────

export async function optimizeRoute(
  spots: Spot[],
  mode: OptimizationMode
): Promise<ActiveRoute> {
  const defaultMode: TravelMode = mode === "comfort" ? "TRANSIT" : "CAR";
  return computeRoute(spots, { optimize: true, defaultMode });
}
