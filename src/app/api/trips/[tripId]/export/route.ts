import { auth } from "@/lib/auth";
import { getTripById } from "@/services/trip.service";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ tripId: string }>;
}

function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0] + "Z";
}

/**
 * GET /api/trips/[tripId]/export
 * Returns an iCalendar (.ics) file. Each spot becomes an event on its day.
 * Spot stay duration (stayMinutes) sets the event length; defaults to 60 min.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params;
  const trip = await getTripById(tripId, session.user.id);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const uid = (i: number) =>
    `spot-${trip.id}-${i}@travel-planner`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Travel Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(trip.title)}`,
  ];

  let eventIndex = 0;

  for (const day of trip.days) {
    // Accumulate start time across spots within the day (default: 9:00 AM)
    const dayDate = new Date(day.date);
    let cursor = new Date(dayDate);
    cursor.setUTCHours(9, 0, 0, 0);

    for (const spot of day.spots) {
      const durationMins = spot.stayMinutes ?? 60;
      const dtStart = formatIcsDate(cursor);

      cursor = new Date(cursor.getTime() + durationMins * 60 * 1000);
      const dtEnd = formatIcsDate(cursor);

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid(eventIndex++)}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeIcs(spot.name)}`,
        ...(spot.address ? [`LOCATION:${escapeIcs(spot.address)}`] : []),
        ...(spot.notes ? [`DESCRIPTION:${escapeIcs(spot.notes)}`] : []),
        `GEO:${spot.lat};${spot.lng}`,
        "END:VEVENT"
      );

      // 15-minute gap between spots for travel
      cursor = new Date(cursor.getTime() + 15 * 60 * 1000);
    }
  }

  lines.push("END:VCALENDAR");

  const icsContent = lines.join("\r\n");
  const filename = `${trip.title.replace(/[^a-z0-9]/gi, "_")}.ics`;

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
