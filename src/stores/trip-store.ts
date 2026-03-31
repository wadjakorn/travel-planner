import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OptimizedRoute } from "@/types";

export type OptimizationMode = "time" | "comfort";

interface TripState {
  selectedDayId: string | null;
  selectedSpotId: string | null;
  optimizationMode: OptimizationMode;
  isOptimizing: boolean;
  optimizedRoute: OptimizedRoute | null;
  mapCenter: { lat: number; lng: number } | null;
  mapZoom: number;
  darkMode: boolean;

  setSelectedDay: (dayId: string | null) => void;
  setSelectedSpot: (spotId: string | null) => void;
  setOptimizationMode: (mode: OptimizationMode) => void;
  setIsOptimizing: (isOptimizing: boolean) => void;
  setOptimizedRoute: (route: OptimizedRoute | null) => void;
  setMapCenter: (center: { lat: number; lng: number } | null) => void;
  setMapZoom: (zoom: number) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      selectedDayId: null,
      selectedSpotId: null,
      optimizationMode: "time",
      isOptimizing: false,
      optimizedRoute: null,
      mapCenter: null,
      mapZoom: 13,
      darkMode: false,

      setSelectedDay: (dayId) =>
        set({ selectedDayId: dayId, optimizedRoute: null }),
      setSelectedSpot: (spotId) => set({ selectedSpotId: spotId }),
      setOptimizationMode: (mode) => set({ optimizationMode: mode }),
      setIsOptimizing: (isOptimizing) => set({ isOptimizing }),
      setOptimizedRoute: (route) => set({ optimizedRoute: route }),
      setMapCenter: (center) => set({ mapCenter: center }),
      setMapZoom: (zoom) => set({ mapZoom: zoom }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setDarkMode: (dark) => set({ darkMode: dark }),
    }),
    {
      name: "trip-ui",
      partialize: (s) => ({ darkMode: s.darkMode, mapZoom: s.mapZoom }),
    }
  )
);
