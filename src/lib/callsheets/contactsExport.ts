// Export contacts to various formats (CSV, vCard, JSON)

import type { CrewContact, ExportOptions } from "@/types/callSheet";

/**
 * Export contacts to CSV format
 */
export function exportToCSV(
  contacts: CrewContact[],
  fields: (keyof CrewContact)[]
): string {
  const headers = fields.map(f => fieldToLabel(f));
  const rows = contacts.map(contact =>
    fields.map(field => {
      const value = contact[field];
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) return value.join('; ');
      return String(value).replace(/"/g, '""');
    })
  );
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

/**
 * Export a single contact to vCard format
 */
export function contactToVCard(contact: CrewContact): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${contact.name}`,
  ];
  
  // Parse name parts
  const nameParts = contact.name.split(' ');
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ');
  lines.push(`N:${lastName};${firstName};;;`);
  
  if (contact.email) {
    lines.push(`EMAIL:${contact.email}`);
  }
  
  if (contact.phone) {
    lines.push(`TEL:${contact.phone}`);
  }
  
  if (contact.role || contact.department) {
    const title = [contact.role, contact.department].filter(Boolean).join(' - ');
    lines.push(`TITLE:${title}`);
  }
  
  if (contact.instagram_handle) {
    lines.push(`X-SOCIALPROFILE;TYPE=instagram:https://instagram.com/${contact.instagram_handle.replace('@', '')}`);
  }
  
  if (contact.notes) {
    lines.push(`NOTE:${contact.notes.replace(/\n/g, '\\n')}`);
  }
  
  lines.push('END:VCARD');
  
  return lines.join('\r\n');
}

/**
 * Export multiple contacts to vCard format
 */
export function exportToVCard(contacts: CrewContact[]): string {
  return contacts.map(contactToVCard).join('\r\n');
}

/**
 * Export contacts to JSON format
 */
export function exportToJSON(
  contacts: CrewContact[],
  fields: (keyof CrewContact)[]
): string {
  const filtered = contacts.map(contact => {
    const obj: Record<string, unknown> = {};
    for (const field of fields) {
      obj[field] = contact[field];
    }
    return obj;
  });
  
  return JSON.stringify(filtered, null, 2);
}

/**
 * Main export function
 */
export function exportContacts(
  contacts: CrewContact[],
  options: ExportOptions
): { content: string; filename: string; mimeType: string } {
  // Apply filters
  let filtered = [...contacts];
  
  if (options.filterDepartment) {
    filtered = filtered.filter(c => 
      c.department === options.filterDepartment ||
      c.departments?.includes(options.filterDepartment!)
    );
  }
  
  if (options.filterRole) {
    filtered = filtered.filter(c => c.role === options.filterRole);
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  
  switch (options.format) {
    case 'csv':
      return {
        content: exportToCSV(filtered, options.includeFields),
        filename: `contacts-${timestamp}.csv`,
        mimeType: 'text/csv',
      };
    case 'vcard':
      return {
        content: exportToVCard(filtered),
        filename: `contacts-${timestamp}.vcf`,
        mimeType: 'text/vcard',
      };
    case 'json':
      return {
        content: exportToJSON(filtered, options.includeFields),
        filename: `contacts-${timestamp}.json`,
        mimeType: 'application/json',
      };
  }
}

/**
 * Trigger file download in browser
 */
export function downloadExport(
  content: string,
  filename: string,
  mimeType: string
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

/**
 * Convert field key to human-readable label
 */
function fieldToLabel(field: keyof CrewContact): string {
  const labels: Record<keyof CrewContact, string> = {
    id: 'ID',
    user_id: 'User ID',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    role: 'Role',
    department: 'Department',
    departments: 'Departments',
    instagram_handle: 'Instagram',
    notes: 'Notes',
    source_files: 'Source Files',
    call_sheet_id: 'Call Sheet ID',
    created_at: 'Created At',
    updated_at: 'Updated At',
    is_selected: 'Selected',
    match_confidence: 'Match Confidence',
  };
  return labels[field] || field;
}

/**
 * Get default export fields
 */
export function getDefaultExportFields(): (keyof CrewContact)[] {
  return ['name', 'email', 'phone', 'role', 'department', 'instagram_handle', 'notes'];
}
