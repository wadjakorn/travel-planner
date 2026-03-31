"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { SpotType } from "@/generated/prisma/client";

interface PlacePick {
  name: string;
  lat: number;
  lng: number;
  placeId: string;
  address: string;
  type: SpotType;
}

interface AddSpotSearchProps {
  onAdd: (place: PlacePick) => void;
}

interface DropdownRect {
  top: number;
  left: number;
  width: number;
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

const TYPE_KEYWORD_MAP: Array<{ keywords: string[]; type: SpotType }> = [
  { keywords: ["hotel", "motel", "hostel", "inn", "resort", "lodging"], type: "HOTEL" },
  { keywords: ["restaurant", "food", "meal", "diner", "bistro", "eatery", "bbq", "grill"], type: "RESTAURANT" },
  { keywords: ["cafe", "coffee", "bakery", "dessert", "tea"], type: "CAFE" },
  { keywords: ["shopping", "mall", "market", "store", "shop", "boutique"], type: "SHOPPING" },
  { keywords: ["airport", "station", "bus", "transit", "train", "ferry", "transport"], type: "TRANSPORT" },
];

function guessSpotType(types: string[], name: string): SpotType {
  const combined = [...types, name].join(" ").toLowerCase();
  for (const { keywords, type } of TYPE_KEYWORD_MAP) {
    if (keywords.some((kw) => combined.includes(kw))) return type;
  }
  return "ATTRACTION";
}

export function AddSpotSearch({ onAdd }: AddSpotSearchProps) {
  const placesLib = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);

  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Measure the input position so the portal dropdown can be positioned correctly
  const measureInput = useCallback(() => {
    if (!inputWrapperRef.current) return;
    const rect = inputWrapperRef.current.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  // Fetch autocomplete suggestions as the user types
  useEffect(() => {
    if (!placesLib || query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    measureInput();

    (async () => {
      try {
        const { suggestions: raw } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
          });

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
        setOpen(true);
      } catch {
        // Aborted or API error — silently clear
        setSuggestions([]);
        setOpen(false);
      }
    })();
  }, [query, placesLib, measureInput]);

  // Re-measure on scroll/resize so the dropdown tracks the input
  useEffect(() => {
    if (!open) return;
    const update = () => measureInput();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, measureInput]);

  // Close when clicking outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const insideInput = inputWrapperRef.current?.contains(target);
      const insideDropdown = document.getElementById("add-spot-dropdown")?.contains(target);
      if (!insideInput && !insideDropdown) setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  async function selectSuggestion(suggestion: Suggestion) {
    if (!placesLib) return;

    try {
      const place = new placesLib.Place({ id: suggestion.placeId });
      await place.fetchFields({
        fields: ["displayName", "location", "formattedAddress", "types", "id"],
      });

      if (!place.location) return;

      onAdd({
        name: place.displayName ?? suggestion.mainText,
        lat: place.location.lat(),
        lng: place.location.lng(),
        placeId: place.id ?? suggestion.placeId,
        address: place.formattedAddress ?? "",
        type: guessSpotType(place.types ?? [], place.displayName ?? ""),
      });

      setQuery("");
      setSuggestions([]);
      setOpen(false);
    } catch {
      // Place fetch failed — ignore
    }
  }

  const dropdown =
    open && suggestions.length > 0 && dropdownRect
      ? createPortal(
          <ul
            id="add-spot-dropdown"
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
                    // Use mousedown (before blur) to capture the click
                    e.preventDefault();
                    selectSuggestion(s);
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.mainText}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.secondaryText}</p>
                  </div>
                </Button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={inputWrapperRef}>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search for a place…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 pr-8 h-8 text-sm"
        />
        {query && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setQuery("");
              setSuggestions([]);
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {dropdown}
    </div>
  );
}
