import { auth } from "@/lib/auth";
import {
  getTripById,
  enableShareLink,
  disableShareLink,
} from "@/services/trip.service";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ tripId: string }>;
}

/** POST — generate / regenerate a share token */
export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params;
  const trip = await getTripById(tripId, session.user.id);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const token = await enableShareLink(tripId, session.user.id);
  return NextResponse.json({ token });
}

/** DELETE — revoke the share token */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params;
  const trip = await getTripById(tripId, session.user.id);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  await disableShareLink(tripId, session.user.id);
  return new NextResponse(null, { status: 204 });
}
