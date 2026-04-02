/**
 * Consistent date formatting helpers.
 *
 * All Prisma Date (@db.Date) fields are stored as UTC midnight.
 * Always pass timeZone: "UTC" when formatting them so the displayed day
 * matches the stored date regardless of the user's local timezone.
 *
 * Using a fixed locale ("en-US") prevents server/client hydration mismatches
 * caused by differing locale environments.
 */

/** "Apr 13, 2026" */
export function fmtDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Sat, Apr 11" */
export function fmtDayLabel(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Apr 13" */
export function fmtShortDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
