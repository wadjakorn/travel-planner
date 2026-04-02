"use client";

import { useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import type { TripWithDays } from "@/types";
import { MapView } from "@/components/map/map-view";
import { ItineraryPanel } from "@/components/itinerary/itinerary-panel";
import { useTripQuery } from "@/hooks/use-trip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { List } from "lucide-react";

const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 1080;
const DEFAULT_SIDEBAR_WIDTH = 384; // w-96

interface TripViewProps {
  trip: TripWithDays;
}

export function TripView({ trip }: TripViewProps) {
  const { data } = useTripQuery(trip.id, trip);
  const liveTrip = data ?? trip;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;

    function onMove(ev: MouseEvent) {
      setSidebarWidth(
        Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startW + ev.clientX - startX))
      );
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <APIProvider
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
      libraries={["places", "geometry"]}
    >
      <div className="flex h-full">
        {/* Desktop sidebar — resizable */}
        <div
          className="hidden shrink-0 overflow-y-auto border-r md:flex md:flex-col"
          style={{ width: sidebarWidth }}
        >
          <ItineraryPanel trip={liveTrip} />
        </div>

        {/* Drag handle */}
        <div
          className="hidden md:block w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors"
          onMouseDown={startResize}
        />

        {/* Map fills the rest */}
        <div className="relative flex-1">
          <MapView trip={liveTrip} />

          {/* Mobile: floating button to open itinerary Sheet */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:hidden">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90">
                <List className="h-4 w-4" />
                Itinerary
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] overflow-y-auto p-0">
                <ItineraryPanel trip={liveTrip} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
