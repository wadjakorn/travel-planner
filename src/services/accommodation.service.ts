import { prisma } from "@/lib/prisma";
import type { CreateAccommodationInput } from "@/types";

// ─── Accommodation CRUD ────────────────────────────────────────────────────

export async function getAccommodations(tripId: string) {
  return prisma.accommodation.findMany({
    where: { tripId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createAccommodation(
  tripId: string,
  input: CreateAccommodationInput
) {
  return prisma.accommodation.create({
    data: {
      tripId,
      name: input.name,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      placeId: input.placeId,
    },
  });
}

export async function updateAccommodation(
  accommodationId: string,
  input: Partial<CreateAccommodationInput>
) {
  return prisma.accommodation.update({
    where: { id: accommodationId },
    data: input,
  });
}

export async function deleteAccommodation(accommodationId: string) {
  return prisma.accommodation.delete({ where: { id: accommodationId } });
}

// ─── Night assignment ──────────────────────────────────────────────────────

/** Get all NightAccommodation records for a trip, with their accommodation. */
export async function getNightsWithAccommodations(tripId: string) {
  return prisma.nightAccommodation.findMany({
    where: { tripId },
    include: { accommodation: true },
    orderBy: { date: "asc" },
  });
}

/**
 * Upsert a night accommodation for a given date.
 * Pass accommodationId=null to clear the assignment.
 */
export async function setNightAccommodation(
  tripId: string,
  date: Date,
  accommodationId: string | null
) {
  return prisma.nightAccommodation.upsert({
    where: { tripId_date: { tripId, date } },
    update: { accommodationId },
    create: { tripId, date, accommodationId },
  });
}

/**
 * Ensure NightAccommodation rows exist for every night of the trip.
 * A trip from Apr 13 – Apr 15 has 2 nights: Apr 13, Apr 14.
 * Call this whenever a trip's date range changes.
 */
export async function syncNightsForTrip(
  tripId: string,
  startDate: Date,
  endDate: Date
) {
  const nights: Date[] = [];
  const d = new Date(startDate);
  while (d < endDate) {
    nights.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  // Upsert each night row (preserves existing assignments)
  await Promise.all(
    nights.map((date) =>
      prisma.nightAccommodation.upsert({
        where: { tripId_date: { tripId, date } },
        update: {},
        create: { tripId, date, accommodationId: null },
      })
    )
  );

  // Remove any nights outside the new range
  await prisma.nightAccommodation.deleteMany({
    where: {
      tripId,
      OR: [
        { date: { lt: startDate } },
        { date: { gte: endDate } },
      ],
    },
  });
}

// ─── Trip arrival / departure ──────────────────────────────────────────────

export interface ArrivalDepartureInput {
  arrivalName?: string | null;
  arrivalAddress?: string | null;
  arrivalLat?: number | null;
  arrivalLng?: number | null;
  departureName?: string | null;
  departureAddress?: string | null;
  departureLat?: number | null;
  departureLng?: number | null;
}

export async function updateArrivalDeparture(
  tripId: string,
  input: ArrivalDepartureInput
) {
  return prisma.trip.update({
    where: { id: tripId },
    data: input,
  });
}
