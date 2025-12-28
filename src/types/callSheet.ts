// Call Sheet Types for EC Integration
// Note: Types aligned with actual crew_contacts database schema

export interface CrewContact {
  id: string;
  user_id: string;
  name: string;
  emails: string[] | null;
  phones: string[] | null;
  roles: string[] | null;
  departments: string[] | null;
  instagram_handle: string | null;
  notes: string | null;
  source_files: string[] | null;
  call_sheet_id: string | null;
  confidence: number | null;
  hidden_emails: string[] | null;
  hidden_phones: string[] | null;
  hidden_roles: string[] | null;
  hidden_departments: string[] | null;
  hidden_ig_handle: boolean | null;
  created_at: string;
  updated_at: string;
  is_selected?: boolean;
  match_confidence?: number;
}

export interface CallSheet {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: 'queued' | 'parsing' | 'parsed' | 'error' | 'reviewed';
  parsed_contacts: ParsedContact[] | null;
  content_hash: string | null;
  error_message: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  parsed_at: string | null;
  reviewed_at: string | null;
}

export interface ParsedContact {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  instagram_handle?: string;
  raw_text?: string;
  confidence?: number;
}

export interface ContactField {
  key: keyof CrewContact;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'multiselect';
  required?: boolean;
  options?: string[];
}

export interface DuplicateMatch {
  contact1: CrewContact;
  contact2: CrewContact;
  matchScore: number;
  matchReasons: string[];
}

export interface ExportOptions {
  format: 'csv' | 'vcard' | 'json';
  includeFields: (keyof CrewContact)[];
  filterDepartment?: string;
  filterRole?: string;
}

export interface ParseReport {
  callSheetId: string;
  filename: string;
  totalContacts: number;
  selectedContacts: number;
  duplicatesFound: number;
  parseErrors: string[];
  departments: string[];
  roles: string[];
  parsedAt: string;
}

export type SortField = 'name' | 'departments' | 'roles' | 'created_at' | 'updated_at';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface FilterConfig {
  searchQuery: string;
  departments: string[];
  roles: string[];
  hasEmail: boolean | null;
  hasPhone: boolean | null;
  hasInstagram: boolean | null;
}
