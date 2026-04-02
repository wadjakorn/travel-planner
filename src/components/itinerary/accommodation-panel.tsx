"use client";

import { useState } from "react";
import type { TripWithDays, Accommodation } from "@/types";
import {
  useAccommodationsQuery,
  useNightsQuery,
  useCreateAccommodation,
  useDeleteAccommodation,
  useSetNightAccommodation,
  useSetArrivalDeparture,
} from "@/hooks/use-trip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  BedDouble,
  Plus,
  Trash2,
  Navigation,
  MapPin,
} from "lucide-react";

interface AccommodationPanelProps {
  trip: TripWithDays;
}

export function AccommodationPanel({ trip }: AccommodationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: accommodations = [] } = useAccommodationsQuery(trip.id);
  const { data: nights = [] } = useNightsQuery(trip.id);

  const nightCount = nights.length;

  return (
    <div>
      {/* Collapsible header */}
      <button
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <BedDouble className="h-4 w-4 text-muted-foreground" />
        <span>Accommodations</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {nightCount} night{nightCount !== 1 ? "s" : ""}
        </Badge>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Arrival / Departure */}
          <ArrivalDepartureSection trip={trip} />

          {/* Night list */}
          <NightsList
            tripId={trip.id}
            nights={nights}
            accommodations={accommodations}
          />

          {/* Add accommodation */}
          <AddAccommodationForm tripId={trip.id} />

          {/* Accommodation library */}
          {accommodations.length > 0 && (
            <AccommodationLibrary
              tripId={trip.id}
              accommodations={accommodations}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Arrival / Departure section ──────────────────────────────────────────

function ArrivalDepartureSection({ trip }: { trip: TripWithDays }) {
  const setArrivalDeparture = useSetArrivalDeparture();
  const [editingArrival, setEditingArrival] = useState(false);
  const [editingDeparture, setEditingDeparture] = useState(false);
  const [arrivalName, setArrivalName] = useState(trip.arrivalName ?? "");
  const [departureName, setDepartureName] = useState(trip.departureName ?? "");

  function saveArrival() {
    if (arrivalName.trim()) {
      setArrivalDeparture.mutate({
        tripId: trip.id,
        arrival: { name: arrivalName.trim(), lat: 0, lng: 0 },
        departure: trip.departureName
          ? {
              name: trip.departureName,
              address: trip.departureAddress ?? undefined,
              lat: trip.departureLat ?? 0,
              lng: trip.departureLng ?? 0,
            }
          : null,
      });
    } else {
      setArrivalDeparture.mutate({
        tripId: trip.id,
        arrival: null,
        departure: trip.departureName
          ? {
              name: trip.departureName,
              address: trip.departureAddress ?? undefined,
              lat: trip.departureLat ?? 0,
              lng: trip.departureLng ?? 0,
            }
          : null,
      });
    }
    setEditingArrival(false);
  }

  function saveDeparture() {
    if (departureName.trim()) {
      setArrivalDeparture.mutate({
        tripId: trip.id,
        arrival: trip.arrivalName
          ? {
              name: trip.arrivalName,
              address: trip.arrivalAddress ?? undefined,
              lat: trip.arrivalLat ?? 0,
              lng: trip.arrivalLng ?? 0,
            }
          : null,
        departure: { name: departureName.trim(), lat: 0, lng: 0 },
      });
    } else {
      setArrivalDeparture.mutate({
        tripId: trip.id,
        arrival: trip.arrivalName
          ? {
              name: trip.arrivalName,
              address: trip.arrivalAddress ?? undefined,
              lat: trip.arrivalLat ?? 0,
              lng: trip.arrivalLng ?? 0,
            }
          : null,
        departure: null,
      });
    }
    setEditingDeparture(false);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Trip endpoints
      </p>

      {/* Arrival */}
      <div className="flex items-center gap-2">
        <Navigation className="h-3.5 w-3.5 text-green-600 shrink-0" />
        {editingArrival ? (
          <div className="flex flex-1 gap-1">
            <Input
              autoFocus
              value={arrivalName}
              onChange={(e) => setArrivalName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveArrival();
                if (e.key === "Escape") setEditingArrival(false);
              }}
              placeholder="Arrival location (e.g. Airport)"
              className="h-6 text-xs"
            />
            <Button size="sm" className="h-6 px-2 text-xs" onClick={saveArrival}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1"
              onClick={() => setEditingArrival(false)}
            >
              ✕
            </Button>
          </div>
        ) : (
          <button
            className="flex-1 text-left text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setArrivalName(trip.arrivalName ?? "");
              setEditingArrival(true);
            }}
          >
            <span className="text-xs font-medium text-foreground/70">From: </span>
            {trip.arrivalName ?? (
              <span className="italic text-muted-foreground/70">Not set</span>
            )}
          </button>
        )}
      </div>

      {/* Departure */}
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
        {editingDeparture ? (
          <div className="flex flex-1 gap-1">
            <Input
              autoFocus
              value={departureName}
              onChange={(e) => setDepartureName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveDeparture();
                if (e.key === "Escape") setEditingDeparture(false);
              }}
              placeholder="Departure location (e.g. Airport)"
              className="h-6 text-xs"
            />
            <Button size="sm" className="h-6 px-2 text-xs" onClick={saveDeparture}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1"
              onClick={() => setEditingDeparture(false)}
            >
              ✕
            </Button>
          </div>
        ) : (
          <button
            className="flex-1 text-left text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setDepartureName(trip.departureName ?? "");
              setEditingDeparture(true);
            }}
          >
            <span className="text-xs font-medium text-foreground/70">To: </span>
            {trip.departureName ?? (
              <span className="italic text-muted-foreground/70">Not set</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Night list ────────────────────────────────────────────────────────────

interface NightsListProps {
  tripId: string;
  nights: ReturnType<typeof useNightsQuery>["data"] & object[];
  accommodations: Accommodation[];
}

function NightsList({ tripId, nights, accommodations }: NightsListProps) {
  const setNight = useSetNightAccommodation();

  if (nights.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">No nights to configure.</p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Nights
      </p>
      {nights.map((night) => {
        const dateStr = new Date(night.date).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const nightDateKey = new Date(night.date).toISOString().split("T")[0];
        const assigned = (night as { accommodation: Accommodation | null }).accommodation;

        return (
          <div
            key={night.id}
            className="flex items-center gap-2 py-0.5"
          >
            <span className="text-xs text-muted-foreground w-20 shrink-0">
              {dateStr}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex-1 text-left text-xs rounded px-1.5 py-0.5 border border-dashed border-border hover:border-primary hover:bg-muted/50 transition-colors truncate">
                {assigned ? (
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-3 w-3 text-muted-foreground shrink-0" />
                    {assigned.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">Not set</span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="bottom">
                <DropdownMenuLabel>Assign accommodation</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {accommodations.map((acc) => (
                  <DropdownMenuItem
                    key={acc.id}
                    onClick={() =>
                      setNight.mutate({
                        tripId,
                        date: nightDateKey,
                        accommodationId: acc.id,
                      })
                    }
                    className={assigned?.id === acc.id ? "bg-accent" : ""}
                  >
                    <BedDouble className="h-4 w-4" />
                    {acc.name}
                    {acc.address && (
                      <span className="ml-1 text-muted-foreground truncate text-xs">
                        — {acc.address}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
                {accommodations.length === 0 && (
                  <DropdownMenuItem disabled>
                    No accommodations added yet
                  </DropdownMenuItem>
                )}
                {assigned && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        setNight.mutate({
                          tripId,
                          date: nightDateKey,
                          accommodationId: null,
                        })
                      }
                    >
                      Clear assignment
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}

// ─── Add accommodation form ────────────────────────────────────────────────

function AddAccommodationForm({ tripId }: { tripId: string }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const createAccommodation = useCreateAccommodation();

  async function handleSubmit() {
    if (!name.trim()) return;
    await createAccommodation.mutateAsync({
      tripId,
      name: name.trim(),
      address: address.trim() || undefined,
      lat: 0,
      lng: 0,
    });
    setName("");
    setAddress("");
    setIsAdding(false);
  }

  if (!isAdding) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs h-7"
        onClick={() => setIsAdding(true)}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add accommodation
      </Button>
    );
  }

  return (
    <div className="space-y-1.5 rounded-md border p-3">
      <p className="text-xs font-medium">New accommodation</p>
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (e.g. Hotel Grand)"
        className="h-7 text-xs"
        onKeyDown={(e) => e.key === "Escape" && setIsAdding(false)}
      />
      <Input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Address (optional)"
        className="h-7 text-xs"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") setIsAdding(false);
        }}
      />
      <div className="flex gap-1">
        <Button
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={handleSubmit}
          disabled={createAccommodation.isPending || !name.trim()}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => setIsAdding(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Accommodation library ─────────────────────────────────────────────────

function AccommodationLibrary({
  tripId,
  accommodations,
}: {
  tripId: string;
  accommodations: Accommodation[];
}) {
  const deleteAccommodation = useDeleteAccommodation();

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Saved accommodations
      </p>
      {accommodations.map((acc) => (
        <div
          key={acc.id}
          className="group flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs hover:bg-muted/50"
        >
          <BedDouble className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{acc.name}</p>
            {acc.address && (
              <p className="text-muted-foreground truncate">{acc.address}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100"
            onClick={() =>
              deleteAccommodation.mutate({ tripId, accommodationId: acc.id })
            }
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
