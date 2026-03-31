import { prisma } from "@/lib/prisma";
import type { CreateSpotInput } from "@/types";

export async function addSpot(input: CreateSpotInput) {
  const maxOrder = await prisma.spot.aggregate({
    where: { tripDayId: input.tripDayId },
    _max: { sortOrder: true },
  });

  return prisma.spot.create({
    data: {
      ...input,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateSpot(
  spotId: string,
  data: Partial<Omit<CreateSpotInput, "tripDayId">>
) {
  return prisma.spot.update({
    where: { id: spotId },
    data,
  });
}

export async function deleteSpot(spotId: string) {
  return prisma.spot.delete({
    where: { id: spotId },
  });
}

export async function reorderSpots(
  spotIds: string[]
) {
  const updates = spotIds.map((id, index) =>
    prisma.spot.update({
      where: { id },
      data: { sortOrder: index },
    })
  );

  return prisma.$transaction(updates);
}

export async function moveSpotToDay(
  spotId: string,
  targetDayId: string,
  sortOrder: number
) {
  return prisma.spot.update({
    where: { id: spotId },
    data: {
      tripDayId: targetDayId,
      sortOrder,
    },
  });
}
