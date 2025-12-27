// Export parse reports and summaries

import type { CallSheet, CrewContact, ParseReport, ParsedContact } from "@/types/callSheet";
import { getUniqueDepartments, getUniqueRoles } from "./creditsSorting";

/**
 * Generate a parse report for a call sheet
 */
export function generateParseReport(
  callSheet: CallSheet,
  selectedContacts: CrewContact[],
  allParsedContacts: ParsedContact[]
): ParseReport {
  const departments = getUniqueDepartments(selectedContacts);
  const roles = getUniqueRoles(selectedContacts);
  
  return {
    callSheetId: callSheet.id,
    filename: callSheet.filename,
    totalContacts: allParsedContacts.length,
    selectedContacts: selectedContacts.length,
    duplicatesFound: allParsedContacts.length - selectedContacts.length,
    parseErrors: callSheet.error_message ? [callSheet.error_message] : [],
    departments,
    roles,
    parsedAt: callSheet.parsed_at || new Date().toISOString(),
  };
}

/**
 * Export parse report to text format
 */
export function exportReportToText(report: ParseReport): string {
  const lines: string[] = [
    '=' .repeat(60),
    'CALL SHEET PARSE REPORT',
    '=' .repeat(60),
    '',
    `File: ${report.filename}`,
    `Parsed: ${new Date(report.parsedAt).toLocaleString()}`,
    '',
    '-'.repeat(40),
    'SUMMARY',
    '-'.repeat(40),
    `Total Contacts Found: ${report.totalContacts}`,
    `Selected Contacts: ${report.selectedContacts}`,
    `Duplicates/Skipped: ${report.duplicatesFound}`,
    '',
  ];
  
  if (report.departments.length > 0) {
    lines.push('-'.repeat(40));
    lines.push('DEPARTMENTS');
    lines.push('-'.repeat(40));
    for (const dept of report.departments) {
      lines.push(`  • ${dept}`);
    }
    lines.push('');
  }
  
  if (report.roles.length > 0) {
    lines.push('-'.repeat(40));
    lines.push('ROLES');
    lines.push('-'.repeat(40));
    for (const role of report.roles) {
      lines.push(`  • ${role}`);
    }
    lines.push('');
  }
  
  if (report.parseErrors.length > 0) {
    lines.push('-'.repeat(40));
    lines.push('ERRORS');
    lines.push('-'.repeat(40));
    for (const error of report.parseErrors) {
      lines.push(`  ⚠ ${error}`);
    }
    lines.push('');
  }
  
  lines.push('=' .repeat(60));
  
  return lines.join('\n');
}

/**
 * Export parse report to JSON format
 */
export function exportReportToJSON(report: ParseReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Generate summary statistics for multiple call sheets
 */
export function generateBatchSummary(
  callSheets: CallSheet[],
  allContacts: CrewContact[]
): {
  totalSheets: number;
  successfulSheets: number;
  failedSheets: number;
  totalContacts: number;
  uniqueDepartments: number;
  uniqueRoles: number;
  avgContactsPerSheet: number;
} {
  const successfulSheets = callSheets.filter(s => s.status === 'parsed' || s.status === 'reviewed');
  const failedSheets = callSheets.filter(s => s.status === 'error');
  
  const departments = getUniqueDepartments(allContacts);
  const roles = getUniqueRoles(allContacts);
  
  return {
    totalSheets: callSheets.length,
    successfulSheets: successfulSheets.length,
    failedSheets: failedSheets.length,
    totalContacts: allContacts.length,
    uniqueDepartments: departments.length,
    uniqueRoles: roles.length,
    avgContactsPerSheet: callSheets.length > 0 
      ? Math.round(allContacts.length / callSheets.length) 
      : 0,
  };
}

/**
 * Format contact for report display
 */
export function formatContactForReport(contact: CrewContact): string {
  const parts = [contact.name];
  
  const role = contact.roles?.[0];
  const department = contact.departments?.[0];
  if (role) parts.push(`(${role})`);
  if (department) parts.push(`[${department}]`);
  
  const details: string[] = [];
  const email = contact.emails?.[0];
  const phone = contact.phones?.[0];
  if (email) details.push(email);
  if (phone) details.push(phone);
  if (contact.instagram_handle) details.push(contact.instagram_handle);
  
  if (details.length > 0) {
    parts.push(`- ${details.join(' | ')}`);
  }
  
  return parts.join(' ');
}

/**
 * Export contacts summary to text
 */
export function exportContactsSummary(contacts: CrewContact[]): string {
  const lines: string[] = [
    '=' .repeat(60),
    'CONTACTS SUMMARY',
    '=' .repeat(60),
    '',
    `Total Contacts: ${contacts.length}`,
    '',
  ];
  
  const byDepartment = new Map<string, CrewContact[]>();
  for (const contact of contacts) {
    const dept = contact.departments?.[0] || 'Unknown';
    if (!byDepartment.has(dept)) {
      byDepartment.set(dept, []);
    }
    byDepartment.get(dept)!.push(contact);
  }
  
  for (const [dept, deptContacts] of byDepartment.entries()) {
    lines.push('-'.repeat(40));
    lines.push(`${dept} (${deptContacts.length})`);
    lines.push('-'.repeat(40));
    
    for (const contact of deptContacts) {
      lines.push(`  ${formatContactForReport(contact)}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Download report as file
 */
export function downloadReport(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
