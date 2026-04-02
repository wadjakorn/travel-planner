"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  TripWithDays,
  ActiveRoute,
  TravelMode,
  Accommodation,
  NightAccommodationWithAccommodation,
  CreateAccommodationInput,
} from "@/types";
import type { SpotType } from "@/generated/prisma/client";

// ─── Query keys ────────────────────────────────────────────────────────────

export const tripKeys = {
  all: ["trips"] as const,
  detail: (tripId: string) => ["trips", tripId] as const,
  accommodations: (tripId: string) =>
    ["trips", tripId, "accommodations"] as const,
  nights: (tripId: string) => ["trips", tripId, "nights"] as const,
};

// ─── Queries ───────────────────────────────────────────────────────────────

export function useTripQuery(tripId: string, initialData?: TripWithDays) {
  return useQuery<TripWithDays>({
    queryKey: tripKeys.detail(tripId),
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}`);
      if (!res.ok) throw new Error("Failed to fetch trip");
      return res.json();
    },
    initialData,
    staleTime: 30_000,
  });
}

export function useAccommodationsQuery(tripId: string) {
  return useQuery<Accommodation[]>({
    queryKey: tripKeys.accommodations(tripId),
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}/accommodations`);
      if (!res.ok) throw new Error("Failed to fetch accommodations");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useNightsQuery(tripId: string) {
  return useQuery<NightAccommodationWithAccommodation[]>({
    queryKey: tripKeys.nights(tripId),
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}/nights`);
      if (!res.ok) throw new Error("Failed to fetch nights");
      return res.json();
    },
    staleTime: 30_000,
  });
}

// ─── Spot mutations ────────────────────────────────────────────────────────

interface AddSpotPayload {
  tripId: string;
  dayId: string;
  name: string;
  lat: number;
  lng: number;
  type: SpotType;
  placeId?: string;
  address?: string;
  notes?: string;
  stayMinutes?: number;
}

export function useAddSpot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddSpotPayload) => {
      const { tripId, dayId, ...body } = payload;
      const res = await fetch(`/api/trips/${tripId}/days/${dayId}/spots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tripKeys.detail(vars.tripId) });
    },
  });
}

interface DeleteSpotPayload {
  tripId: string;
  spotId: string;
}

export function useDeleteSpot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ spotId }: DeleteSpotPayload) => {
      const res = await fetch(`/api/spots/${spotId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tripKeys.detail(vars.tripId) });
    },
  });
}

interface UpdateSpotPayload {
  tripId: string;
  spotId: string;
  name?: string;
  type?: SpotType;
  address?: string;
  notes?: string;
  stayMinutes?: number;
  travelModeToNext?: TravelMode | null;
}

export function useUpdateSpot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ spotId, tripId: _tripId, ...body }: UpdateSpotPayload) => {
      const res = await fetch(`/api/spots/${spotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tripKeys.detail(vars.tripId) });
    },
  });
}

interface ReorderSpotsPayload {
  tripId: string;
  dayId: string;
  spotIds: string[];
}

export function useReorderSpots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, dayId, spotIds }: ReorderSpotsPayload) => {
      const res = await fetch(
        `/api/trips/${tripId}/days/${dayId}/spots/reorder`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spotIds }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tripKeys.detail(vars.tripId) });
    },
  });
}

interface MoveSpotPayload {
  tripId: string;
  sourceDayId: string;
  targetDayId: string;
  spotId: string;
  sortOrder: number;
}

export function useMoveSpot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tripId,
      sourceDayId,
      spotId,
      targetDayId,
      sortOrder,
    }: MoveSpotPayload) => {
      const res = await fetch(
        `/api/trips/${tripId}/days/${sourceDayId}/spots/reorder`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spotId, targetDayId, sortOrder }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tripKeys.detail(vars.tripId) });
    },
  });
}

// ─── Route mutations ───────────────────────────────────────────────────────

interface LatLngPoint {
  lat: number;
  lng: number;
}

interface ShowRoutePayload {
  tripId: string;
  dayId: string;
  defaultMode?: TravelMode;
  startPoint?: LatLngPoint | null;
  endPoint?: LatLngPoint | null;
}

export function useShowRoute() {
  return useMutation({
    mutationFn: async ({
      tripId,
      dayId,
      defaultMode,
      startPoint,
      endPoint,
    }: ShowRoutePayload): Promise<ActiveRoute> => {
      const res = await fetch(
        `/api/trips/${tripId}/days/${dayId}/route`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultMode, startPoint, endPoint }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}

interface OptimizeRoutePayload {
  tripId: string;
  dayId: string;
  mode: "time" | "comfort";
  startPoint?: LatLngPoint | null;
  endPoint?: LatLngPoint | null;
}

export function useOptimizeRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tripId,
      dayId,
      mode,
      startPoint,
      endPoint,
    }: OptimizeRoutePayload): Promise<ActiveRoute> => {
      const res = await fetch(
        `/api/trips/${tripId}/days/${dayId}/optimize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, startPoint, endPoint }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tripKeys.detail(vars.tripId) });
    },
  });
}

interface SetDayTravelModePayload {
  tripId: string;
  dayId: string;
  defaultTravelMode: TravelMode;
}

export function useSetDayTravelMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, dayId, defaultTravelMode }: SetDayTravelModePayload) => {
      const res = await fetch(`/api/trips/${tripId}/days/${dayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultTravelMode }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tripKeys.detail(vars.tripId) });
    },
  });
}

// ─── Accommodation mutations ───────────────────────────────────────────────

export function useCreateAccommodation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tripId,
      ...input
    }: { tripId: string } & CreateAccommodationInput): Promise<Accommodation> => {
      const res = await fetch(`/api/trips/${tripId}/accommodations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tripKeys.accommodations(vars.tripId) });
    },
  });
}

export function useDeleteAccommodation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tripId,
      accommodationId,
    }: { tripId: string; accommodationId: string }) => {
      const res = await fetch(
        `/api/trips/${tripId}/accommodations/${accommodationId}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tripKeys.accommodations(vars.tripId) });
      qc.invalidateQueries({ queryKey: tripKeys.nights(vars.tripId) });
    },
  });
}

// ─── Night mutations ────────────────────────────────────────────────────────

interface SetNightAccommodationPayload {
  tripId: string;
  date: string;
  accommodationId: string | null;
}

export function useSetNightAccommodation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, date, accommodationId }: SetNightAccommodationPayload) => {
      const res = await fetch(`/api/trips/${tripId}/nights`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, accommodationId }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tripKeys.nights(vars.tripId) });
    },
  });
}

interface SetArrivalDeparturePayload {
  tripId: string;
  arrival?: { name: string; address?: string; lat: number; lng: number } | null;
  departure?: { name: string; address?: string; lat: number; lng: number } | null;
}

export function useSetArrivalDeparture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, arrival, departure }: SetArrivalDeparturePayload) => {
      const res = await fetch(`/api/trips/${tripId}/nights`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arrival, departure }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tripKeys.detail(vars.tripId) });
    },
  });
}

// ─── Share link mutations ──────────────────────────────────────────────────

export function useEnableShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tripId: string): Promise<{ token: string }> => {
      const res = await fetch(`/api/trips/${tripId}/share`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_data, tripId) => {
      qc.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
    },
  });
}

export function useDisableShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tripId: string) => {
      const res = await fetch(`/api/trips/${tripId}/share`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
    },
    onSuccess: (_data, tripId) => {
      qc.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
    },
  });
}

// ─── Trip mutations ────────────────────────────────────────────────────────

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tripId: string) => {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}
