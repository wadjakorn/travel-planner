-- CreateEnum
CREATE TYPE "TravelMode" AS ENUM ('CAR', 'WALK', 'TRANSIT', 'BICYCLE');

-- AlterTable: make stayMinutes required with default 60 (backfill NULLs first)
UPDATE "Spot" SET "stayMinutes" = 60 WHERE "stayMinutes" IS NULL;
ALTER TABLE "Spot" ALTER COLUMN "stayMinutes" SET NOT NULL;
ALTER TABLE "Spot" ALTER COLUMN "stayMinutes" SET DEFAULT 60;

-- AlterTable: add travelModeToNext to Spot
ALTER TABLE "Spot" ADD COLUMN "travelModeToNext" "TravelMode";

-- AlterTable: add defaultTravelMode to TripDay
ALTER TABLE "TripDay" ADD COLUMN "defaultTravelMode" "TravelMode" NOT NULL DEFAULT 'CAR';

-- AlterTable: add arrival/departure fields to Trip
ALTER TABLE "Trip" ADD COLUMN "arrivalName"      TEXT;
ALTER TABLE "Trip" ADD COLUMN "arrivalAddress"   TEXT;
ALTER TABLE "Trip" ADD COLUMN "arrivalLat"       DOUBLE PRECISION;
ALTER TABLE "Trip" ADD COLUMN "arrivalLng"       DOUBLE PRECISION;
ALTER TABLE "Trip" ADD COLUMN "departureName"    TEXT;
ALTER TABLE "Trip" ADD COLUMN "departureAddress" TEXT;
ALTER TABLE "Trip" ADD COLUMN "departureLat"     DOUBLE PRECISION;
ALTER TABLE "Trip" ADD COLUMN "departureLng"     DOUBLE PRECISION;

-- CreateTable: Accommodation
CREATE TABLE "Accommodation" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "address"   TEXT,
    "lat"       DOUBLE PRECISION NOT NULL,
    "lng"       DOUBLE PRECISION NOT NULL,
    "placeId"   TEXT,
    "tripId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NightAccommodation
CREATE TABLE "NightAccommodation" (
    "id"              TEXT NOT NULL,
    "date"            DATE NOT NULL,
    "tripId"          TEXT NOT NULL,
    "accommodationId" TEXT,

    CONSTRAINT "NightAccommodation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Accommodation_tripId_idx" ON "Accommodation"("tripId");
CREATE INDEX "NightAccommodation_tripId_idx" ON "NightAccommodation"("tripId");
CREATE UNIQUE INDEX "NightAccommodation_tripId_date_key" ON "NightAccommodation"("tripId", "date");

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_tripId_fkey"
    FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NightAccommodation" ADD CONSTRAINT "NightAccommodation_tripId_fkey"
    FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NightAccommodation" ADD CONSTRAINT "NightAccommodation_accommodationId_fkey"
    FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
