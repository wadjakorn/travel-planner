"use client";

import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { MapPins } from "@/components/map/map-pins";
import type { TripWithDays } from "@/types";

interface ShareMapProps {
  trip: TripWithDays;
  center: { lat: number; lng: number };
}

export function ShareMap({ trip, center }: ShareMapProps) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
      <Map
        className="h-full w-full"
        defaultCenter={center}
        defaultZoom={13}
        gestureHandling="greedy"
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID"}
      >
        <MapPins trip={trip} />
      </Map>
    </APIProvider>
  );
}
