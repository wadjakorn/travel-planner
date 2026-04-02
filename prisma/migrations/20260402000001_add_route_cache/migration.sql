-- Add route leg cache fields to TripDay
ALTER TABLE "TripDay" ADD COLUMN "startLegDuration" TEXT;
ALTER TABLE "TripDay" ADD COLUMN "startLegDistance" TEXT;
ALTER TABLE "TripDay" ADD COLUMN "startLegPolyline" TEXT;
ALTER TABLE "TripDay" ADD COLUMN "endLegDuration" TEXT;
ALTER TABLE "TripDay" ADD COLUMN "endLegDistance" TEXT;
ALTER TABLE "TripDay" ADD COLUMN "endLegPolyline" TEXT;

-- Add route leg cache fields to Spot
ALTER TABLE "Spot" ADD COLUMN "legDuration" TEXT;
ALTER TABLE "Spot" ADD COLUMN "legDistance" TEXT;
ALTER TABLE "Spot" ADD COLUMN "legPolyline" TEXT;
