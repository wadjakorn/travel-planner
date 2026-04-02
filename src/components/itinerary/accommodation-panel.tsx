"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import type { TripWithDays, Accommodation } from "@/types";
import { fmtDayLabel } from "@/lib/format-date";
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
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  BedDouble,
  Plus,
  Trash2,
  Navigation,
  MapPin,
  Search,
  X,
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

// ─── PlaceSearchInput (file-private) ─────────────────────────────────────

interface PlaceSearchInputProps {
  placeholder: string;
  onSelect: (pick: PlacePick) => void;
  onCancel: () => void;
}

function PlaceSearchInput({ placeholder, onSelect, onCancel }: PlaceSearchInputProps) {
  const placesLib = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);

  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const measureInput = useCallback(() => {
    if (!inputWrapperRef.current) return;
    const rect = inputWrapperRef.current.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!placesLib || query.length < 2) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    measureInput();
    (async () => {
      try {
        const { suggestions: raw } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: query });
        setSuggestions(
          raw
            .map((s) => s.placePrediction)
            .filter(Boolean)
            .map((p) => ({
              placeId: p!.placeId,
              mainText: p!.mainText?.toString() ?? "",
              secondaryText: p!.secondaryText?.toString() ?? "",
            }))
        );
        setDropdownOpen(true);
      } catch {
        setSuggestions([]);
        setDropdownOpen(false);
      }
    })();
  }, [query, placesLib, measureInput]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const update = () => measureInput();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [dropdownOpen, measureInput]);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const insideInput = inputWrapperRef.current?.contains(target);
      const insideDropdown = document
        .getElementById("endpoint-search-dropdown")
        ?.contains(target);
      if (!insideInput && !insideDropdown) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  async function selectSuggestion(suggestion: Suggestion) {
    if (!placesLib) return;
    try {
      const place = new placesLib.Place({ id: suggestion.placeId });
      await place.fetchFields({
        fields: ["displayName", "location", "formattedAddress", "id"],
      });
      if (!place.location) return;
      onSelect({
        name: place.displayName ?? suggestion.mainText,
        address: place.formattedAddress ?? suggestion.secondaryText,
        lat: place.location.lat(),
        lng: place.location.lng(),
        placeId: place.id ?? suggestion.placeId,
      });
    } catch {
      // Place fetch failed — ignore
    }
  }

  const dropdown =
    dropdownOpen && suggestions.length > 0 && dropdownRect
      ? createPortal(
          <ul
            id="endpoint-search-dropdown"
            style={{
              position: "absolute",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
            }}
            className="rounded-md border bg-popover shadow-lg"
          >
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-none px-3 py-2 h-auto text-left"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(s);
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.mainText}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.secondaryText}
                    </p>
                  </div>
                </Button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <div className="flex flex-1 gap-1">
      <div ref={inputWrapperRef} className="relative flex-1">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
          placeholder={placeholder}
          className="pl-6 h-6 text-xs"
        />
      </div>
      <Button size="sm" variant="ghost" className="h-6 px-1" onClick={onCancel}>
        <X className="h-3 w-3" />
      </Button>
      {dropdown}
    </div>
  );
}

// ─── Arrival / Departure section ──────────────────────────────────────────

function ArrivalDepartureSection({ trip }: { trip: TripWithDays }) {
  const setArrivalDeparture = useSetArrivalDeparture();
  const [editingArrival, setEditingArrival] = useState(false);
  const [editingDeparture, setEditingDeparture] = useState(false);

  function handleSelectArrival(pick: PlacePick) {
    setArrivalDeparture.mutate({
      tripId: trip.id,
      arrival: { name: pick.name, address: pick.address, lat: pick.lat, lng: pick.lng },
      departure: trip.departureName
        ? {
            name: trip.departureName,
            address: trip.departureAddress ?? undefined,
            lat: trip.departureLat ?? 0,
            lng: trip.departureLng ?? 0,
          }
        : null,
    });
    setEditingArrival(false);
  }

  function handleClearArrival() {
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

  function handleSelectDeparture(pick: PlacePick) {
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
      departure: { name: pick.name, address: pick.address, lat: pick.lat, lng: pick.lng },
    });
    setEditingDeparture(false);
  }

  function handleClearDeparture() {
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

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Trip endpoints
        <span className="ml-1 normal-case font-normal text-muted-foreground/70">
          — Day 1 start &amp; last day end
        </span>
      </p>

      {/* Arrival */}
      <div className="flex items-center gap-2">
        <Navigation className="h-3.5 w-3.5 text-green-600 shrink-0" />
        {editingArrival ? (
          <PlaceSearchInput
            placeholder="e.g. Narita Airport, Tokyo Station…"
            onSelect={handleSelectArrival}
            onCancel={() => setEditingArrival(false)}
          />
        ) : (
          <div className="flex flex-1 items-center gap-1 min-w-0">
            <button
              className="flex-1 text-left text-xs text-muted-foreground hover:text-foreground truncate"
              onClick={() => setEditingArrival(true)}
            >
              <span className="text-xs font-medium text-foreground/70">From: </span>
              {trip.arrivalName ?? (
                <span className="italic text-muted-foreground/70">Not set</span>
              )}
            </button>
            {trip.arrivalName && (
              <button
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={handleClearArrival}
                title="Clear arrival"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Departure */}
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
        {editingDeparture ? (
          <PlaceSearchInput
            placeholder="e.g. Haneda Airport, Shinjuku Station…"
            onSelect={handleSelectDeparture}
            onCancel={() => setEditingDeparture(false)}
          />
        ) : (
          <div className="flex flex-1 items-center gap-1 min-w-0">
            <button
              className="flex-1 text-left text-xs text-muted-foreground hover:text-foreground truncate"
              onClick={() => setEditingDeparture(true)}
            >
              <span className="text-xs font-medium text-foreground/70">To: </span>
              {trip.departureName ?? (
                <span className="italic text-muted-foreground/70">Not set</span>
              )}
            </button>
            {trip.departureName && (
              <button
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={handleClearDeparture}
                title="Clear departure"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
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
        const dateStr = fmtDayLabel(night.date);
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
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Assign accommodation</DropdownMenuLabel>
                </DropdownMenuGroup>
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

// ─── Add accommodation — Google Places search ─────────────────────────────

interface PlacePick {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface DropdownRect {
  top: number;
  left: number;
  width: number;
}

function AddAccommodationForm({ tripId }: { tripId: string }) {
  const placesLib = useMapsLibrary("places");
  const createAccommodation = useCreateAccommodation();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);

  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const measureInput = useCallback(() => {
    if (!inputWrapperRef.current) return;
    const rect = inputWrapperRef.current.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  // Fetch suggestions as the user types
  useEffect(() => {
    if (!placesLib || query.length < 2) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    measureInput();

    (async () => {
      try {
        const { suggestions: raw } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            // Bias toward lodging results
            includedPrimaryTypes: ["lodging", "hotel"],
          }).catch(() =>
            // Fallback without type filter if it fails
            placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: query,
            })
          );

        setSuggestions(
          raw
            .map((s) => s.placePrediction)
            .filter(Boolean)
            .map((p) => ({
              placeId: p!.placeId,
              mainText: p!.mainText?.toString() ?? "",
              secondaryText: p!.secondaryText?.toString() ?? "",
            }))
        );
        setDropdownOpen(true);
      } catch {
        setSuggestions([]);
        setDropdownOpen(false);
      }
    })();
  }, [query, placesLib, measureInput]);

  // Re-measure on scroll/resize
  useEffect(() => {
    if (!dropdownOpen) return;
    const update = () => measureInput();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [dropdownOpen, measureInput]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const insideInput = inputWrapperRef.current?.contains(target);
      const insideDropdown = document
        .getElementById("accommodation-search-dropdown")
        ?.contains(target);
      if (!insideInput && !insideDropdown) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  async function selectSuggestion(suggestion: Suggestion) {
    if (!placesLib) return;
    try {
      const place = new placesLib.Place({ id: suggestion.placeId });
      await place.fetchFields({
        fields: ["displayName", "location", "formattedAddress", "id"],
      });
      if (!place.location) return;

      await createAccommodation.mutateAsync({
        tripId,
        name: place.displayName ?? suggestion.mainText,
        address: place.formattedAddress ?? suggestion.secondaryText,
        lat: place.location.lat(),
        lng: place.location.lng(),
        placeId: place.id ?? suggestion.placeId,
      });

      setQuery("");
      setSuggestions([]);
      setDropdownOpen(false);
      setIsOpen(false);
    } catch {
      // Place fetch failed
    }
  }

  const dropdown =
    dropdownOpen && suggestions.length > 0 && dropdownRect
      ? createPortal(
          <ul
            id="accommodation-search-dropdown"
            style={{
              position: "absolute",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
            }}
            className="rounded-md border bg-popover shadow-lg"
          >
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-none px-3 py-2 h-auto text-left"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(s);
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.mainText}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.secondaryText}
                    </p>
                  </div>
                </Button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs h-7"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add accommodation
      </Button>
    );
  }

  return (
    <div className="space-y-1.5 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Search for accommodation</p>
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            setIsOpen(false);
            setQuery("");
            setDropdownOpen(false);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div ref={inputWrapperRef} className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setIsOpen(false)}
          placeholder="Hotel name or address…"
          className="pl-7 pr-7 h-7 text-xs"
        />
        {query && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setQuery("");
              setSuggestions([]);
              setDropdownOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {dropdown}
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
