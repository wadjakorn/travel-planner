import { getSession as auth } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { updateSpot, deleteSpot } from "@/services/spot.service";
import { NextResponse } from "next/server";
import type { SpotType } from "@/generated/prisma/client";

interface RouteParams {
  params: Promise<{ spotId: string }>;
}

const VALID_SPOT_TYPES: SpotType[] = [
  "ATTRACTION",
  "HOTEL",
  "RESTAURANT",
  "CAFE",
  "SHOPPING",
  "TRANSPORT",
  "CUSTOM",
];

/** Verify the spot belongs to the requesting user via trip ownership. */
async function getSpotForUser(spotId: string, userId: string) {
  return prisma.spot.findFirst({
    where: {
      id: spotId,
      tripDay: { trip: { userId } },
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { spotId } = await params;
  const spot = await getSpotForUser(spotId, session.user.id);
  if (!spot) {
    return NextResponse.json({ error: "Spot not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, type, address, notes, stayMinutes } = body;

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
  }
  if (type !== undefined && !VALID_SPOT_TYPES.includes(type)) {
    return NextResponse.json({ error: "invalid spot type" }, { status: 400 });
  }

  const updated = await updateSpot(spotId, {
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(address !== undefined ? { address } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(stayMinutes !== undefined ? { stayMinutes } : {}),
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { spotId } = await params;
  const spot = await getSpotForUser(spotId, session.user.id);
  if (!spot) {
    return NextResponse.json({ error: "Spot not found" }, { status: 404 });
  }

  await deleteSpot(spotId);
  return new NextResponse(null, { status: 204 });
}
