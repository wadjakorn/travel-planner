import type {
  Trip,
  TripDay,
  Spot,
  SpotType,
  TravelMode,
  Accommodation,
  NightAccommodation,
} from "@/generated/prisma/client";

export type { Trip, TripDay, Spot, SpotType, TravelMode, Accommodation, NightAccommodation };

// ─── Composite types ───────────────────────────────────────────────────────

export type TripWithDays = Trip & {
  shareToken?: string | null;
  days: (TripDay & {
    spots: Spot[];
  })[];
  accommodations: Accommodation[];
  nights: NightAccommodation[];
};

export type TripDayWithSpots = TripDay & {
  spots: Spot[];
};

export type NightAccommodationWithAccommodation = NightAccommodation & {
  accommodation: Accommodation | null;
};

// ─── Map / Location ────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

// ─── Route ────────────────────────────────────────────────────────────────

export interface RouteLeg {
  startSpotId: string;
  endSpotId: string;
  /** Duration string from Google Routes API, e.g. "600s" */
  duration: string;
  distance: string;
  polyline: string;
  travelMode: TravelMode;
}

export interface ActiveRoute {
  /** Null when route is "show only" (no reordering). Set when optimized. */
  orderedSpotIds: string[] | null;
  totalDuration: string;
  totalDistance: string;
  legs: RouteLeg[];
  /** Whether spots were reordered as part of this route (optimized) */
  wasOptimized: boolean;
}

// ─── Input types ──────────────────────────────────────────────────────────

export interface CreateTripInput {
  title: string;
  startDate: string;
  endDate: string;
}

export interface CreateSpotInput {
  name: string;
  placeId?: string;
  lat: number;
  lng: number;
  type: SpotType;
  address?: string;
  notes?: string;
  stayMinutes?: number;
  tripDayId: string;
}

export interface CreateAccommodationInput {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  placeId?: string;
}
