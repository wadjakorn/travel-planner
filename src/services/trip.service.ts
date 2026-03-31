import { prisma } from "@/lib/prisma";
import type { CreateTripInput, TripWithDays } from "@/types";

export async function getUserTrips(userId: string) {
  return prisma.trip.findMany({
    where: { userId },
    include: {
      days: {
        include: { spots: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getTripById(
  tripId: string,
  userId: string
): Promise<TripWithDays | null> {
  return prisma.trip.findFirst({
    where: { id: tripId, userId },
    include: {
      days: {
        include: { spots: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function createTrip(userId: string, input: CreateTripInput) {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  const dayCount =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  return prisma.trip.create({
    data: {
      title: input.title,
      startDate,
      endDate,
      userId,
      days: {
        create: Array.from({ length: dayCount }, (_, i) => ({
          date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
          sortOrder: i,
        })),
      },
    },
    include: {
      days: {
        include: { spots: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function deleteTrip(tripId: string, userId: string) {
  return prisma.trip.deleteMany({
    where: { id: tripId, userId },
  });
}

export async function enableShareLink(
  tripId: string,
  userId: string
): Promise<string> {
  const token = crypto.randomUUID();
  await prisma.trip.updateMany({
    where: { id: tripId, userId },
    data: { shareToken: token },
  });
  return token;
}

export async function disableShareLink(tripId: string, userId: string) {
  return prisma.trip.updateMany({
    where: { id: tripId, userId },
    data: { shareToken: null },
  });
}

export async function getTripByShareToken(
  token: string
): Promise<TripWithDays | null> {
  return prisma.trip.findFirst({
    where: { shareToken: token },
    include: {
      days: {
        include: { spots: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}
