import type { TripWithDays } from "@/types";

export interface DayEndpoints {
  /** Pinned start location for this day (accommodation / arrival / null) */
  startLabel: string | null;
  startIcon: "hotel" | "arrival" | null;
  startLat: number | null;
  startLng: number | null;
  /** Pinned end location for this day (accommodation / departure / null) */
  endLabel: string | null;
  endIcon: "hotel" | "departure" | null;
  endLat: number | null;
  endLng: number | null;
}

/**
 * Resolve the fixed start and end points for a given day based on:
 *  - Trip-level arrival/departure locations
 *  - Night accommodation assignments
 *
 * Resolution order (per REQUIREMENTS.md):
 *  1. First day start  → Trip arrival name → null
 *  2. First day end    → Night of day N accommodation → null
 *  3. Middle day start → Previous night's accommodation → null
 *  4. Middle day end   → Current night's accommodation → null
 *  5. Last day start   → Previous night's accommodation → null
 *  6. Last day end     → Trip departure name → null
 */
export function resolveDayEndpoints(
  trip: TripWithDays,
  dayIndex: number
): DayEndpoints {
  const days = trip.days;
  const nights = trip.nights;
  const isFirst = dayIndex === 0;
  const isLast = dayIndex === days.length - 1;

  const day = days[dayIndex];
  const prevDay = dayIndex > 0 ? days[dayIndex - 1] : null;

  // ISO date keys for matching (YYYY-MM-DD)
  const dateKey = (d: Date | string) =>
    new Date(d).toISOString().split("T")[0];

  const nightOfDay = nights.find(
    (n) => dateKey(n.date) === dateKey(day.date)
  ) ?? null;

  const prevNight = prevDay
    ? (nights.find((n) => dateKey(n.date) === dateKey(prevDay.date)) ?? null)
    : null;

  // ── Start point ──────────────────────────────────────────────────
  let startLabel: string | null = null;
  let startIcon: DayEndpoints["startIcon"] = null;
  let startLat: number | null = null;
  let startLng: number | null = null;

  if (isFirst) {
    if (trip.arrivalName) {
      startLabel = trip.arrivalName;
      startIcon = "arrival";
      startLat = trip.arrivalLat ?? null;
      startLng = trip.arrivalLng ?? null;
    }
  } else if (prevNight?.accommodation) {
    startLabel = prevNight.accommodation.name;
    startIcon = "hotel";
    startLat = prevNight.accommodation.lat;
    startLng = prevNight.accommodation.lng;
  }

  // ── End point ────────────────────────────────────────────────────
  let endLabel: string | null = null;
  let endIcon: DayEndpoints["endIcon"] = null;
  let endLat: number | null = null;
  let endLng: number | null = null;

  if (isLast) {
    if (trip.departureName) {
      endLabel = trip.departureName;
      endIcon = "departure";
      endLat = trip.departureLat ?? null;
      endLng = trip.departureLng ?? null;
    } else if (nightOfDay?.accommodation) {
      endLabel = nightOfDay.accommodation.name;
      endIcon = "hotel";
      endLat = nightOfDay.accommodation.lat;
      endLng = nightOfDay.accommodation.lng;
    }
  } else if (nightOfDay?.accommodation) {
    endLabel = nightOfDay.accommodation.name;
    endIcon = "hotel";
    endLat = nightOfDay.accommodation.lat;
    endLng = nightOfDay.accommodation.lng;
  }

  return { startLabel, startIcon, startLat, startLng, endLabel, endIcon, endLat, endLng };
}
