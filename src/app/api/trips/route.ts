import { getSession as auth } from "@/lib/get-session";
import { getUserTrips, createTrip } from "@/services/trip.service";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trips = await getUserTrips(session.user.id);
  return NextResponse.json(trips);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, startDate, endDate } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }
  if (new Date(startDate) > new Date(endDate)) {
    return NextResponse.json(
      { error: "startDate must be before or equal to endDate" },
      { status: 400 }
    );
  }

  const trip = await createTrip(session.user.id, {
    title: title.trim(),
    startDate,
    endDate,
  });

  return NextResponse.json(trip, { status: 201 });
}
