import { getTripByShareToken } from "@/services/trip.service";
import { notFound } from "next/navigation";
import { ShareMap } from "./share-map";
import type { TripWithDays } from "@/types";
import { fmtDate, fmtDayLabel } from "@/lib/format-date";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

function ReadOnlyItinerary({ trip }: { trip: TripWithDays }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">{trip.title}</h2>
        <p className="text-sm text-muted-foreground">
          {fmtDate(trip.startDate)} &mdash;{" "}
          {fmtDate(trip.endDate)}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {trip.days.map((day, index) => (
          <div key={day.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Day {index + 1}</h3>
              <span className="text-xs text-muted-foreground">
                {fmtDayLabel(day.date)}
              </span>
            </div>
            <div className="space-y-1">
              {day.spots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No spots.</p>
              ) : (
                day.spots.map((spot, si) => (
                  <div key={spot.id} className="flex items-center gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {si + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{spot.name}</p>
                      {spot.address && (
                        <p className="text-xs text-muted-foreground truncate">
                          {spot.address}
                        </p>
                      )}
                    </div>
                    {spot.stayMinutes && (
                      <span className="shrink-0 text-xs text-muted-foreground ml-auto">
                        {spot.stayMinutes}m
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const trip = await getTripByShareToken(token);
  if (!trip) notFound();

  const allSpots = trip.days.flatMap((d) => d.spots);
  const center =
    allSpots.length > 0
      ? {
          lat: allSpots.reduce((s, p) => s + p.lat, 0) / allSpots.length,
          lng: allSpots.reduce((s, p) => s + p.lng, 0) / allSpots.length,
        }
      : { lat: 35.6762, lng: 139.6503 };

  return (
    <div className="flex h-screen flex-col">
      {/* Read-only header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div>
          <span className="text-lg font-semibold">Travel Planner</span>
          <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            View only
          </span>
        </div>
      </header>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 overflow-y-auto border-r">
          <ReadOnlyItinerary trip={trip} />
        </div>
        <div className="flex-1">
          <ShareMap trip={trip} center={center} />
        </div>
      </div>
    </div>
  );
}
