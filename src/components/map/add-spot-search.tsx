"use client";

import { useEffect, useRef, useState } from "react";
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
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ghostMapRef = useRef<HTMLDivElement>(null);

  // Bootstrap services once the library is loaded
  useEffect(() => {
    if (!placesLib) return;
    autocompleteService.current = new placesLib.AutocompleteService();
    // PlacesService needs a DOM element or Map instance — use a hidden div
    if (ghostMapRef.current) {
      placesService.current = new placesLib.PlacesService(ghostMapRef.current);
    }
  }, [placesLib]);

  // Fetch predictions as the user types
  useEffect(() => {
    if (!autocompleteService.current || query.length < 2) {
      setPredictions([]);
      setOpen(false);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      { input: query },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setOpen(true);
        } else {
          setPredictions([]);
          setOpen(false);
        }
      }
    );
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectPrediction(prediction: google.maps.places.AutocompletePrediction) {
    if (!placesService.current) return;

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["name", "geometry", "formatted_address", "types", "place_id"],
      },
      (place, status) => {
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !place?.geometry?.location
        ) {
          return;
        }

        const pick: PlacePick = {
          name: place.name ?? prediction.structured_formatting.main_text,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          placeId: place.place_id ?? prediction.place_id,
          address: place.formatted_address ?? "",
          type: guessSpotType(place.types ?? [], place.name ?? ""),
        };

        onAdd(pick);
        setQuery("");
        setPredictions([]);
        setOpen(false);
      }
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Ghost element required by PlacesService */}
      <div ref={ghostMapRef} className="hidden" />

      <div className="flex items-center gap-1">
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
              onClick={() => { setQuery(""); setPredictions([]); setOpen(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {open && predictions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {predictions.map((p) => (
            <li key={p.place_id}>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none px-3 py-2 h-auto text-left"
                onClick={() => selectPrediction(p)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.structured_formatting.main_text}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.structured_formatting.secondary_text}
                  </p>
                </div>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
