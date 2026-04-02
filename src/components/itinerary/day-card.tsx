"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TripDayWithSpots, DayEndpoints } from "@/types";
import type { TravelMode } from "@/generated/prisma/client";
import { useTripStore, parseDurationSecs, formatDuration } from "@/stores/trip-store";
import { fmtDayLabel } from "@/lib/format-date";
import { SpotCard } from "./spot-card";
import { ConnectorRow, EndpointConnectorRow } from "./connector-row";
import { AddSpotSearch } from "@/components/map/add-spot-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  useAddSpot,
  useShowRoute,
  useOptimizeRoute,
  useSetDayTravelMode,
} from "@/hooks/use-trip";
import {
  MoreHorizontal,
  Route,
  Zap,
  Clock3,
  Car,
  PersonStanding,
  Train,
  Bike,
  X,
  Timer,
  Navigation,
  MapPin,
  BedDouble,
} from "lucide-react";

interface DayCardProps {
  day: TripDayWithSpots;
  dayNumber: number;
  tripId: string;
  endpoints: DayEndpoints;
}

const TRAVEL_MODE_OPTIONS: {
  mode: TravelMode;
  label: string;
  Icon: React.ElementType;
}[] = [
  { mode: "CAR", label: "Car", Icon: Car },
  { mode: "WALK", label: "Walk", Icon: PersonStanding },
  { mode: "TRANSIT", label: "Transit", Icon: Train },
  { mode: "BICYCLE", label: "Bicycle", Icon: Bike },
];

export function DayCard({ day, dayNumber, tripId, endpoints }: DayCardProps) {
  const {
    selectedDayId,
    setSelectedDay,
    activeRoute,
    activeRouteDayId,
    isLoadingRoute,
    setActiveRoute,
    setIsLoadingRoute,
    clearRoute,
    routesByDay,
  } = useTripStore();

  const isSelected = selectedDayId === day.id;
  const isDayRoute = activeRouteDayId === day.id;

  const addSpot = useAddSpot();
  const showRoute = useShowRoute();
  const optimizeRoute = useOptimizeRoute();
  const setDayTravelMode = useSetDayTravelMode();

  // Post-optimization dialog state
  const [showFillDialog, setShowFillDialog] = useState(false);

  // Make the whole card a drop target so spots can be dragged into empty days
  const { setNodeRef } = useDroppable({ id: day.id });

  // Use the map-active route for the selected day; fall back to per-day memory cache for others
  const dayRoute = isDayRoute ? activeRoute : (routesByDay[day.id] ?? null);

  // Build a map from startSpotId → leg for this day's route
  const legsByStartSpot = dayRoute?.legs
    ? new Map(dayRoute.legs.map((l) => [l.startSpotId, l]))
    : new Map();

  // Route summary for this day
  const routeSummary = dayRoute ? (() => {
    const travelSecs = dayRoute.legs.reduce(
      (sum, l) => sum + parseDurationSecs(l.duration),
      0
    );
    const visitMins = day.spots.reduce((sum, s) => sum + (s.stayMinutes ?? 60), 0);
    const totalSecs = travelSecs + visitMins * 60;
    return {
      total: formatDuration(totalSecs),
      travel: formatDuration(travelSecs),
      visits: formatDuration(visitMins * 60),
    };
  })() : null;

  const endpointStart =
    endpoints.startLat !== null && endpoints.startLng !== null
      ? { lat: endpoints.startLat, lng: endpoints.startLng }
      : null;
  const endpointEnd =
    endpoints.endLat !== null && endpoints.endLng !== null
      ? { lat: endpoints.endLat, lng: endpoints.endLng }
      : null;

  async function handleShowRoute() {
    setSelectedDay(day.id);
    setIsLoadingRoute(true);
    try {
      const route = await showRoute.mutateAsync({
        tripId,
        dayId: day.id,
        defaultMode: day.defaultTravelMode as TravelMode,
        startPoint: endpointStart,
        endPoint: endpointEnd,
      });
      setActiveRoute(route, day.id);
    } catch (err) {
      console.error("Show route failed:", err);
    } finally {
      setIsLoadingRoute(false);
    }
  }

  async function handleOptimize(mode: "time" | "comfort") {
    setSelectedDay(day.id);
    setIsLoadingRoute(true);
    try {
      const route = await optimizeRoute.mutateAsync({
        tripId,
        dayId: day.id,
        mode,
        startPoint: endpointStart,
        endPoint: endpointEnd,
      });
      setActiveRoute(route, day.id);
      if (route.wasOptimized) {
        setShowFillDialog(true);
      }
    } catch (err) {
      console.error("Optimize failed:", err);
    } finally {
      setIsLoadingRoute(false);
    }
  }

  function handleSetDefaultMode(mode: TravelMode) {
    setDayTravelMode.mutate({ tripId, dayId: day.id, defaultTravelMode: mode });
  }

  const isLoading = isLoadingRoute && isDayRoute;

  return (
    <>
      <Card className={`transition-colors ${isSelected ? "ring-2 ring-primary" : ""}`}>
        <CardHeader
          className="pb-2 cursor-pointer"
          onClick={() => setSelectedDay(day.id)}
        >
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Day {dayNumber}</CardTitle>

            <div className="flex items-center gap-1.5 ml-auto">
              {/* Route summary */}
              {routeSummary && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {routeSummary.total}
                </span>
              )}

              <Badge variant="secondary">
                {fmtDayLabel(day.date)}
              </Badge>

              {/* ⋮ Day actions */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      disabled={isLoading}
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" className="min-w-48 w-auto">
                  {/* Show Route */}
                  <DropdownMenuItem
                    onClick={handleShowRoute}
                    disabled={day.spots.length < 2 || isLoading}
                  >
                    <Route className="h-4 w-4" />
                    Show Route
                  </DropdownMenuItem>

                  {/* Optimize Route → sub-menu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger disabled={day.spots.length < 2 || isLoading}>
                      <Zap className="h-4 w-4" />
                      Optimize Route
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleOptimize("time")}>
                        <Car className="h-4 w-4" />
                        Save Time
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOptimize("comfort")}>
                        <Train className="h-4 w-4" />
                        Comfortable
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />

                  {/* Set Default Travel Mode → sub-menu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Clock3 className="h-4 w-4" />
                      Default Travel Mode
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>
                          Current: {day.defaultTravelMode}
                        </DropdownMenuLabel>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      {TRAVEL_MODE_OPTIONS.map(({ mode, label, Icon }) => (
                        <DropdownMenuItem
                          key={mode}
                          onClick={() => handleSetDefaultMode(mode)}
                          className={day.defaultTravelMode === mode ? "bg-accent" : ""}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Clear Route */}
                  {isDayRoute && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          clearRoute();
                        }}
                      >
                        <X className="h-4 w-4" />
                        Clear Route
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Detailed route time breakdown */}
          {routeSummary && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Total: {routeSummary.total} ({routeSummary.travel} travel + {routeSummary.visits} visits)
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-0 pt-0">
          {/* Pinned start row + connector to first spot */}
          {endpoints.startLabel && (
            <>
              <div className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground">
                {endpoints.startIcon === "arrival"
                  ? <Navigation className="h-3 w-3 text-green-600 shrink-0" />
                  : <BedDouble className="h-3 w-3 text-blue-500 shrink-0" />}
                <span className="truncate">{endpoints.startLabel}</span>
              </div>
              {day.spots.length > 0 && (
                <EndpointConnectorRow
                  leg={legsByStartSpot.get("__endpoint_start__") ?? null}
                  legIndex={0}
                  currentMode={day.defaultTravelMode as TravelMode}
                  onModeChange={(mode) =>
                    setDayTravelMode.mutate({ tripId, dayId: day.id, defaultTravelMode: mode })
                  }
                />
              )}
            </>
          )}

          <SortableContext
            id={day.id}
            items={day.spots.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div ref={setNodeRef} className="space-y-0 min-h-[4px]">
              {day.spots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">
                  No spots yet — search below to add one.
                </p>
              ) : (
                day.spots.map((spot, index) => {
                  // Leg color index: offset by 1 if there's a start endpoint leg
                  const hasStartLeg = !!legsByStartSpot.get("__endpoint_start__");
                  const legColorIndex = index + (hasStartLeg ? 1 : 0);
                  return (
                    <div key={spot.id}>
                      <SpotCard spot={spot} tripId={tripId} index={index} />
                      {/* Connector between spots (not after last spot) */}
                      {index < day.spots.length - 1 && (
                        <ConnectorRow
                          spot={spot}
                          tripId={tripId}
                          leg={legsByStartSpot.get(spot.id) ?? null}
                          legIndex={legColorIndex}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </SortableContext>

          {/* Connector from last spot + pinned end row */}
          {endpoints.endLabel && (
            <>
              {day.spots.length > 0 && (
                <EndpointConnectorRow
                  leg={legsByStartSpot.get(day.spots[day.spots.length - 1].id) ?? null}
                  legIndex={
                    day.spots.length - 1 +
                    (legsByStartSpot.get("__endpoint_start__") ? 1 : 0)
                  }
                  currentMode={day.defaultTravelMode as TravelMode}
                  onModeChange={(mode) =>
                    setDayTravelMode.mutate({ tripId, dayId: day.id, defaultTravelMode: mode })
                  }
                />
              )}
              <div className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground">
                {endpoints.endIcon === "departure"
                  ? <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                  : <BedDouble className="h-3 w-3 text-blue-500 shrink-0" />}
                <span className="truncate">{endpoints.endLabel}</span>
              </div>
            </>
          )}

          {/* Place search */}
          <div onClick={(e) => e.stopPropagation()} className="pt-2">
            <AddSpotSearch
              onAdd={(place) =>
                addSpot.mutate({
                  tripId,
                  dayId: day.id,
                  name: place.name,
                  lat: place.lat,
                  lng: place.lng,
                  type: place.type,
                  placeId: place.placeId,
                  address: place.address,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Post-optimization auto-fill dialog */}
      {showFillDialog && (
        <FillVisitTimesDialog
          tripId={tripId}
          day={day}
          onClose={() => setShowFillDialog(false)}
        />
      )}
    </>
  );
}

// ─── Auto-fill visit times dialog ─────────────────────────────────────────

import { useUpdateSpot } from "@/hooks/use-trip";

interface FillVisitTimesDialogProps {
  tripId: string;
  day: TripDayWithSpots;
  onClose: () => void;
}

function FillVisitTimesDialog({ tripId, day, onClose }: FillVisitTimesDialogProps) {
  const updateSpot = useUpdateSpot();

  async function fillEmpty() {
    await Promise.all(
      day.spots
        .filter((s) => !s.stayMinutes || s.stayMinutes === 60)
        .map((s) =>
          updateSpot.mutateAsync({ spotId: s.id, tripId, stayMinutes: 60 })
        )
    );
    onClose();
  }

  async function resetAll() {
    await Promise.all(
      day.spots.map((s) =>
        updateSpot.mutateAsync({ spotId: s.id, tripId, stayMinutes: 60 })
      )
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-80 rounded-xl border bg-card p-5 shadow-xl space-y-3">
        <h3 className="font-semibold text-sm">Set visit times?</h3>
        <p className="text-xs text-muted-foreground">
          Optimization complete. Would you like to set visit durations for your spots?
        </p>
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="outline" onClick={fillEmpty}>
            Fill empty only (1 hr default)
          </Button>
          <Button size="sm" variant="outline" onClick={resetAll}>
            Reset all to 1 hr
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Keep current
          </Button>
        </div>
      </div>
    </div>
  );
}
