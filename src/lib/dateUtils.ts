import { format, formatInTimeZone, toZonedTime } from "date-fns-tz";

const PACIFIC_TZ = "America/Los_Angeles";

/** Format a date for display in Pacific time */
export function formatPacific(date: Date | string, fmt: string = "MM/dd/yy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, PACIFIC_TZ, fmt);
}

/** Get current date/time in Pacific for "Last Updated" etc */
export function nowPacific(): Date {
  return toZonedTime(new Date(), PACIFIC_TZ);
}
