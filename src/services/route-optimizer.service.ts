import type { Spot } from "@/generated/prisma/client";
import type { OptimizedRoute } from "@/types";
import type { OptimizationMode } from "@/stores/trip-store";

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

export async function optimizeRoute(
  spots: Spot[],
  mode: OptimizationMode
): Promise<OptimizedRoute> {
  if (spots.length < 2) {
    throw new Error("Need at least 2 spots to optimize a route");
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const origin: RoutesApiWaypoint = {
    location: {
      latLng: { latitude: spots[0].lat, longitude: spots[0].lng },
    },
  };

  const destination: RoutesApiWaypoint = {
    location: {
      latLng: {
        latitude: spots[spots.length - 1].lat,
        longitude: spots[spots.length - 1].lng,
      },
    },
  };

  const intermediates: RoutesApiWaypoint[] = spots.slice(1, -1).map((s) => ({
    location: {
      latLng: { latitude: s.lat, longitude: s.lng },
    },
  }));

  const travelMode = mode === "comfort" ? "TRANSIT" : "DRIVE";
  const routingPreference =
    mode === "time" ? "TRAFFIC_AWARE" : "TRAFFIC_AWARE";

  const body = {
    origin,
    destination,
    intermediates,
    travelMode,
    routingPreference,
    optimizeWaypointOrder: true,
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
    throw new Error(`Routes API error: ${error}`);
  }

  const data = await response.json();
  const route = data.routes[0];

  // Reorder spots based on optimized waypoint order
  const optimizedOrder = route.optimizedIntermediateWaypointIndex ?? [];
  const orderedSpotIds = [
    spots[0].id,
    ...optimizedOrder.map((i: number) => spots[i + 1].id),
    spots[spots.length - 1].id,
  ];

  const legs = route.legs.map(
    (leg: { duration: string; distanceMeters: number; polyline: { encodedPolyline: string } }, i: number) => ({
      startSpotId: orderedSpotIds[i],
      endSpotId: orderedSpotIds[i + 1],
      duration: leg.duration,
      distance: `${(leg.distanceMeters / 1000).toFixed(1)} km`,
      polyline: leg.polyline.encodedPolyline,
    })
  );

  return {
    orderedSpotIds,
    polyline: route.polyline.encodedPolyline,
    totalDuration: route.duration,
    totalDistance: `${(route.distanceMeters / 1000).toFixed(1)} km`,
    legs,
  };
}
