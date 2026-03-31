"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TripDayWithSpots } from "@/types";
import { useTripStore } from "@/stores/trip-store";
import { SpotCard } from "./spot-card";
import { AddSpotSearch } from "@/components/map/add-spot-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAddSpot } from "@/hooks/use-trip";

interface DayCardProps {
  day: TripDayWithSpots;
  dayNumber: number;
  tripId: string;
}

export function DayCard({ day, dayNumber, tripId }: DayCardProps) {
  const { selectedDayId, setSelectedDay } = useTripStore();
  const isSelected = selectedDayId === day.id;
  const addSpot = useAddSpot();

  // Make the whole card a drop target so spots can be dragged into empty days
  const { setNodeRef } = useDroppable({ id: day.id });

  return (
    <Card
      className={`transition-colors ${isSelected ? "ring-2 ring-primary" : ""}`}
    >
      <CardHeader
        className="pb-2 cursor-pointer"
        onClick={() => setSelectedDay(isSelected ? null : day.id)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Day {dayNumber}</CardTitle>
          <Badge variant="secondary">
            {new Date(day.date).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <SortableContext
          id={day.id}
          items={day.spots.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={setNodeRef} className="space-y-2 min-h-[4px]">
            {day.spots.length === 0 ? (
              <p className="text-sm text-muted-foreground py-1">
                No spots yet — search below to add one.
              </p>
            ) : (
              day.spots.map((spot, index) => (
                <SpotCard key={spot.id} spot={spot} tripId={tripId} index={index} />
              ))
            )}
          </div>
        </SortableContext>

        {/* Place search — only shown when this day is selected or always visible */}
        <div onClick={(e) => e.stopPropagation()}>
          <AddSpotSearch
            onAdd={(place) =>
              addSpot.mutate({
                tripId,
                dayId: day.id,
                name: place.name,
                lat: place.lat,
                lng: place.lng,
                type: place.type,
                placeId: place.placeId,
                address: place.address,
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
