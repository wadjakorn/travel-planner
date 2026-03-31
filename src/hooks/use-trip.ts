"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TripWithDays, OptimizedRoute } from "@/types";
import type { SpotType } from "@/generated/prisma/client";
import type { OptimizationMode } from "@/stores/trip-store";

// ─── Query keys ────────────────────────────────────────────────────────────

export const tripKeys = {
  all: ["trips"] as const,
  detail: (tripId: string) => ["trips", tripId] as const,
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

// ─── Route optimization ────────────────────────────────────────────────────

interface OptimizeRoutePayload {
  tripId: string;
  dayId: string;
  mode: OptimizationMode;
}

export function useOptimizeRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tripId,
      dayId,
      mode,
    }: OptimizeRoutePayload): Promise<OptimizedRoute> => {
      const res = await fetch(
        `/api/trips/${tripId}/days/${dayId}/optimize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode }),
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
