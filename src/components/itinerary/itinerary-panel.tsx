"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { TripWithDays, TripDayWithSpots } from "@/types";
import type { Spot } from "@/generated/prisma/client";
import { useReorderSpots, useMoveSpot } from "@/hooks/use-trip";
import { fmtDate } from "@/lib/format-date";
import { DayCard } from "./day-card";
import { AccommodationPanel } from "./accommodation-panel";
import { ShareButton } from "@/components/trip/share-button";
import { Button } from "@/components/ui/button";
import { CalendarArrowDown } from "lucide-react";

interface ItineraryPanelProps {
  trip: TripWithDays;
}

export function ItineraryPanel({ trip }: ItineraryPanelProps) {
  const reorderSpots = useReorderSpots();
  const moveSpot = useMoveSpot();

  const [localDays, setLocalDays] = useState<TripDayWithSpots[]>(trip.days);
  const [activeSpot, setActiveSpot] = useState<Spot | null>(null);

  if (localDays !== trip.days && !activeSpot) {
    setLocalDays(trip.days);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findDayBySpotId = useCallback(
    (spotId: string, days: TripDayWithSpots[]) =>
      days.find((d) => d.spots.some((s) => s.id === spotId)) ?? null,
    []
  );

  function onDragStart({ active }: DragStartEvent) {
    const day = findDayBySpotId(String(active.id), localDays);
    setActiveSpot(day?.spots.find((s) => s.id === active.id) ?? null);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const sourceDay = findDayBySpotId(activeId, localDays);
    const targetDay =
      findDayBySpotId(overId, localDays) ??
      localDays.find((d) => d.id === overId) ??
      null;
    if (!sourceDay || !targetDay || sourceDay.id === targetDay.id) return;

    setLocalDays((prev) =>
      prev.map((d) => {
        if (d.id === sourceDay.id) {
          return { ...d, spots: d.spots.filter((s) => s.id !== activeId) };
        }
        if (d.id === targetDay.id) {
          const spot = sourceDay.spots.find((s) => s.id === activeId)!;
          const overIndex = d.spots.findIndex((s) => s.id === overId);
          const insertAt = overIndex >= 0 ? overIndex : d.spots.length;
          const newSpots = [...d.spots];
          newSpots.splice(insertAt, 0, spot);
          return { ...d, spots: newSpots };
        }
        return d;
      })
    );
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveSpot(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const sourceDay = findDayBySpotId(activeId, localDays);
    const targetDay =
      findDayBySpotId(overId, localDays) ??
      localDays.find((d) => d.id === overId) ??
      null;
    if (!sourceDay || !targetDay) return;

    if (sourceDay.id === targetDay.id) {
      const oldIndex = sourceDay.spots.findIndex((s) => s.id === activeId);
      const newIndex = sourceDay.spots.findIndex((s) => s.id === overId);
      if (oldIndex === newIndex) return;
      const reordered = arrayMove(sourceDay.spots, oldIndex, newIndex);
      setLocalDays((prev) =>
        prev.map((d) =>
          d.id === sourceDay.id ? { ...d, spots: reordered } : d
        )
      );
      reorderSpots.mutate({
        tripId: trip.id,
        dayId: sourceDay.id,
        spotIds: reordered.map((s) => s.id),
      });
    } else {
      const newSortOrder = targetDay.spots.findIndex((s) => s.id === activeId);
      moveSpot.mutate({
        tripId: trip.id,
        sourceDayId: sourceDay.id,
        targetDayId: targetDay.id,
        spotId: activeId,
        sortOrder: newSortOrder >= 0 ? newSortOrder : targetDay.spots.length,
      });
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">{trip.title}</h2>
            <p className="text-sm text-muted-foreground">
              {fmtDate(trip.startDate)} &mdash;{" "}
              {fmtDate(trip.endDate)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ShareButton tripId={trip.id} shareToken={trip.shareToken} />
            <a href={`/api/trips/${trip.id}/export`} download>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Export to calendar"
              >
                <CalendarArrowDown className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Scrollable body: accommodation panel + day list */}
      <div className="flex-1 overflow-y-auto">
        {/* Accommodation panel */}
        <div className="border-b">
          <AccommodationPanel trip={trip} />
        </div>

        {/* Day list with drag-and-drop */}
        <div className="p-4 space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            {localDays.map((day, index) => (
              <DayCard
                key={day.id}
                day={day}
                dayNumber={index + 1}
                tripId={trip.id}
              />
            ))}

            <DragOverlay>
              {activeSpot ? (
                <div className="rounded-md border bg-background shadow-xl px-3 py-2 text-sm font-medium cursor-grabbing">
                  {activeSpot.name}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
