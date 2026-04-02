"use client";

import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Spot } from "@/generated/prisma/client";
import { useTripStore } from "@/stores/trip-store";
import { useDeleteSpot, useUpdateSpot } from "@/hooks/use-trip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Clock } from "lucide-react";

interface SpotCardProps {
  spot: Spot;
  tripId: string;
  index: number;
}

const SPOT_TYPE_LABELS: Record<Spot["type"], string> = {
  ATTRACTION: "Attraction",
  HOTEL: "Hotel",
  RESTAURANT: "Restaurant",
  CAFE: "Café",
  SHOPPING: "Shopping",
  TRANSPORT: "Transport",
  CUSTOM: "Custom",
};

/** Format stayMinutes → "1h 30m" / "45m" */
function formatStay(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function SpotCard({ spot, tripId, index }: SpotCardProps) {
  const { selectedSpotId, setSelectedSpot, setMapCenter } = useTripStore();
  const isSelected = selectedSpotId === spot.id;
  const deleteSpot = useDeleteSpot();
  const updateSpot = useUpdateSpot();

  // Inline stay-time editing
  const [editingStay, setEditingStay] = useState(false);
  const [stayDraft, setStayDraft] = useState(String(spot.stayMinutes ?? 60));
  const stayInputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: spot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function startEditingStay(e: React.MouseEvent) {
    e.stopPropagation();
    setStayDraft(String(spot.stayMinutes ?? 60));
    setEditingStay(true);
    setTimeout(() => stayInputRef.current?.select(), 0);
  }

  function commitStay() {
    const mins = parseInt(stayDraft, 10);
    if (!isNaN(mins) && mins > 0 && mins !== spot.stayMinutes) {
      updateSpot.mutate({ spotId: spot.id, tripId, stayMinutes: mins });
    }
    setEditingStay(false);
  }

  function handleStayKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitStay();
    if (e.key === "Escape") setEditingStay(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-md border p-2 text-sm transition-colors ${
        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      } ${isDragging ? "z-10 shadow-lg" : ""}`}
      onClick={() => {
        setSelectedSpot(spot.id);
        setMapCenter({ lat: spot.lat, lng: spot.lng });
      }}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        suppressHydrationWarning
        className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Sequence number */}
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
        {index + 1}
      </span>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="shrink-0 text-xs px-1 py-0">
            {SPOT_TYPE_LABELS[spot.type]}
          </Badge>
          <p className="font-medium truncate">{spot.name}</p>
        </div>
        {spot.address && (
          <p className="text-xs text-muted-foreground truncate">{spot.address}</p>
        )}
      </div>

      {/* Stay duration — inline editable */}
      {editingStay ? (
        <div
          className="flex items-center gap-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Clock className="h-3 w-3 text-muted-foreground" />
          <input
            ref={stayInputRef}
            type="number"
            min={1}
            max={1440}
            value={stayDraft}
            onChange={(e) => setStayDraft(e.target.value)}
            onBlur={commitStay}
            onKeyDown={handleStayKeyDown}
            className="w-12 rounded border border-input bg-background px-1 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">m</span>
        </div>
      ) : (
        <button
          className="shrink-0 flex items-center gap-0.5 rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Click to edit visit duration"
          onClick={startEditingStay}
        >
          <Clock className="h-3 w-3" />
          {formatStay(spot.stayMinutes ?? 60)}
        </button>
      )}

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          deleteSpot.mutate({ spotId: spot.id, tripId });
        }}
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}
