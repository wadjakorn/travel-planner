"use client";

import { Map } from "@vis.gl/react-google-maps";
import type { TripWithDays } from "@/types";
import { useTripStore } from "@/stores/trip-store";
import { MapPins } from "./map-pins";
import { RoutePolyline } from "./route-polyline";

interface MapViewProps {
  trip: TripWithDays;
}

const defaultCenter = { lat: 35.6762, lng: 139.6503 }; // Tokyo

export function MapView({ trip }: MapViewProps) {
  const { mapCenter, mapZoom, setMapCenter, setMapZoom } = useTripStore();

  const allSpots = trip.days.flatMap((d) => d.spots);
  const center =
    mapCenter ??
    (allSpots.length > 0
      ? {
          lat: allSpots.reduce((s, p) => s + p.lat, 0) / allSpots.length,
          lng: allSpots.reduce((s, p) => s + p.lng, 0) / allSpots.length,
        }
      : defaultCenter);

  return (
    <Map
      className="h-full w-full"
      defaultCenter={center}
      defaultZoom={mapZoom}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID"}
      onCameraChanged={(ev) => {
        setMapCenter(ev.detail.center);
        setMapZoom(ev.detail.zoom);
      }}
    >
      <MapPins trip={trip} />
      <RoutePolyline />
    </Map>
  );
}
