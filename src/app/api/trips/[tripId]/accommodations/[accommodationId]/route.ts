import { getSession as auth } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import {
  updateAccommodation,
  deleteAccommodation,
} from "@/services/accommodation.service";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ tripId: string; accommodationId: string }>;
}

async function getAccommodationForUser(
  accommodationId: string,
  userId: string
) {
  return prisma.accommodation.findFirst({
    where: {
      id: accommodationId,
      trip: { userId },
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accommodationId } = await params;
  const accommodation = await getAccommodationForUser(
    accommodationId,
    session.user.id
  );
  if (!accommodation) {
    return NextResponse.json(
      { error: "Accommodation not found" },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { name, address, lat, lng, placeId } = body;

  if (
    name !== undefined &&
    (typeof name !== "string" || name.trim().length === 0)
  ) {
    return NextResponse.json(
      { error: "name must be a non-empty string" },
      { status: 400 }
    );
  }

  const updated = await updateAccommodation(accommodationId, {
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(address !== undefined ? { address } : {}),
    ...(lat !== undefined ? { lat } : {}),
    ...(lng !== undefined ? { lng } : {}),
    ...(placeId !== undefined ? { placeId } : {}),
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accommodationId } = await params;
  const accommodation = await getAccommodationForUser(
    accommodationId,
    session.user.id
  );
  if (!accommodation) {
    return NextResponse.json(
      { error: "Accommodation not found" },
      { status: 404 }
    );
  }

  await deleteAccommodation(accommodationId);
  return new NextResponse(null, { status: 204 });
}
