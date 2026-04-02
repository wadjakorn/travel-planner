"use client";

import type { RouteLeg, TravelMode } from "@/types";
import type { Spot } from "@/generated/prisma/client";
import { parseDurationSecs, formatDuration } from "@/stores/trip-store";
import { useUpdateSpot } from "@/hooks/use-trip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Car, PersonStanding, Train, Bike, ArrowDown } from "lucide-react";

interface ConnectorRowProps {
  /** The spot whose travelModeToNext this row controls */
  spot: Spot;
  tripId: string;
  /** Leg data from the active route (null if no route loaded yet) */
  leg: RouteLeg | null;
  /** Index of this leg in the route, used for color */
  legIndex: number;
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

/** CSS variable name → computed color string */
function getLegColor(index: number): string {
  const varName = `--route-leg-${(index % 8) + 1}`;
  if (typeof document === "undefined") return "#6b7280";
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || "#6b7280";
}

function getModeIcon(mode: TravelMode | null): React.ElementType {
  switch (mode) {
    case "WALK": return PersonStanding;
    case "TRANSIT": return Train;
    case "BICYCLE": return Bike;
    default: return Car;
  }
}

export function ConnectorRow({ spot, tripId, leg, legIndex }: ConnectorRowProps) {
  const updateSpot = useUpdateSpot();
  const effectiveMode = spot.travelModeToNext ?? null;
  const ModeIcon = getModeIcon(effectiveMode);
  const legColor = leg ? getLegColor(legIndex) : undefined;
  const durationSecs = leg ? parseDurationSecs(leg.duration) : null;

  function handleModeChange(mode: TravelMode | null) {
    updateSpot.mutate({ spotId: spot.id, tripId, travelModeToNext: mode });
  }

  return (
    <div className="flex items-center gap-1.5 py-0.5 pl-6">
      {/* Vertical connector line with leg color */}
      <div
        className="flex flex-col items-center"
        style={{ minWidth: 16 }}
      >
        <div
          className="w-0.5 h-3 rounded"
          style={{ backgroundColor: legColor ?? "var(--border)" }}
        />
        <ArrowDown
          className="h-3 w-3"
          style={{ color: legColor ?? "var(--muted-foreground)" }}
        />
        <div
          className="w-0.5 h-3 rounded"
          style={{ backgroundColor: legColor ?? "var(--border)" }}
        />
      </div>

      {/* Travel mode picker */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          title="Change travel mode for this leg"
        >
          <ModeIcon className="h-3.5 w-3.5" />
          {durationSecs !== null && (
            <span
              className="font-medium tabular-nums"
              style={{ color: legColor }}
            >
              {formatDuration(durationSecs)}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={4}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Travel mode</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {TRAVEL_MODE_OPTIONS.map(({ mode, label, Icon }) => (
            <DropdownMenuItem
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={effectiveMode === mode ? "bg-accent" : ""}
            >
              <Icon className="h-4 w-4" />
              {label}
            </DropdownMenuItem>
          ))}
          {effectiveMode !== null && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleModeChange(null)}>
                Reset to day default
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
