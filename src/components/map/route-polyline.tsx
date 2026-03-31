"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { useTripStore } from "@/stores/trip-store";

/**
 * Renders the optimized route as a polyline on the map.
 * Reads the encoded polyline from the Zustand store and decodes it
 * using the google.maps.geometry library.
 */
export function RoutePolyline() {
  const map = useMap();
  const { optimizedRoute } = useTripStore();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    // Clean up any previous polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!optimizedRoute?.polyline) return;

    // Decode the encoded polyline string into LatLng array
    const path = google.maps.geometry.encoding.decodePath(
      optimizedRoute.polyline
    );

    polylineRef.current = new google.maps.Polyline({
      path,
      map,
      strokeColor: "var(--color-primary, #000)",
      strokeOpacity: 0.8,
      strokeWeight: 4,
      geodesic: true,
    });

    return () => {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
    };
  }, [map, optimizedRoute]);

  return null;
}
