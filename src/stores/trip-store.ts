import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActiveRoute, TravelMode } from "@/types";

export type OptimizationMode = "time" | "comfort";

interface TripState {
  // ── Day / spot selection ──────────────────────────────────────────
  selectedDayId: string | null;
  selectedSpotId: string | null;

  // ── Route ─────────────────────────────────────────────────────────
  /** Route currently displayed on the map (null = no route shown). */
  activeRoute: ActiveRoute | null;
  /** ID of the day whose route is shown — used to clear when day changes. */
  activeRouteDayId: string | null;
  isLoadingRoute: boolean;
  /** Per-day route cache (session only, not persisted). Preserves loaded routes when switching days. */
  routesByDay: Record<string, ActiveRoute>;

  // ── Optimisation ──────────────────────────────────────────────────
  /** @deprecated kept only for the auto-fill dialog after optimization */
  optimizationMode: OptimizationMode;

  // ── Map ───────────────────────────────────────────────────────────
  mapCenter: { lat: number; lng: number } | null;
  mapZoom: number;

  // ── Theme ─────────────────────────────────────────────────────────
  darkMode: boolean;

  // ── Leg highlight ─────────────────────────────────────────────────
  hoveredLegIndex: number | null;

  // ── Actions ───────────────────────────────────────────────────────
  setSelectedDay: (dayId: string | null) => void;
  setSelectedSpot: (spotId: string | null) => void;
  setActiveRoute: (route: ActiveRoute | null, dayId?: string | null) => void;
  setIsLoadingRoute: (loading: boolean) => void;
  setOptimizationMode: (mode: OptimizationMode) => void;
  setMapCenter: (center: { lat: number; lng: number } | null) => void;
  setMapZoom: (zoom: number) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  clearRoute: () => void;
  setHoveredLegIndex: (i: number | null) => void;
  clearRoutesForDay: (dayId: string) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      selectedDayId: null,
      selectedSpotId: null,
      activeRoute: null,
      activeRouteDayId: null,
      isLoadingRoute: false,
      optimizationMode: "time",
      mapCenter: null,
      mapZoom: 13,
      darkMode: false,
      hoveredLegIndex: null,
      routesByDay: {},

      setSelectedDay: (dayId) =>
        set((s) => ({
          selectedDayId: dayId,
          activeRoute: dayId ? (s.routesByDay[dayId] ?? null) : null,
          activeRouteDayId: dayId && s.routesByDay[dayId] ? dayId : null,
        })),
      setSelectedSpot: (spotId) => set({ selectedSpotId: spotId }),

      setActiveRoute: (route, dayId = null) =>
        set((s) => ({
          activeRoute: route,
          activeRouteDayId: dayId ?? null,
          routesByDay: route && dayId
            ? { ...s.routesByDay, [dayId]: route }
            : s.routesByDay,
        })),
      setIsLoadingRoute: (loading) => set({ isLoadingRoute: loading }),
      clearRoute: () =>
        set((s) => {
          const next = { ...s.routesByDay };
          if (s.activeRouteDayId) delete next[s.activeRouteDayId];
          return { activeRoute: null, activeRouteDayId: null, routesByDay: next };
        }),
      clearRoutesForDay: (dayId) =>
        set((s) => {
          const next = { ...s.routesByDay };
          delete next[dayId];
          return {
            routesByDay: next,
            ...(s.activeRouteDayId === dayId ? { activeRoute: null, activeRouteDayId: null } : {}),
          };
        }),

      setOptimizationMode: (mode) => set({ optimizationMode: mode }),
      setMapCenter: (center) => set({ mapCenter: center }),
      setMapZoom: (zoom) => set({ mapZoom: zoom }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setDarkMode: (dark) => set({ darkMode: dark }),
      setHoveredLegIndex: (i) => set({ hoveredLegIndex: i }),
    }),
    {
      name: "trip-ui",
      partialize: (s) => ({ darkMode: s.darkMode, mapZoom: s.mapZoom }),
    }
  )
);

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Format a Google Routes API duration string ("600s") → human label ("10m") */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Parse a duration string ("600s") and return the number of seconds. */
export function parseDurationSecs(duration: string): number {
  return parseInt(duration.replace("s", ""), 10) || 0;
}

/** Google Routes API → TravelMode mapping */
export const TRAVEL_MODE_TO_GOOGLE: Record<TravelMode, string> = {
  CAR: "DRIVE",
  WALK: "WALK",
  TRANSIT: "TRANSIT",
  BICYCLE: "BICYCLE",
};
