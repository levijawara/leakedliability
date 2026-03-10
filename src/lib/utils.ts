import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function censorEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const firstChar = local.charAt(0) || '*';
  return `${firstChar}***@${domain}`;
}

/** Add N business days (skip Sat/Sun) to a date. */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

/** True if today (local date) is on or after the given date (compare dates only). */
export function isDateOnOrAfter(today: Date, target: Date): boolean {
  const t = new Date(today);
  const g = new Date(target);
  t.setHours(0, 0, 0, 0);
  g.setHours(0, 0, 0, 0);
  return t >= g;
}

export function censorPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  const areaCode = digits.slice(0, 3);
  const lastTwo = digits.slice(-2);
  return `(${areaCode}) ***-**${lastTwo}`;
}
