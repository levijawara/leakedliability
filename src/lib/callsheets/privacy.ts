// Privacy utilities for masking and protecting sensitive data

import type { CrewContact } from "@/types/callSheet";

/**
 * Mask an email address for display
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = local.length > 2
    ? `${local[0]}***${local[local.length - 1]}`
    : `${local[0]}***`;
  
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.map((part, i) => {
    if (i === domainParts.length - 1) return part;
    return part.length > 2
      ? `${part[0]}***${part[part.length - 1]}`
      : `${part[0]}***`;
  }).join('.');
  
  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Mask a phone number for display
 */
export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ***-**${cleaned.slice(-2)}`;
  } else if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ***-**${cleaned.slice(-2)}`;
  }
  
  if (cleaned.length >= 5) {
    return `${cleaned.slice(0, 3)}${'*'.repeat(cleaned.length - 5)}${cleaned.slice(-2)}`;
  }
  
  return phone;
}

/**
 * Mask a name for display
 */
export function maskName(name: string): string {
  return name.split(' ')
    .map(part => part.length > 1 ? `${part[0]}***` : part)
    .join(' ');
}

/**
 * Mask an Instagram handle
 */
export function maskInstagram(handle: string): string {
  const cleaned = handle.replace(/^@/, '');
  if (cleaned.length <= 2) return handle;
  
  const masked = `${cleaned[0]}${'*'.repeat(cleaned.length - 2)}${cleaned[cleaned.length - 1]}`;
  return handle.startsWith('@') ? `@${masked}` : masked;
}

/**
 * Apply privacy masking to a contact
 */
export function maskContact(
  contact: CrewContact,
  options: {
    maskEmails?: boolean;
    maskPhones?: boolean;
    maskName?: boolean;
    maskInstagram?: boolean;
  } = {}
): CrewContact {
  const masked = { ...contact };
  
  if (options.maskEmails && contact.emails) {
    masked.emails = contact.emails.map(maskEmail);
  }
  
  if (options.maskPhones && contact.phones) {
    masked.phones = contact.phones.map(maskPhone);
  }
  
  if (options.maskName) {
    masked.name = maskName(contact.name);
  }
  
  if (options.maskInstagram && contact.instagram_handle) {
    masked.instagram_handle = maskInstagram(contact.instagram_handle);
  }
  
  return masked;
}

/**
 * Check if a string looks like an email
 */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Check if a string looks like a phone number
 */
export function isPhone(value: string): boolean {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Check if a string looks like an Instagram handle
 */
export function isInstagram(value: string): boolean {
  return /^@?[\w.]+$/.test(value) && value.length <= 30;
}

/**
 * Redact sensitive information from text
 */
export function redactSensitiveText(text: string): string {
  let redacted = text;
  
  redacted = redacted.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL REDACTED]'
  );
  
  redacted = redacted.replace(
    /(\+?\d{1,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    '[PHONE REDACTED]'
  );
  
  redacted = redacted.replace(
    /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    '[SSN REDACTED]'
  );
  
  return redacted;
}

/**
 * Generate a privacy-safe export summary
 */
export function generatePrivacySummary(contacts: CrewContact[]): string {
  const summary = {
    totalContacts: contacts.length,
    withEmail: contacts.filter(c => c.emails && c.emails.length > 0).length,
    withPhone: contacts.filter(c => c.phones && c.phones.length > 0).length,
    withInstagram: contacts.filter(c => c.instagram_handle).length,
    departments: new Set(contacts.flatMap(c => c.departments || [])).size,
    roles: new Set(contacts.flatMap(c => c.roles || [])).size,
  };
  
  return `Contact Database Summary:
- Total Contacts: ${summary.totalContacts}
- With Email: ${summary.withEmail} (${Math.round(summary.withEmail / summary.totalContacts * 100)}%)
- With Phone: ${summary.withPhone} (${Math.round(summary.withPhone / summary.totalContacts * 100)}%)
- With Instagram: ${summary.withInstagram} (${Math.round(summary.withInstagram / summary.totalContacts * 100)}%)
- Departments: ${summary.departments}
- Roles: ${summary.roles}`;
}
