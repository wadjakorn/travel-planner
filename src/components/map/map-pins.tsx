"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { TripWithDays } from "@/types";
import type { SpotType } from "@/generated/prisma/client";
import { useTripStore } from "@/stores/trip-store";

interface MapPinsProps {
  trip: TripWithDays;
}

const PIN_COLORS: Record<SpotType, string> = {
  ATTRACTION: "var(--map-pin-attraction)",
  HOTEL: "var(--map-pin-hotel)",
  RESTAURANT: "var(--map-pin-food)",
  CAFE: "var(--map-pin-food)",
  SHOPPING: "var(--map-pin-shopping)",
  TRANSPORT: "var(--map-pin-transport)",
  CUSTOM: "var(--map-pin-custom)",
};

export function MapPins({ trip }: MapPinsProps) {
  const { selectedDayId, selectedSpotId, setSelectedSpot } = useTripStore();

  const visibleSpots = selectedDayId
    ? trip.days.find((d) => d.id === selectedDayId)?.spots ?? []
    : trip.days.flatMap((d) => d.spots);

  return (
    <>
      {visibleSpots.map((spot, index) => (
        <AdvancedMarker
          key={spot.id}
          position={{ lat: spot.lat, lng: spot.lng }}
          onClick={() => setSelectedSpot(spot.id)}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md"
            style={{
              backgroundColor: PIN_COLORS[spot.type],
              transform:
                selectedSpotId === spot.id ? "scale(1.3)" : "scale(1)",
              transition: "transform 150ms ease",
            }}
          >
            {index + 1}
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}
