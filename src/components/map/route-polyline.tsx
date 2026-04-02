"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { useTripStore } from "@/stores/trip-store";

/**
 * Route leg color palette — 8 CSS variable colors, cycling for >8 legs.
 * Values must be resolvable at runtime from the document root.
 */
const LEG_COLOR_VARS = [
  "--route-leg-1",
  "--route-leg-2",
  "--route-leg-3",
  "--route-leg-4",
  "--route-leg-5",
  "--route-leg-6",
  "--route-leg-7",
  "--route-leg-8",
] as const;

function getCssVar(name: string): string {
  if (typeof document === "undefined") return "#000";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Renders the active route as multi-color polylines on the map.
 * Each leg (spot A → spot B) uses a distinct color from the fixed palette.
 * Reads route legs from the Zustand store.
 */
export function RoutePolyline() {
  const map = useMap();
  const { activeRoute } = useTripStore();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clean up previous polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!activeRoute?.legs?.length) return;

    const bounds = new google.maps.LatLngBounds();

    activeRoute.legs.forEach((leg, i) => {
      if (!leg.polyline) return;

      const path = google.maps.geometry.encoding.decodePath(leg.polyline);
      const colorVar = LEG_COLOR_VARS[i % LEG_COLOR_VARS.length];
      const strokeColor = getCssVar(colorVar);

      const polyline = new google.maps.Polyline({
        path,
        map,
        strokeColor: strokeColor || "#3b82f6",
        strokeOpacity: 0.85,
        strokeWeight: 4,
        geodesic: true,
        zIndex: i,
      });

      polylinesRef.current.push(polyline);
      path.forEach((pt) => bounds.extend(pt));
    });

    // Pan and zoom to fit the entire route
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 80);
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, activeRoute]);

  return null;
}
