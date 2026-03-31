import type { Trip, TripDay, Spot, SpotType } from "@/generated/prisma/client";

export type { Trip, TripDay, Spot, SpotType };

export type TripWithDays = Trip & {
  shareToken?: string | null;
  days: (TripDay & {
    spots: Spot[];
  })[];
};

export type TripDayWithSpots = TripDay & {
  spots: Spot[];
};

export interface LatLng {
  lat: number;
  lng: number;
}

export interface OptimizedRoute {
  orderedSpotIds: string[];
  polyline: string;
  totalDuration: string;
  totalDistance: string;
  legs: RouteLeg[];
}

export interface RouteLeg {
  startSpotId: string;
  endSpotId: string;
  duration: string;
  distance: string;
  polyline: string;
}

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
