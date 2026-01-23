-- Leaked Liability™ Database Schema Export
-- Generated: 2026-01-23
-- Project: blpbeopmdfahiosglomx
-- 
-- This file contains the complete database schema including:
-- - Enums
-- - Tables
-- - Views
-- - Functions
-- - Triggers
-- - Indexes
-- - RLS Policies
--
-- NOTE: This is a READ-ONLY export. Do not run this directly.
-- Use Supabase migrations for any schema changes.

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE public.account_type AS ENUM ('crew', 'producer', 'production_company', 'admin', 'vendor');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.confirmation_type_enum AS ENUM ('crew_confirmation', 'producer_documentation', 'admin_verification');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'disputed', 'verified', 'rejected');

-- ============================================================================
-- TABLES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- account_bans
-- -----------------------------------------------------------------------------
CREATE TABLE public.account_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  target_email TEXT,
  target_display_name TEXT,
  banned_by UUID NOT NULL,
  reason TEXT NOT NULL,
  appeal_email TEXT DEFAULT 'leakedliability@gmail.com'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID,
  revoked_reason TEXT
);

-- -----------------------------------------------------------------------------
-- analytics_daily_visitors
-- -----------------------------------------------------------------------------
CREATE TABLE public.analytics_daily_visitors (
  id BIGINT NOT NULL DEFAULT nextval('analytics_daily_visitors_id_seq'::regclass) PRIMARY KEY,
  day DATE NOT NULL,
  hashed_visitor TEXT NOT NULL,
  country TEXT,
  region TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- audit_logs
-- -----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- ban_pages
-- -----------------------------------------------------------------------------
CREATE TABLE public.ban_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Your account has been permanently banned.'::text,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- beta_access_codes
-- -----------------------------------------------------------------------------
CREATE TABLE public.beta_access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 10,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expired_at TIMESTAMP WITH TIME ZONE
);

-- -----------------------------------------------------------------------------
-- beta_access_redemptions
-- -----------------------------------------------------------------------------
CREATE TABLE public.beta_access_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code_id UUID NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- call_sheet_config
-- -----------------------------------------------------------------------------
CREATE TABLE public.call_sheet_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_limit_enabled BOOLEAN DEFAULT false,
  rate_limit_per_hour INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- call_sheet_heat_metrics
-- -----------------------------------------------------------------------------
CREATE TABLE public.call_sheet_heat_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  global_call_sheet_id UUID UNIQUE,
  total_responses INTEGER DEFAULT 0,
  paid_count INTEGER DEFAULT 0,
  waiting_count INTEGER DEFAULT 0,
  never_paid_count INTEGER DEFAULT 0,
  unanswered_count INTEGER DEFAULT 0,
  heat_score NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- call_sheets
-- -----------------------------------------------------------------------------
CREATE TABLE public.call_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content_hash TEXT,
  status TEXT DEFAULT 'queued'::text,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  parsed_date TIMESTAMP WITH TIME ZONE,
  contacts_extracted INTEGER DEFAULT 0,
  parsed_contacts JSONB,
  review_completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  retry_count INTEGER DEFAULT 0,
  parsing_started_at TIMESTAMP WITH TIME ZONE,
  last_error_at TIMESTAMP WITH TIME ZONE
);

-- -----------------------------------------------------------------------------
-- confirmation_cash_transactions
-- -----------------------------------------------------------------------------
CREATE TABLE public.confirmation_cash_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_report_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL,
  confirmation_speed TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- -----------------------------------------------------------------------------
-- confirmation_pool
-- -----------------------------------------------------------------------------
CREATE TABLE public.confirmation_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_collected NUMERIC NOT NULL DEFAULT 0,
  total_distributed NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- contact_call_sheets
-- -----------------------------------------------------------------------------
CREATE TABLE public.contact_call_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL,
  call_sheet_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (contact_id, call_sheet_id)
);

-- -----------------------------------------------------------------------------
-- contact_dedupe_exceptions
-- -----------------------------------------------------------------------------
CREATE TABLE public.contact_dedupe_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id_a UUID NOT NULL,
  contact_id_b UUID NOT NULL,
  field_type TEXT NOT NULL,
  field_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- crew_contacts
-- -----------------------------------------------------------------------------
CREATE TABLE public.crew_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phones TEXT[] DEFAULT '{}'::text[],
  emails TEXT[] DEFAULT '{}'::text[],
  roles TEXT[] DEFAULT '{}'::text[],
  departments TEXT[] DEFAULT '{}'::text[],
  source_files TEXT[] DEFAULT '{}'::text[],
  project_title TEXT,
  ig_handle TEXT,
  confidence NUMERIC DEFAULT 1.0,
  needs_review BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  hidden_ig_handle BOOLEAN DEFAULT false,
  hidden_roles TEXT[] DEFAULT '{}'::text[],
  hidden_departments TEXT[] DEFAULT '{}'::text[],
  hidden_phones TEXT[] DEFAULT '{}'::text[],
  hidden_emails TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  identity_group_id UUID,
  identity_confidence NUMERIC DEFAULT 0.0
);

-- -----------------------------------------------------------------------------
-- custom_departments
-- -----------------------------------------------------------------------------
CREATE TABLE public.custom_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- disputes
-- -----------------------------------------------------------------------------
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_report_id UUID NOT NULL,
  opened_by UUID NOT NULL,
  reason TEXT NOT NULL,
  evidence_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'open'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  admin_decision TEXT
);

-- -----------------------------------------------------------------------------
-- escrow_payments
-- -----------------------------------------------------------------------------
CREATE TABLE public.escrow_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_code TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  crew_email TEXT NOT NULL,
  crew_name TEXT NOT NULL,
  producer_email TEXT,
  producer_name TEXT,
  project_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMP WITH TIME ZONE,
  redeemed_by UUID,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- -----------------------------------------------------------------------------
-- fafo_entries
-- -----------------------------------------------------------------------------
CREATE TABLE public.fafo_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id UUID,
  producer_name TEXT,
  amount_owed NUMERIC,
  days_overdue INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- global_call_sheets
-- -----------------------------------------------------------------------------
CREATE TABLE public.global_call_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_hash TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'::text,
  parsed_contacts JSONB,
  contacts_extracted INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parsing_started_at TIMESTAMP WITH TIME ZONE,
  original_uploader_id UUID
);

-- -----------------------------------------------------------------------------
-- grace_period_logs
-- -----------------------------------------------------------------------------
CREATE TABLE public.grace_period_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_report_id UUID,
  action_taken TEXT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- ig_master_identities
-- -----------------------------------------------------------------------------
CREATE TABLE public.ig_master_identities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ig_handle TEXT NOT NULL,
  roles TEXT[] DEFAULT '{}'::text[],
  source TEXT DEFAULT 'manual'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- ig_usernames
-- -----------------------------------------------------------------------------
CREATE TABLE public.ig_usernames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  roles TEXT[] DEFAULT '{}'::text[],
  co_workers TEXT[] DEFAULT '{}'::text[],
  raw_credits TEXT[] DEFAULT '{}'::text[],
  occurrences INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- leaderboard_config
-- -----------------------------------------------------------------------------
CREATE TABLE public.leaderboard_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  threshold_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMP WITH TIME ZONE,
  producer_count_at_lock INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- liability_chain
-- -----------------------------------------------------------------------------
CREATE TABLE public.liability_chain (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL,
  accused_name TEXT NOT NULL,
  accused_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  claim_reason TEXT,
  redirect_evidence_urls TEXT[]
);

-- -----------------------------------------------------------------------------
-- liability_history
-- -----------------------------------------------------------------------------
CREATE TABLE public.liability_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  new_name TEXT,
  new_email TEXT,
  previous_name TEXT,
  previous_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  admin_id UUID
);

-- -----------------------------------------------------------------------------
-- past_debts
-- -----------------------------------------------------------------------------
CREATE TABLE public.past_debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id UUID NOT NULL,
  amount_owed NUMERIC DEFAULT 0,
  days_overdue INTEGER DEFAULT 0,
  date_resolved DATE NOT NULL DEFAULT CURRENT_DATE,
  reporter_type TEXT DEFAULT 'crew'::text,
  total_reports_at_time INTEGER DEFAULT 1
);

-- -----------------------------------------------------------------------------
-- payment_confirmations
-- -----------------------------------------------------------------------------
CREATE TABLE public.payment_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_report_id UUID NOT NULL,
  confirmation_type public.confirmation_type_enum NOT NULL,
  confirmed_by UUID,
  notes TEXT,
  document_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- payment_reports
-- -----------------------------------------------------------------------------
CREATE TABLE public.payment_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id TEXT UNIQUE,
  producer_id UUID,
  reporter_id UUID,
  amount_owed NUMERIC NOT NULL,
  invoice_date DATE NOT NULL,
  days_overdue INTEGER DEFAULT 0,
  payment_date DATE,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_date DATE,
  project_name TEXT,
  reporter_type TEXT DEFAULT 'crew'::text,
  city TEXT,
  status public.payment_status DEFAULT 'pending'::payment_status,
  confirmation_deadline TIMESTAMP WITH TIME ZONE,
  score_update_scheduled_for TIMESTAMP WITH TIME ZONE,
  confirmation_count INTEGER DEFAULT 0,
  current_liable_name TEXT,
  current_liable_email TEXT,
  liability_chain_length INTEGER DEFAULT 0,
  liability_loop_detected BOOLEAN DEFAULT false,
  producer_email TEXT
);

-- -----------------------------------------------------------------------------
-- producer_associations
-- -----------------------------------------------------------------------------
CREATE TABLE public.producer_associations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_producer_id UUID NOT NULL,
  child_producer_id UUID NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'works_under'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- -----------------------------------------------------------------------------
-- producer_self_reports
-- -----------------------------------------------------------------------------
CREATE TABLE public.producer_self_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id UUID NOT NULL,
  crew_name TEXT NOT NULL,
  crew_email TEXT,
  amount_owed NUMERIC NOT NULL,
  project_name TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'unverified'::text,
  corroboration_count INTEGER DEFAULT 0,
  share_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- producers
-- -----------------------------------------------------------------------------
CREATE TABLE public.producers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  pscs_score NUMERIC DEFAULT 1000,
  total_payments INTEGER DEFAULT 0,
  average_days_to_pay INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_amount_owed NUMERIC DEFAULT 0,
  oldest_debt_date DATE,
  oldest_debt_days INTEGER DEFAULT 0,
  total_crew_owed INTEGER DEFAULT 0,
  total_jobs_owed INTEGER DEFAULT 0,
  total_cities_owed INTEGER DEFAULT 0,
  paid_jobs_count INTEGER DEFAULT 0,
  paid_crew_count INTEGER DEFAULT 0,
  total_vendors_owed INTEGER DEFAULT 0,
  total_vendor_debt NUMERIC DEFAULT 0,
  momentum_active_until TIMESTAMP WITH TIME ZONE,
  last_closed_date DATE,
  plateau_days INTEGER DEFAULT 0,
  account_status TEXT DEFAULT 'active'::text,
  sub_name TEXT,
  verification_status TEXT DEFAULT 'unverified'::text,
  has_claimed_account BOOLEAN DEFAULT false,
  claimed_by_user_id UUID,
  is_placeholder BOOLEAN DEFAULT false,
  stripe_verification_status TEXT DEFAULT 'unverified'::text,
  stripe_identity_verification_session_id TEXT,
  stripe_verified_first_name TEXT,
  stripe_verified_last_name TEXT,
  created_by_admin BOOLEAN DEFAULT false,
  auto_created BOOLEAN DEFAULT false
);

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  legal_first_name TEXT,
  legal_last_name TEXT,
  business_name TEXT,
  company_affiliation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_super_admin BOOLEAN DEFAULT false,
  account_type public.account_type,
  email TEXT,
  confirmation_cash_balance NUMERIC DEFAULT 0,
  account_status TEXT DEFAULT 'active'::text,
  leaderboard_report_unlock BOOLEAN DEFAULT false
);

-- -----------------------------------------------------------------------------
-- pscs_config
-- -----------------------------------------------------------------------------
CREATE TABLE public.pscs_config (
  key TEXT NOT NULL PRIMARY KEY,
  value NUMERIC NOT NULL,
  description TEXT
);

-- -----------------------------------------------------------------------------
-- queued_producer_notifications
-- -----------------------------------------------------------------------------
CREATE TABLE public.queued_producer_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_report_id UUID NOT NULL,
  send_after TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  send_attempts INTEGER DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- search_logs
-- -----------------------------------------------------------------------------
CREATE TABLE public.search_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  searched_name TEXT NOT NULL,
  matched_producer_id UUID,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- site_settings
-- -----------------------------------------------------------------------------
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT DEFAULT 'We are currently performing scheduled maintenance. Please check back soon.'::text,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  send_producer_notifications BOOLEAN DEFAULT true,
  admin_notes TEXT
);

-- -----------------------------------------------------------------------------
-- submissions
-- -----------------------------------------------------------------------------
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  submission_type TEXT NOT NULL,
  role_department TEXT,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  document_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'pending'::text,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_report_id UUID
);

-- -----------------------------------------------------------------------------
-- suggestions
-- -----------------------------------------------------------------------------
CREATE TABLE public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID,
  suggestion TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  client_ip TEXT
);

-- -----------------------------------------------------------------------------
-- user_call_sheets
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_call_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  global_call_sheet_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_status TEXT,
  UNIQUE (user_id, global_call_sheet_id)
);

-- -----------------------------------------------------------------------------
-- user_entitlements
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entitlement_type TEXT NOT NULL DEFAULT 'leaderboard'::text,
  source TEXT NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'::text,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, entitlement_type)
);

-- -----------------------------------------------------------------------------
-- user_ig_map
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_ig_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  ig_handle TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, lower(trim(name)))
);

-- -----------------------------------------------------------------------------
-- user_roles
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user'::app_role,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- app_flags
-- -----------------------------------------------------------------------------
CREATE VIEW public.app_flags AS
SELECT 
  (SELECT site_settings.maintenance_mode FROM site_settings LIMIT 1) AS maintenance_mode,
  (SELECT site_settings.send_producer_notifications FROM site_settings LIMIT 1) AS notifications_enabled;

-- -----------------------------------------------------------------------------
-- confirmation_cash_balances
-- -----------------------------------------------------------------------------
CREATE VIEW public.confirmation_cash_balances AS
SELECT 
  user_id,
  COALESCE(sum(CASE WHEN transaction_type = 'earned' THEN amount ELSE 0 END), 0) AS total_earned,
  COALESCE(sum(CASE WHEN transaction_type = 'redeemed' THEN amount ELSE 0 END), 0) AS total_redeemed,
  COALESCE(sum(CASE WHEN transaction_type = 'earned' THEN amount ELSE -amount END), 0) AS available_balance
FROM confirmation_cash_transactions
GROUP BY user_id;

-- -----------------------------------------------------------------------------
-- public_leaderboard
-- -----------------------------------------------------------------------------
CREATE VIEW public.public_leaderboard AS
SELECT 
  id AS producer_id,
  name AS producer_name,
  company AS company_name,
  sub_name,
  calculate_pscs_score(id) AS pscs_score,
  total_amount_owed,
  oldest_debt_date,
  oldest_debt_days,
  total_crew_owed,
  total_vendors_owed,
  total_jobs_owed,
  total_cities_owed,
  paid_jobs_count,
  paid_crew_count,
  momentum_active_until,
  last_closed_date
FROM producers p
WHERE account_status <> 'banned' AND (is_placeholder = false OR is_placeholder IS NULL)
ORDER BY 
  calculate_pscs_score(id) DESC,
  CASE WHEN calculate_pscs_score(id) = 1000 AND total_amount_owed = 0 
       THEN COALESCE(CURRENT_DATE - last_closed_date, 0) 
       ELSE NULL END DESC NULLS LAST,
  CASE WHEN calculate_pscs_score(id) <> 1000 
       THEN COALESCE(oldest_debt_days, 0) 
       ELSE NULL END;

-- -----------------------------------------------------------------------------
-- public_payment_reports
-- -----------------------------------------------------------------------------
CREATE VIEW public.public_payment_reports AS
SELECT 
  id, days_overdue, producer_id, reporter_id, amount_owed, invoice_date,
  payment_date, verified, created_at, updated_at, closed_date, project_name,
  reporter_type, report_id, city, status
FROM payment_reports
WHERE verified = true;

-- -----------------------------------------------------------------------------
-- public_producer_search
-- -----------------------------------------------------------------------------
CREATE VIEW public.public_producer_search AS
SELECT 
  id AS producer_id,
  name AS producer_name,
  company AS company_name,
  is_placeholder,
  has_claimed_account,
  stripe_verification_status,
  claimed_by_user_id
FROM producers p
WHERE account_status <> 'banned';

-- -----------------------------------------------------------------------------
-- suggestions_with_profile
-- -----------------------------------------------------------------------------
CREATE VIEW public.suggestions_with_profile AS
SELECT 
  s.id, s.created_at, s.user_id, s.suggestion, s.meta, s.client_ip,
  p.legal_first_name, p.legal_last_name, p.business_name, p.email, p.account_type,
  (SELECT count(*) FROM suggestions s2 WHERE s2.user_id = s.user_id) AS total_suggestions_by_user
FROM suggestions s
LEFT JOIN profiles p ON p.user_id = s.user_id;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX analytics_daily_visitors_day_idx ON public.analytics_daily_visitors USING btree (day DESC);
CREATE UNIQUE INDEX analytics_daily_visitors_day_visitor_idx ON public.analytics_daily_visitors USING btree (day, hashed_visitor);
CREATE INDEX analytics_daily_visitors_geo_idx ON public.analytics_daily_visitors USING btree (day, country, region, city);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs USING btree (event_type);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_call_sheets_hash ON public.call_sheets USING btree (content_hash);
CREATE INDEX idx_call_sheets_status ON public.call_sheets USING btree (status);
CREATE INDEX idx_call_sheets_status_updated_at ON public.call_sheets USING btree (status, updated_at) WHERE status = 'parsing';
CREATE INDEX idx_call_sheets_user ON public.call_sheets USING btree (user_id);
CREATE INDEX idx_heat_metrics_call_sheet ON public.call_sheet_heat_metrics USING btree (global_call_sheet_id);
CREATE INDEX idx_contact_call_sheets_call_sheet ON public.contact_call_sheets USING btree (call_sheet_id);
CREATE INDEX idx_contact_call_sheets_contact ON public.contact_call_sheets USING btree (contact_id);
CREATE INDEX idx_crew_contacts_emails ON public.crew_contacts USING gin (emails);
CREATE INDEX idx_crew_contacts_identity_group ON public.crew_contacts USING btree (identity_group_id);
CREATE INDEX idx_crew_contacts_name_trgm ON public.crew_contacts USING gin (name gin_trgm_ops);
CREATE INDEX idx_crew_contacts_phones ON public.crew_contacts USING gin (phones);
CREATE INDEX idx_crew_contacts_user ON public.crew_contacts USING btree (user_id);
CREATE INDEX idx_disputes_payment_report ON public.disputes USING btree (payment_report_id);
CREATE INDEX idx_disputes_status ON public.disputes USING btree (status);
CREATE INDEX idx_escrow_code ON public.escrow_payments USING btree (payment_code);
CREATE INDEX idx_escrow_status ON public.escrow_payments USING btree (status);
CREATE INDEX idx_global_call_sheets_hash ON public.global_call_sheets USING btree (content_hash);
CREATE INDEX idx_global_call_sheets_status ON public.global_call_sheets USING btree (status);
CREATE INDEX idx_ig_master_handle ON public.ig_master_identities USING btree (ig_handle);
CREATE INDEX idx_ig_master_name ON public.ig_master_identities USING btree (name);
CREATE INDEX idx_liability_chain_report ON public.liability_chain USING btree (report_id);
CREATE INDEX idx_liability_history_report ON public.liability_history USING btree (report_id);
CREATE INDEX idx_past_debts_producer ON public.past_debts USING btree (producer_id);
CREATE INDEX idx_past_debts_resolved ON public.past_debts USING btree (date_resolved);
CREATE INDEX idx_payment_confirmations_report ON public.payment_confirmations USING btree (payment_report_id);
CREATE INDEX idx_payment_reports_confirmation_deadline ON public.payment_reports USING btree (confirmation_deadline);
CREATE INDEX idx_payment_reports_liable_email ON public.payment_reports USING btree (current_liable_email);
CREATE INDEX idx_payment_reports_producer ON public.payment_reports USING btree (producer_id);
CREATE INDEX idx_payment_reports_reporter ON public.payment_reports USING btree (reporter_id);
CREATE INDEX idx_payment_reports_status ON public.payment_reports USING btree (status);
CREATE INDEX idx_producer_associations_child ON public.producer_associations USING btree (child_producer_id);
CREATE INDEX idx_producer_associations_parent ON public.producer_associations USING btree (parent_producer_id);
CREATE INDEX idx_producer_self_reports_producer ON public.producer_self_reports USING btree (producer_id);
CREATE INDEX idx_producers_account_status ON public.producers USING btree (account_status);
CREATE INDEX idx_producers_claimed_by ON public.producers USING btree (claimed_by_user_id);
CREATE INDEX idx_producers_email ON public.producers USING btree (email);
CREATE INDEX idx_producers_name ON public.producers USING btree (name);
CREATE INDEX idx_producers_pscs ON public.producers USING btree (pscs_score DESC);
CREATE INDEX idx_profiles_account_status ON public.profiles USING btree (account_status);
CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);
CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);
CREATE INDEX idx_queued_notifications_send_after ON public.queued_producer_notifications USING btree (send_after);
CREATE INDEX idx_search_logs_name ON public.search_logs USING btree (searched_name);
CREATE INDEX idx_search_logs_producer ON public.search_logs USING btree (matched_producer_id);
CREATE INDEX idx_submissions_payment_report ON public.submissions USING btree (payment_report_id);
CREATE INDEX idx_submissions_status ON public.submissions USING btree (status);
CREATE INDEX idx_submissions_type ON public.submissions USING btree (submission_type);
CREATE INDEX idx_submissions_user ON public.submissions USING btree (user_id);
CREATE INDEX idx_user_call_sheets_global ON public.user_call_sheets USING btree (global_call_sheet_id);
CREATE INDEX idx_user_call_sheets_user ON public.user_call_sheets USING btree (user_id);
CREATE INDEX idx_user_entitlements_status ON public.user_entitlements USING btree (status);
CREATE INDEX idx_user_entitlements_stripe_customer ON public.user_entitlements USING btree (stripe_customer_id);
CREATE INDEX idx_user_entitlements_stripe_subscription ON public.user_entitlements USING btree (stripe_subscription_id);
CREATE INDEX idx_user_entitlements_user ON public.user_entitlements USING btree (user_id);
CREATE INDEX idx_user_ig_map_handle ON public.user_ig_map USING btree (ig_handle);
CREATE INDEX idx_user_ig_map_user ON public.user_ig_map USING btree (user_id);
CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- add_to_confirmation_pool
CREATE OR REPLACE FUNCTION public.add_to_confirmation_pool(amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.confirmation_pool
  SET 
    total_collected = total_collected + amount,
    available_balance = available_balance + amount,
    updated_at = NOW()
  WHERE id IN (SELECT id FROM public.confirmation_pool LIMIT 1);
END;
$$;

-- auto_create_producer_from_report
CREATE OR REPLACE FUNCTION public.auto_create_producer_from_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_producer_id UUID;
  producer_name_from_report TEXT;
  final_producer_name TEXT;
BEGIN
  IF (NEW.producer_email IS NOT NULL AND NEW.producer_email != '')
     OR (NEW.current_liable_name IS NOT NULL AND NEW.current_liable_name != '') THEN
    IF NEW.producer_email IS NOT NULL AND NEW.producer_email != '' THEN
      SELECT id INTO existing_producer_id
      FROM producers
      WHERE email = NEW.producer_email
      LIMIT 1;
    END IF;
    IF existing_producer_id IS NULL AND NEW.current_liable_name IS NOT NULL THEN
      SELECT id INTO existing_producer_id
      FROM producers
      WHERE name = NEW.current_liable_name
      LIMIT 1;
    END IF;
    IF existing_producer_id IS NULL THEN
      IF NEW.producer_id IS NOT NULL THEN
        SELECT name INTO producer_name_from_report
        FROM producers
        WHERE id = NEW.producer_id;
      END IF;
      final_producer_name := COALESCE(
        NEW.current_liable_name,
        producer_name_from_report,
        'Unverified Producer'
      );
      INSERT INTO producers (
        name, email, verification_status, auto_created, account_status, created_by_admin
      ) VALUES (
        final_producer_name, NEW.producer_email, 'unverified', TRUE, 'unverified', FALSE
      )
      RETURNING id INTO existing_producer_id;
      NEW.producer_id := existing_producer_id;
    ELSE
      NEW.producer_id := existing_producer_id;
      IF NEW.producer_email IS NOT NULL THEN
        UPDATE producers
        SET email = NEW.producer_email
        WHERE id = existing_producer_id
        AND (email IS NULL OR email = '')
        AND verification_status = 'unverified';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- auto_verify_payment_on_confirmation
CREATE OR REPLACE FUNCTION public.auto_verify_payment_on_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_report_id IS NULL THEN
    RAISE EXCEPTION 'payment_report_id cannot be NULL';
  END IF;
  UPDATE payment_reports
  SET status = 'paid', payment_date = CURRENT_DATE
  WHERE id = NEW.payment_report_id;
  RETURN NEW;
END;
$$;

-- ban_account
CREATE OR REPLACE FUNCTION public.ban_account(_target_user_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller UUID := auth.uid();
  target_email TEXT;
  target_name TEXT;
  ban_id UUID;
BEGIN
  IF NOT public.has_role(caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  IF _target_user_id IS NULL OR _reason IS NULL OR trim(_reason) = '' THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  SELECT email, (legal_first_name || ' ' || legal_last_name) 
  INTO target_email, target_name 
  FROM public.profiles 
  WHERE user_id = _target_user_id 
  LIMIT 1;
  INSERT INTO public.account_bans (target_user_id, target_email, target_display_name, banned_by, reason)
  VALUES (_target_user_id, target_email, COALESCE(target_name, ''), caller, _reason)
  RETURNING id INTO ban_id;
  UPDATE public.producers SET account_status = 'banned' WHERE id = _target_user_id;
  UPDATE public.profiles SET account_status = 'banned' WHERE user_id = _target_user_id;
  INSERT INTO public.audit_logs (user_id, event_type, payload)
  VALUES (caller, 'ban_account', jsonb_build_object(
    'ban_id', ban_id,
    'target_user_id', _target_user_id,
    'target_email', target_email,
    'reason', _reason
  ));
  RETURN jsonb_build_object(
    'ok', true,
    'ban_id', ban_id,
    'target_user_id', _target_user_id,
    'target_email', target_email,
    'target_name', target_name
  );
END;
$$;

-- calculate_call_sheet_heat_score
CREATE OR REPLACE FUNCTION public.calculate_call_sheet_heat_score(sheet_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  paid_cnt INT := 0;
  waiting_cnt INT := 0;
  never_cnt INT := 0;
  unanswered_cnt INT := 0;
  total_responses INT := 0;
  raw_score NUMERIC;
  heat_score NUMERIC;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE payment_status = 'paid'),
    COUNT(*) FILTER (WHERE payment_status = 'waiting'),
    COUNT(*) FILTER (WHERE payment_status = 'never'),
    COUNT(*) FILTER (WHERE payment_status IS NULL OR payment_status = 'unanswered')
  INTO paid_cnt, waiting_cnt, never_cnt, unanswered_cnt
  FROM user_call_sheets
  WHERE global_call_sheet_id = sheet_id;
  
  total_responses := paid_cnt + waiting_cnt + never_cnt;
  IF total_responses = 0 THEN
    RETURN NULL;
  END IF;
  raw_score := (waiting_cnt * 0.5) + (never_cnt * 1.0) - (paid_cnt * 0.25);
  heat_score := raw_score / total_responses;
  
  INSERT INTO call_sheet_heat_metrics (
    global_call_sheet_id, total_responses, paid_count, waiting_count, 
    never_paid_count, unanswered_count, heat_score, updated_at
  ) VALUES (
    sheet_id, total_responses, paid_cnt, waiting_cnt, 
    never_cnt, unanswered_cnt, heat_score, NOW()
  )
  ON CONFLICT (global_call_sheet_id) DO UPDATE SET
    total_responses = EXCLUDED.total_responses,
    paid_count = EXCLUDED.paid_count,
    waiting_count = EXCLUDED.waiting_count,
    never_paid_count = EXCLUDED.never_paid_count,
    unanswered_count = EXCLUDED.unanswered_count,
    heat_score = EXCLUDED.heat_score,
    updated_at = NOW();
  
  RETURN heat_score;
END;
$$;

-- calculate_days_overdue
CREATE OR REPLACE FUNCTION public.calculate_days_overdue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.days_overdue := (CURRENT_DATE - NEW.invoice_date);
  RETURN NEW;
END;
$$;

-- calculate_identity_score
CREATE OR REPLACE FUNCTION public.calculate_identity_score(
  name1 text, emails1 text[], phones1 text[], roles1 text[],
  name2 text, emails2 text[], phones2 text[], roles2 text[]
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  score NUMERIC := 0;
  email_match BOOLEAN := FALSE;
  phone_match BOOLEAN := FALSE;
  name_similarity NUMERIC;
  role_overlap NUMERIC;
BEGIN
  IF emails1 IS NOT NULL AND emails2 IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM unnest(emails1) e1, unnest(emails2) e2 
      WHERE LOWER(e1) = LOWER(e2)
    ) INTO email_match;
    IF email_match THEN score := score + 0.8; END IF;
  END IF;
  
  IF phones1 IS NOT NULL AND phones2 IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM unnest(phones1) p1, unnest(phones2) p2 
      WHERE REGEXP_REPLACE(p1, '\D', '', 'g') = REGEXP_REPLACE(p2, '\D', '', 'g')
      AND LENGTH(REGEXP_REPLACE(p1, '\D', '', 'g')) >= 10
    ) INTO phone_match;
    IF phone_match THEN score := score + 0.6; END IF;
  END IF;
  
  name_similarity := 1.0 - (
    levenshtein(normalize_contact_name(name1), normalize_contact_name(name2))::NUMERIC / 
    GREATEST(LENGTH(name1), LENGTH(name2), 1)
  );
  IF name_similarity > 0.8 THEN
    score := score + (name_similarity * 0.3);
  END IF;
  
  IF roles1 IS NOT NULL AND roles2 IS NOT NULL AND array_length(roles1, 1) > 0 AND array_length(roles2, 1) > 0 THEN
    SELECT COUNT(*)::NUMERIC / GREATEST(array_length(roles1, 1), array_length(roles2, 1))
    INTO role_overlap
    FROM (SELECT UNNEST(roles1) INTERSECT SELECT UNNEST(roles2)) x;
    score := score + (COALESCE(role_overlap, 0) * 0.1);
  END IF;
  
  RETURN LEAST(score, 1.0);
END;
$$;

-- calculate_oldest_debt_days
CREATE OR REPLACE FUNCTION public.calculate_oldest_debt_days()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.oldest_debt_date IS NOT NULL THEN
    NEW.oldest_debt_days := (CURRENT_DATE - NEW.oldest_debt_date);
  ELSE
    NEW.oldest_debt_days := 0;
  END IF;
  RETURN NEW;
END;
$$;

-- check_call_sheet_rate_limit
CREATE OR REPLACE FUNCTION public.check_call_sheet_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_rate_limit_enabled BOOLEAN;
  hourly_limit INTEGER;
  is_admin BOOLEAN;
  upload_count INTEGER;
BEGIN
  SELECT rate_limit_enabled, rate_limit_per_hour 
  INTO is_rate_limit_enabled, hourly_limit
  FROM call_sheet_config LIMIT 1;
  
  IF NOT COALESCE(is_rate_limit_enabled, false) THEN
    RETURN NEW;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = NEW.user_id AND role = 'admin'
  ) INTO is_admin;
  
  IF is_admin THEN
    RETURN NEW;
  END IF;
  
  SELECT COUNT(*) INTO upload_count
  FROM call_sheets
  WHERE user_id = NEW.user_id
    AND uploaded_at > NOW() - INTERVAL '1 hour';
  
  IF upload_count >= hourly_limit THEN
    INSERT INTO audit_logs (user_id, event_type, payload)
    VALUES (NEW.user_id, 'rate_limit_hit', jsonb_build_object(
      'resource', 'call_sheets',
      'count', upload_count,
      'limit', hourly_limit
    ));
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED';
  END IF;
  
  RETURN NEW;
END;
$$;

-- cleanup_old_past_debts
CREATE OR REPLACE FUNCTION public.cleanup_old_past_debts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM past_debts 
  WHERE date_resolved < CURRENT_DATE - INTERVAL '3 years';
$$;

-- clear_sub_name_on_debt_resolution
CREATE OR REPLACE FUNCTION public.clear_sub_name_on_debt_resolution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  unpaid_count INTEGER;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    SELECT COUNT(*) INTO unpaid_count
    FROM payment_reports
    WHERE producer_id = NEW.producer_id AND status != 'paid';
    IF unpaid_count = 0 THEN
      UPDATE producers
      SET sub_name = NULL
      WHERE id = NEW.producer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- delete_queued_notification_on_payment
CREATE OR REPLACE FUNCTION public.delete_queued_notification_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    DELETE FROM queued_producer_notifications
    WHERE payment_report_id = NEW.id
    AND sent_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- delete_submission_files
CREATE OR REPLACE FUNCTION public.delete_submission_files()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $$
BEGIN
  IF OLD.document_urls IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'submission-documents'
    AND name = ANY(OLD.document_urls);
  END IF;
  RETURN OLD;
END;
$$;

-- detect_liability_loop
CREATE OR REPLACE FUNCTION public.detect_liability_loop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  loop_exists BOOLEAN;
  original_entry RECORD;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM liability_chain
    WHERE report_id = NEW.report_id
    AND accused_email = NEW.accused_email
    AND id != NEW.id
  ) INTO loop_exists;
  
  IF loop_exists THEN
    SELECT * INTO original_entry
    FROM liability_chain
    WHERE report_id = NEW.report_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    UPDATE payment_reports SET
      current_liable_name = original_entry.accused_name,
      current_liable_email = original_entry.accused_email,
      liability_loop_detected = TRUE,
      updated_at = NOW()
    WHERE id = NEW.report_id;
    
    INSERT INTO liability_history (
      report_id, action_type, new_name, new_email, previous_name, previous_email
    ) VALUES (
      NEW.report_id, 'loop_detected', original_entry.accused_name, original_entry.accused_email,
      NEW.accused_name, NEW.accused_email
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- generate_payment_code
CREATE OR REPLACE FUNCTION public.generate_payment_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := UPPER(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM escrow_payments WHERE payment_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- generate_payment_report_id
CREATE OR REPLACE FUNCTION public.generate_payment_report_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    new_id := 'PR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
    SELECT EXISTS(SELECT 1 FROM payment_reports WHERE report_id = new_id) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;
  RETURN new_id;
END;
$$;

-- generate_self_report_share_link
CREATE OR REPLACE FUNCTION public.generate_self_report_share_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.share_link := 
    'https://leakedliability.com/confirm?r=' || NEW.id || '&p=' || NEW.producer_id;
  RETURN NEW;
END;
$$;

-- get_ban_page
CREATE OR REPLACE FUNCTION public.get_ban_page()
RETURNS TABLE(title text, body text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT title, body FROM public.ban_pages LIMIT 1;
$$;

-- get_daily_visitor_stats
CREATE OR REPLACE FUNCTION public.get_daily_visitor_stats(start_date date)
RETURNS TABLE(day date, unique_visitors bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT day, COUNT(DISTINCT hashed_visitor) AS unique_visitors
  FROM analytics_daily_visitors
  WHERE day >= start_date
  GROUP BY day
  ORDER BY day DESC;
$$;

-- get_geo_breakdown
CREATE OR REPLACE FUNCTION public.get_geo_breakdown(selected_day date)
RETURNS TABLE(country text, region text, city text, visitor_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT country, region, city, COUNT(*) AS visitor_count
  FROM analytics_daily_visitors
  WHERE day = selected_day
  GROUP BY country, region, city
  ORDER BY visitor_count DESC;
$$;

-- get_top_searches
CREATE OR REPLACE FUNCTION public.get_top_searches()
RETURNS TABLE(searched_name text, search_count bigint, last_searched timestamp with time zone, recent_searches_7d bigint, matched_producer_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    sl.searched_name,
    COUNT(*) as search_count,
    MAX(sl.created_at) as last_searched,
    COUNT(*) FILTER (WHERE sl.created_at > NOW() - INTERVAL '7 days') as recent_searches_7d,
    p.name as matched_producer_name
  FROM search_logs sl
  LEFT JOIN producers p ON sl.matched_producer_id = p.id
  GROUP BY sl.searched_name, p.name
  ORDER BY search_count DESC
  LIMIT 50;
$$;

-- grant_contributor_access
CREATE OR REPLACE FUNCTION public.grant_contributor_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_account_type TEXT;
  is_threshold_locked BOOLEAN;
  verified_producer_count INTEGER;
BEGIN
  IF NEW.status = 'verified' AND NEW.submission_type IN ('crew_report', 'vendor_report') THEN
    SELECT account_type INTO user_account_type
    FROM public.profiles
    WHERE user_id = NEW.user_id;
    
    IF user_account_type IN ('crew', 'vendor') THEN
      SELECT threshold_locked INTO is_threshold_locked
      FROM public.leaderboard_config
      LIMIT 1;
      
      IF NOT is_threshold_locked THEN
        INSERT INTO public.user_entitlements (
          user_id, entitlement_type, source, status
        ) VALUES (
          NEW.user_id, 'leaderboard', 'contributor', 'active'
        )
        ON CONFLICT (user_id, entitlement_type)
        DO UPDATE SET
          source = CASE WHEN EXCLUDED.source = 'admin_override' THEN 'admin_override' ELSE 'contributor' END,
          status = 'active',
          updated_at = now();
      END IF;
      
      SELECT COUNT(DISTINCT producer_id) INTO verified_producer_count
      FROM public.payment_reports
      WHERE verified = true;
      
      IF verified_producer_count >= 20 AND NOT is_threshold_locked THEN
        UPDATE public.leaderboard_config
        SET threshold_locked = true, locked_at = now(),
            producer_count_at_lock = verified_producer_count, updated_at = now();
        
        UPDATE public.user_entitlements
        SET status = 'inactive', updated_at = now()
        WHERE entitlement_type = 'leaderboard' AND source = 'contributor';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- grant_leaderboard_report_unlock
CREATE OR REPLACE FUNCTION public.grant_leaderboard_report_unlock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'verified' 
     AND NEW.submission_type IN ('crew_report', 'vendor_report')
     AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    UPDATE profiles
    SET leaderboard_report_unlock = true
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- increment_corroboration
CREATE OR REPLACE FUNCTION public.increment_corroboration(report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.producer_self_reports
  SET corroboration_count = corroboration_count + 1
  WHERE id = report_id;
END;
$$;

-- log_crew_contact_audit
CREATE OR REPLACE FUNCTION public.log_crew_contact_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO audit_logs (user_id, event_type, payload)
  VALUES (
    auth.uid(),
    'crew_contact_' || LOWER(TG_OP),
    jsonb_build_object(
      'contact_id', COALESCE(NEW.id, OLD.id),
      'name', COALESCE(NEW.name, OLD.name),
      'departments', COALESCE(NEW.departments, OLD.departments),
      'source_files', COALESCE(NEW.source_files, OLD.source_files)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- log_past_debt_on_resolve
CREATE OR REPLACE FUNCTION public.log_past_debt_on_resolve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'paid' 
     AND (OLD.status IS NULL OR OLD.status != 'paid')
     AND NEW.producer_id IS NOT NULL THEN
    INSERT INTO past_debts (
      producer_id, amount_owed, days_overdue, reporter_type, total_reports_at_time
    )
    VALUES (
      NEW.producer_id,
      COALESCE(OLD.amount_owed, 0),
      COALESCE(OLD.days_overdue, 0),
      COALESCE(OLD.reporter_type, 'crew'),
      (SELECT COUNT(*) FROM payment_reports WHERE producer_id = NEW.producer_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- lookup_global_call_sheet_by_hash
CREATE OR REPLACE FUNCTION public.lookup_global_call_sheet_by_hash(_content_hash text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN auth.uid() IS NULL THEN NULL
      ELSE (
        SELECT jsonb_build_object('id', g.id, 'status', g.status)
        FROM public.global_call_sheets g
        WHERE g.content_hash = _content_hash
        LIMIT 1
      )
    END;
$$;

-- normalize_contact_name
CREATE OR REPLACE FUNCTION public.normalize_contact_name(raw_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(raw_name, '\s+', ' ', 'g')));
END;
$$;

-- recalculate_all_heat_scores
CREATE OR REPLACE FUNCTION public.recalculate_all_heat_scores()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sheet_rec RECORD;
  count_processed INT := 0;
BEGIN
  FOR sheet_rec IN SELECT id FROM global_call_sheets LOOP
    PERFORM calculate_call_sheet_heat_score(sheet_rec.id);
    count_processed := count_processed + 1;
  END LOOP;
  RETURN count_processed;
END;
$$;

-- refresh_all_producer_stats
CREATE OR REPLACE FUNCTION public.refresh_all_producer_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE payment_reports
  SET days_overdue = (CURRENT_DATE - invoice_date)
  WHERE status != 'paid';
  
  UPDATE producers
  SET oldest_debt_days = (CURRENT_DATE - oldest_debt_date)
  WHERE oldest_debt_date IS NOT NULL;
  
  UPDATE producers
  SET oldest_debt_days = 0
  WHERE oldest_debt_date IS NULL;
END;
$$;

-- revoke_ban
CREATE OR REPLACE FUNCTION public.revoke_ban(_ban_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  caller UUID := auth.uid();
  rec RECORD;
BEGIN
  IF NOT public.has_role(caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  SELECT * INTO rec FROM public.account_bans WHERE id = _ban_id AND revoked_at IS NULL LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ban_not_found_or_already_revoked';
  END IF;

  UPDATE public.account_bans
    SET revoked_at = now(), revoked_by = caller, revoked_reason = COALESCE(_reason, '')
    WHERE id = _ban_id;

  UPDATE public.producers SET account_status = 'active' WHERE id = rec.target_user_id;
  UPDATE public.profiles SET account_status = 'active' WHERE user_id = rec.target_user_id;

  INSERT INTO public.audit_logs (user_id, event_type, payload)
  VALUES (caller, 'revoke_ban', jsonb_build_object(
    'ban_id', _ban_id,
    'target_user_id', rec.target_user_id
  ));

  RETURN jsonb_build_object('ok', true, 'ban_id', _ban_id, 'target_user_id', rec.target_user_id);
END;
$$;

-- set_confirmation_deadline
CREATE OR REPLACE FUNCTION public.set_confirmation_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending') THEN
    NEW.confirmation_deadline := NOW() + INTERVAL '7 days';
    NEW.score_update_scheduled_for := NEW.confirmation_deadline;
  END IF;
  RETURN NEW;
END;
$$;

-- set_payment_report_id
CREATE OR REPLACE FUNCTION public.set_payment_report_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.report_id IS NULL THEN
    NEW.report_id := generate_payment_report_id();
  END IF;
  RETURN NEW;
END;
$$;

-- update_call_sheets_updated_at
CREATE OR REPLACE FUNCTION public.update_call_sheets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- update_good_standing_momentum
CREATE OR REPLACE FUNCTION public.update_good_standing_momentum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.pscs_score > OLD.pscs_score THEN
    NEW.momentum_active_until := NOW() + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$;

-- update_heat_score_on_payment_change
CREATE OR REPLACE FUNCTION public.update_heat_score_on_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.global_call_sheet_id IS NOT NULL THEN
    PERFORM calculate_call_sheet_heat_score(NEW.global_call_sheet_id);
  END IF;
  RETURN NEW;
END;
$$;

-- update_liability_chain_length
CREATE OR REPLACE FUNCTION public.update_liability_chain_length()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE payment_reports
  SET liability_chain_length = (
    SELECT COUNT(*) FROM liability_chain WHERE report_id = NEW.report_id
  )
  WHERE id = NEW.report_id;
  RETURN NEW;
END;
$$;

-- update_plateau_days
CREATE OR REPLACE FUNCTION public.update_plateau_days()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_plateau_days INTEGER;
BEGIN
  IF ROUND(NEW.pscs_score, 0) = ROUND(OLD.pscs_score, 0) THEN
    new_plateau_days := COALESCE(OLD.plateau_days, 0) + 1;
  ELSE
    new_plateau_days := 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM payment_reports 
    WHERE producer_id = NEW.id AND status != 'paid'
  ) THEN
    new_plateau_days := 0;
  END IF;
  NEW.plateau_days := new_plateau_days;
  RETURN NEW;
END;
$$;

-- update_producer_stats
CREATE OR REPLACE FUNCTION public.update_producer_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.producers
  SET 
    total_payments = (
      SELECT COUNT(*) FROM public.payment_reports 
      WHERE producer_id = NEW.producer_id AND verified = true
    ),
    average_days_to_pay = (
      SELECT COALESCE(AVG(days_overdue), 0)
      FROM public.payment_reports 
      WHERE producer_id = NEW.producer_id AND verified = true
    ),
    updated_at = now()
  WHERE id = NEW.producer_id;
  RETURN NEW;
END;
$$;

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- upsert_ig_handles
CREATE OR REPLACE FUNCTION public.upsert_ig_handles(handles_data jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  inserted_count INT := 0;
  updated_count INT := 0;
  handle_record JSONB;
BEGIN
  FOR handle_record IN SELECT * FROM jsonb_array_elements(handles_data)
  LOOP
    INSERT INTO public.ig_usernames (
      handle, roles, co_workers, raw_credits, occurrences
    )
    VALUES (
      (handle_record->>'handle')::TEXT,
      ARRAY(SELECT jsonb_array_elements_text(handle_record->'roles'))::TEXT[],
      ARRAY(SELECT jsonb_array_elements_text(handle_record->'co_workers'))::TEXT[],
      ARRAY(SELECT jsonb_array_elements_text(handle_record->'raw_credits'))::TEXT[],
      COALESCE((handle_record->>'occurrences')::INT, 1)
    )
    ON CONFLICT (handle) DO UPDATE SET
      roles = ARRAY(SELECT DISTINCT unnest(ig_usernames.roles || EXCLUDED.roles)),
      co_workers = ARRAY(SELECT DISTINCT unnest(ig_usernames.co_workers || EXCLUDED.co_workers)),
      raw_credits = ARRAY(SELECT DISTINCT unnest(ig_usernames.raw_credits || EXCLUDED.raw_credits)),
      occurrences = ig_usernames.occurrences + EXCLUDED.occurrences;

    IF FOUND THEN updated_count := updated_count + 1;
    ELSE inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  result := json_build_object('inserted', inserted_count, 'updated', updated_count);
  RETURN result;
END;
$$;

-- upsert_user_ig_map
CREATE OR REPLACE FUNCTION public.upsert_user_ig_map(p_user_id uuid, p_name text, p_ig_handle text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO user_ig_map (user_id, name, ig_handle, updated_at)
  VALUES (p_user_id, TRIM(p_name), p_ig_handle, NOW())
  ON CONFLICT (user_id, LOWER(TRIM(name))) 
  DO UPDATE SET ig_handle = EXCLUDED.ig_handle, updated_at = NOW();
END;
$$;

-- validate_admin_notes
CREATE OR REPLACE FUNCTION public.validate_admin_notes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.admin_notes IS NOT NULL AND length(NEW.admin_notes) > 2000 THEN
    RAISE EXCEPTION 'Admin notes must be 2000 characters or less';
  END IF;
  RETURN NEW;
END;
$$;

-- validate_maintenance_message
CREATE OR REPLACE FUNCTION public.validate_maintenance_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.maintenance_message IS NOT NULL AND length(NEW.maintenance_message) > 500 THEN
    RAISE EXCEPTION 'Maintenance message must be 500 characters or less';
  END IF;
  RETURN NEW;
END;
$$;

-- validate_payment_report_dates
CREATE OR REPLACE FUNCTION public.validate_payment_report_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_date IS NOT NULL AND NEW.payment_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Payment date cannot be in the future';
  END IF;
  IF NEW.closed_date IS NOT NULL AND NEW.closed_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Closed date cannot be in the future';
  END IF;
  RETURN NEW;
END;
$$;

-- validate_submission_data
CREATE OR REPLACE FUNCTION public.validate_submission_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role_department IS NOT NULL AND length(NEW.role_department) > 200 THEN
    RAISE EXCEPTION 'Role/department must be 200 characters or less';
  END IF;
  IF NEW.submission_type IN ('crew_report', 'vendor_report') THEN
    IF NEW.form_data IS NULL OR NEW.form_data = '{}'::jsonb THEN
      RAISE EXCEPTION 'Form data is required for crew and vendor reports';
    END IF;
    IF NEW.submission_type = 'crew_report' THEN
      IF NOT (NEW.form_data ? 'producerName') OR 
         NOT (NEW.form_data ? 'amountOwed') OR
         NOT (NEW.form_data ? 'projectName') THEN
        RAISE EXCEPTION 'Missing required crew report fields';
      END IF;
    END IF;
    IF NEW.submission_type = 'vendor_report' THEN
      IF NOT (NEW.form_data ? 'vendorCompany') OR 
         NOT (NEW.form_data ? 'invoiceNumber') OR
         NOT (NEW.form_data ? 'amountOwed') OR
         NOT (NEW.form_data ? 'projectName') THEN
        RAISE EXCEPTION 'Missing required vendor report fields';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- verify_self_report
CREATE OR REPLACE FUNCTION public.verify_self_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.corroboration_count >= 3 AND OLD.status = 'unverified' THEN
    NEW.status := 'pending_verification';
  END IF;
  RETURN NEW;
END;
$$;

-- calculate_pscs_score (large function - see full implementation in database)
-- NOTE: This is a complex scoring function - full implementation in database

-- update_producer_stats_complete (large function - see full implementation in database)
-- NOTE: This is a complex stats function - full implementation in database

-- calculate_confirmation_payout (large function - see full implementation in database)
-- NOTE: This is a complex payout function - full implementation in database

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_call_sheet_config_updated_at BEFORE UPDATE ON public.call_sheet_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER check_call_sheet_rate_limit_before_insert BEFORE INSERT ON public.call_sheets FOR EACH ROW EXECUTE FUNCTION check_call_sheet_rate_limit();
CREATE TRIGGER trigger_call_sheets_updated_at BEFORE UPDATE ON public.call_sheets FOR EACH ROW EXECUTE FUNCTION update_call_sheets_updated_at();
CREATE TRIGGER update_call_sheets_updated_at_trigger BEFORE UPDATE ON public.call_sheets FOR EACH ROW EXECUTE FUNCTION update_call_sheets_updated_at();
CREATE TRIGGER crew_contacts_audit AFTER INSERT OR DELETE OR UPDATE ON public.crew_contacts FOR EACH ROW EXECUTE FUNCTION log_crew_contact_audit();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escrow_payments_updated_at BEFORE UPDATE ON public.escrow_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER on_call_sheet_queued AFTER INSERT ON public.global_call_sheets FOR EACH ROW EXECUTE FUNCTION trigger_parse_queue_processor();
CREATE TRIGGER update_global_call_sheets_updated_at BEFORE UPDATE ON public.global_call_sheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ig_master_identities_updated_at BEFORE UPDATE ON public.ig_master_identities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER on_liability_chain_insert AFTER INSERT ON public.liability_chain FOR EACH ROW EXECUTE FUNCTION detect_liability_loop();
CREATE TRIGGER on_liability_chain_length_update AFTER INSERT ON public.liability_chain FOR EACH ROW EXECUTE FUNCTION update_liability_chain_length();
CREATE TRIGGER trigger_auto_verify_payment AFTER INSERT ON public.payment_confirmations FOR EACH ROW EXECUTE FUNCTION auto_verify_payment_on_confirmation();
CREATE TRIGGER update_payment_confirmations_updated_at BEFORE UPDATE ON public.payment_confirmations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER calculate_days_overdue_trigger BEFORE INSERT OR UPDATE ON public.payment_reports FOR EACH ROW EXECUTE FUNCTION calculate_days_overdue();
CREATE TRIGGER clear_sub_name_on_resolution AFTER UPDATE ON public.payment_reports FOR EACH ROW EXECUTE FUNCTION clear_sub_name_on_debt_resolution();
CREATE TRIGGER payment_report_paid_cleanup AFTER UPDATE ON public.payment_reports FOR EACH ROW WHEN (new.status = 'paid') EXECUTE FUNCTION delete_queued_notification_on_payment();
CREATE TRIGGER payment_reports_validate_dates BEFORE INSERT OR UPDATE ON public.payment_reports FOR EACH ROW EXECUTE FUNCTION validate_payment_report_dates();
CREATE TRIGGER trigger_auto_create_producer BEFORE INSERT ON public.payment_reports FOR EACH ROW EXECUTE FUNCTION auto_create_producer_from_report();
CREATE TRIGGER trigger_log_past_debt AFTER UPDATE ON public.payment_reports FOR EACH ROW EXECUTE FUNCTION log_past_debt_on_resolve();
CREATE TRIGGER trigger_set_confirmation_deadline BEFORE INSERT OR UPDATE ON public.payment_reports FOR EACH ROW EXECUTE FUNCTION set_confirmation_deadline();
CREATE TRIGGER trigger_set_payment_report_id BEFORE INSERT ON public.payment_reports FOR EACH ROW EXECUTE FUNCTION set_payment_report_id();
CREATE TRIGGER trigger_update_producer_stats_complete AFTER INSERT OR UPDATE OR DELETE ON public.payment_reports FOR EACH ROW EXECUTE FUNCTION update_producer_stats_complete();
CREATE TRIGGER update_payment_reports_updated_at BEFORE UPDATE ON public.payment_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_calculate_oldest_debt_days BEFORE INSERT OR UPDATE ON public.producers FOR EACH ROW EXECUTE FUNCTION calculate_oldest_debt_days();
CREATE TRIGGER trigger_update_good_standing_momentum BEFORE UPDATE ON public.producers FOR EACH ROW EXECUTE FUNCTION update_good_standing_momentum();
CREATE TRIGGER trigger_update_plateau_days BEFORE UPDATE ON public.producers FOR EACH ROW EXECUTE FUNCTION update_plateau_days();
CREATE TRIGGER update_producers_updated_at BEFORE UPDATE ON public.producers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_generate_share_link BEFORE INSERT ON public.producer_self_reports FOR EACH ROW EXECUTE FUNCTION generate_self_report_share_link();
CREATE TRIGGER trigger_verify_self_report BEFORE UPDATE ON public.producer_self_reports FOR EACH ROW EXECUTE FUNCTION verify_self_report();
CREATE TRIGGER site_settings_validate_message BEFORE INSERT OR UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION validate_maintenance_message();
CREATE TRIGGER site_settings_validate_notes BEFORE INSERT OR UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION validate_admin_notes();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER submission_validate_data BEFORE INSERT OR UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION validate_submission_data();
CREATE TRIGGER trigger_grant_contributor_access AFTER UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION grant_contributor_access();
CREATE TRIGGER trigger_grant_leaderboard_unlock AFTER UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION grant_leaderboard_report_unlock();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_heat_score AFTER INSERT OR UPDATE ON public.user_call_sheets FOR EACH ROW EXECUTE FUNCTION update_heat_score_on_payment_change();
CREATE TRIGGER update_user_entitlements_updated_at BEFORE UPDATE ON public.user_entitlements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_ig_map_updated_at BEFORE UPDATE ON public.user_ig_map FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.account_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ban_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_access_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sheet_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sheet_heat_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmation_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmation_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_call_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_dedupe_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fafo_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_call_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grace_period_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_master_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liability_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liability_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_self_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pscs_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queued_producer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_call_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ig_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- account_bans policies
CREATE POLICY "Admins can manage bans" ON public.account_bans FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Target can view own ban" ON public.account_bans FOR SELECT USING (auth.uid() = target_user_id);

-- analytics_daily_visitors policies
CREATE POLICY "Admins can read analytics" ON public.analytics_daily_visitors FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public insert via edge function" ON public.analytics_daily_visitors FOR INSERT WITH CHECK (true);

-- audit_logs policies
CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ban_pages policies
CREATE POLICY "Anyone can read ban page content" ON public.ban_pages FOR SELECT USING (true);
CREATE POLICY "Only admins can edit ban pages" ON public.ban_pages FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- beta_access_codes policies
CREATE POLICY "Admins can manage beta_access_codes" ON public.beta_access_codes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- beta_access_redemptions policies
CREATE POLICY "Admins can view all redemptions" ON public.beta_access_redemptions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert their own redemption" ON public.beta_access_redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own redemptions" ON public.beta_access_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- call_sheet_config policies
CREATE POLICY "Anyone can view call sheet config" ON public.call_sheet_config FOR SELECT USING (true);
CREATE POLICY "Only admins can modify call sheet config" ON public.call_sheet_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- call_sheet_heat_metrics policies
CREATE POLICY "Admins can manage heat metrics" ON public.call_sheet_heat_metrics FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- call_sheets policies
CREATE POLICY "Admins can manage all call sheets" ON public.call_sheets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all call sheets" ON public.call_sheets FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own call sheets" ON public.call_sheets FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own call sheets" ON public.call_sheets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own call sheets" ON public.call_sheets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own call sheets" ON public.call_sheets FOR SELECT USING (auth.uid() = user_id);

-- confirmation_cash_transactions policies
CREATE POLICY "Admins can view all transactions" ON public.confirmation_cash_transactions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert transactions" ON public.confirmation_cash_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own transactions" ON public.confirmation_cash_transactions FOR SELECT USING (auth.uid() = user_id);

-- confirmation_pool policies
CREATE POLICY "Admins view pool only" ON public.confirmation_pool FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- contact_call_sheets policies
CREATE POLICY "Admins can manage contact_call_sheets" ON public.contact_call_sheets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- contact_dedupe_exceptions policies
CREATE POLICY "Users can manage their own exceptions" ON public.contact_dedupe_exceptions FOR ALL USING (auth.uid() = user_id);

-- crew_contacts policies
CREATE POLICY "Admins can manage all contacts" ON public.crew_contacts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own contacts" ON public.crew_contacts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON public.crew_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.crew_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own contacts" ON public.crew_contacts FOR SELECT USING (auth.uid() = user_id);

-- custom_departments policies
CREATE POLICY "Anyone can view departments" ON public.custom_departments FOR SELECT USING (true);
CREATE POLICY "Only admins can modify departments" ON public.custom_departments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- disputes policies
CREATE POLICY "Admins can manage all disputes" ON public.disputes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view disputes they opened" ON public.disputes FOR SELECT USING (auth.uid() = opened_by);

-- escrow_payments policies
CREATE POLICY "Admins can manage all escrow" ON public.escrow_payments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view by payment_code" ON public.escrow_payments FOR SELECT USING (true);

-- fafo_entries policies
CREATE POLICY "Anyone can read FAFO entries" ON public.fafo_entries FOR SELECT USING (true);
CREATE POLICY "Only admins can manage FAFO entries" ON public.fafo_entries FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- global_call_sheets policies
CREATE POLICY "Admins can manage global_call_sheets" ON public.global_call_sheets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view global_call_sheets" ON public.global_call_sheets FOR SELECT USING (auth.uid() IS NOT NULL);

-- grace_period_logs policies
CREATE POLICY "Admins can view grace period logs" ON public.grace_period_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ig_master_identities policies
CREATE POLICY "Admins can manage ig_master" ON public.ig_master_identities FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view ig_master" ON public.ig_master_identities FOR SELECT USING (auth.uid() IS NOT NULL);

-- ig_usernames policies
CREATE POLICY "Admins can manage ig_usernames" ON public.ig_usernames FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view ig_usernames" ON public.ig_usernames FOR SELECT USING (auth.uid() IS NOT NULL);

-- leaderboard_config policies
CREATE POLICY "Admins can manage config" ON public.leaderboard_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view config" ON public.leaderboard_config FOR SELECT USING (true);

-- liability_chain policies
CREATE POLICY "Admins can manage liability_chain" ON public.liability_chain FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert to liability_chain" ON public.liability_chain FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view liability_chain" ON public.liability_chain FOR SELECT USING (auth.uid() IS NOT NULL);

-- liability_history policies
CREATE POLICY "Admins can manage liability_history" ON public.liability_history FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view liability_history" ON public.liability_history FOR SELECT USING (auth.uid() IS NOT NULL);

-- past_debts policies
CREATE POLICY "Admins can manage past_debts" ON public.past_debts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- payment_confirmations policies
CREATE POLICY "Admins can manage all confirmations" ON public.payment_confirmations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert confirmations" ON public.payment_confirmations FOR INSERT WITH CHECK (auth.uid() = confirmed_by);
CREATE POLICY "Users can view confirmations" ON public.payment_confirmations FOR SELECT USING (auth.uid() IS NOT NULL);

-- payment_reports policies
CREATE POLICY "Admins can manage all reports" ON public.payment_reports FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Reporters can view their own reports" ON public.payment_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can insert reports" ON public.payment_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- producer_associations policies
CREATE POLICY "Admins can manage associations" ON public.producer_associations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view associations" ON public.producer_associations FOR SELECT USING (true);

-- producer_self_reports policies
CREATE POLICY "Admins can manage self_reports" ON public.producer_self_reports FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view self_reports" ON public.producer_self_reports FOR SELECT USING (true);

-- producers policies
CREATE POLICY "Admins can manage producers" ON public.producers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view producers" ON public.producers FOR SELECT USING (true);

-- profiles policies
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

-- pscs_config policies
CREATE POLICY "Admins can manage pscs_config" ON public.pscs_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view pscs_config" ON public.pscs_config FOR SELECT USING (true);

-- queued_producer_notifications policies
CREATE POLICY "Admins can manage notifications" ON public.queued_producer_notifications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- search_logs policies
CREATE POLICY "Admins can view search_logs" ON public.search_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can insert search_logs" ON public.search_logs FOR INSERT WITH CHECK (true);

-- site_settings policies
CREATE POLICY "Admins can manage site_settings" ON public.site_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view site_settings" ON public.site_settings FOR SELECT USING (true);

-- submissions policies
CREATE POLICY "Admins can manage all submissions" ON public.submissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own submissions" ON public.submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own submissions" ON public.submissions FOR SELECT USING (auth.uid() = user_id);

-- suggestions policies
CREATE POLICY "Admins can view all suggestions" ON public.suggestions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can insert suggestions" ON public.suggestions FOR INSERT WITH CHECK (true);

-- user_call_sheets policies
CREATE POLICY "Admins can manage user_call_sheets" ON public.user_call_sheets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own user_call_sheets" ON public.user_call_sheets FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user_call_sheets" ON public.user_call_sheets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own user_call_sheets" ON public.user_call_sheets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own user_call_sheets" ON public.user_call_sheets FOR SELECT USING (auth.uid() = user_id);

-- user_entitlements policies
CREATE POLICY "Admins can manage entitlements" ON public.user_entitlements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own entitlements" ON public.user_entitlements FOR SELECT USING (auth.uid() = user_id);

-- user_ig_map policies
CREATE POLICY "Admins can manage user_ig_map" ON public.user_ig_map FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own mappings" ON public.user_ig_map FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mappings" ON public.user_ig_map FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mappings" ON public.user_ig_map FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own mappings" ON public.user_ig_map FOR SELECT USING (auth.uid() = user_id);

-- user_roles policies
CREATE POLICY "Admins can manage user_roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- END OF SCHEMA EXPORT
-- ============================================================================
