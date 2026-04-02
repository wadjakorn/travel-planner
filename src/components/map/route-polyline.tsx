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
 * Returns the default polyline options for a leg at a given index.
 * Solid legs use strokeOpacity; dashed/dotted legs use icons with opacity=0 base.
 */
function getDefaultOptions(i: number, color: string): google.maps.PolylineOptions {
  const pattern = i % 4;

  if (pattern === 0) {
    // Solid
    return { strokeColor: color, strokeOpacity: 0.85, strokeWeight: 4, icons: [] };
  }
  if (pattern === 1) {
    // Dashed
    return {
      strokeColor: color,
      strokeOpacity: 0,
      strokeWeight: 4,
      icons: [
        {
          icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: color, scale: 2 },
          offset: "0",
          repeat: "12px",
        },
      ],
    };
  }
  if (pattern === 2) {
    // Dotted
    return {
      strokeColor: color,
      strokeOpacity: 0,
      strokeWeight: 4,
      icons: [
        {
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            strokeOpacity: 1,
            strokeColor: color,
            fillColor: color,
            fillOpacity: 1,
            scale: 2,
          },
          offset: "0",
          repeat: "8px",
        },
      ],
    };
  }
  // Dash-dot
  return {
    strokeColor: color,
    strokeOpacity: 0,
    strokeWeight: 4,
    icons: [
      {
        icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: color, scale: 2 },
        offset: "0",
        repeat: "16px",
      },
      {
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          strokeOpacity: 1,
          strokeColor: color,
          fillColor: color,
          fillOpacity: 1,
          scale: 2,
        },
        offset: "8px",
        repeat: "16px",
      },
    ],
  };
}

/**
 * Renders the active route as multi-color polylines on the map.
 * Each leg uses a distinct color + dash pattern so overlapping legs are distinguishable.
 * Hovering a connector row in the sidebar (or the polyline itself) highlights that leg.
 */
export function RoutePolyline() {
  const map = useMap();
  const { activeRoute, hoveredLegIndex, setHoveredLegIndex } = useTripStore();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const colorsRef = useRef<string[]>([]);

  // Build polylines when route changes
  useEffect(() => {
    if (!map) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    colorsRef.current = [];

    if (!activeRoute?.legs?.length) return;

    const bounds = new google.maps.LatLngBounds();

    activeRoute.legs.forEach((leg, i) => {
      if (!leg.polyline) return;

      const path = google.maps.geometry.encoding.decodePath(leg.polyline);
      const colorVar = LEG_COLOR_VARS[i % LEG_COLOR_VARS.length];
      const color = getCssVar(colorVar) || "#3b82f6";

      colorsRef.current[i] = color;

      const polyline = new google.maps.Polyline({
        path,
        map,
        geodesic: true,
        zIndex: i,
        ...getDefaultOptions(i, color),
      });

      polyline.addListener("mouseover", () => setHoveredLegIndex(i));
      polyline.addListener("mouseout", () => setHoveredLegIndex(null));
      polyline.addListener("click", () => {
        setHoveredLegIndex(i);
        document
          .querySelector(`[data-leg-index="${i}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      polylinesRef.current.push(polyline);
      path.forEach((pt) => bounds.extend(pt));
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 80);
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      colorsRef.current = [];
    };
  }, [map, activeRoute, setHoveredLegIndex]);

  // Reactively update polyline opacity/weight when hovered leg changes
  useEffect(() => {
    polylinesRef.current.forEach((polyline, i) => {
      const color = colorsRef.current[i] || "#3b82f6";
      if (hoveredLegIndex === null) {
        // Restore defaults
        polyline.setOptions(getDefaultOptions(i, color));
      } else if (hoveredLegIndex === i) {
        // Highlighted — always solid, thicker
        polyline.setOptions({ strokeOpacity: 1, strokeWeight: 6, icons: [] });
      } else {
        // Dimmed
        polyline.setOptions({ strokeOpacity: 0.15, strokeWeight: 3, icons: [] });
      }
    });
  }, [hoveredLegIndex]);

  return null;
}
