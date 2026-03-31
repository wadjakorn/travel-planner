import { auth } from "@/lib/auth";
import { getUserTrips } from "@/services/trip.service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TripWithDays } from "@/types";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const trips = await getUserTrips(session.user.id);

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Trips</h2>
          <p className="text-muted-foreground">
            Plan your trips, pin spots, optimize routes.
          </p>
        </div>
        <Link href="/trip/new">
          <Button>New Trip</Button>
        </Link>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">
              No trips yet. Create your first one!
            </p>
            <Link href="/trip/new">
              <Button>Create Trip</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {trips.map((trip: TripWithDays) => (
            <Link key={trip.id} href={`/trip/${trip.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>{trip.title}</CardTitle>
                  <CardDescription>
                    {new Date(trip.startDate).toLocaleDateString()} &mdash;{" "}
                    {new Date(trip.endDate).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {trip.days.length} days &middot;{" "}
                    {trip.days.reduce(
                      (acc: number, d: { spots: unknown[] }) =>
                        acc + d.spots.length,
                      0
                    )}{" "}
                    spots
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
