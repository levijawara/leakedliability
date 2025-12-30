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

export function censorPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  const areaCode = digits.slice(0, 3);
  const lastTwo = digits.slice(-2);
  return `(${areaCode}) ***-**${lastTwo}`;
}
