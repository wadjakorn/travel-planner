import { auth } from "@/lib/auth";
import { createTrip } from "@/services/trip.service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NewTripPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  async function handleCreate(formData: FormData) {
    "use server";

    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const title = (formData.get("title") as string)?.trim();
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;

    if (!title || !startDate || !endDate) return;
    if (new Date(startDate) > new Date(endDate)) return;

    const trip = await createTrip(session.user.id, { title, startDate, endDate });
    redirect(`/trip/${trip.id}`);
  }

  return (
    <div className="flex min-h-full items-start justify-center pt-16 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>New Trip</CardTitle>
          <CardDescription>Name your trip and pick your dates.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="title" className="text-sm font-medium">
                Trip name
              </label>
              <Input
                id="title"
                name="title"
                placeholder="e.g. Tokyo 2026"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="startDate" className="text-sm font-medium">
                  Start date
                </label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="endDate" className="text-sm font-medium">
                  End date
                </label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">
                Create Trip
              </Button>
              <Link href="/" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
