-- =====================================================
-- RLS POLICIES EXPORT
-- Exported: 2026-01-23
-- Project: Leaked Liability™
-- =====================================================

-- =====================================================
-- account_bans policies
-- =====================================================
CREATE POLICY "Admins can manage bans" ON public.account_bans
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Target can view own ban" ON public.account_bans
FOR SELECT USING (auth.uid() = target_user_id);

-- =====================================================
-- analytics_daily_visitors policies
-- =====================================================
CREATE POLICY "Admins can read analytics" ON public.analytics_daily_visitors
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public insert via edge function" ON public.analytics_daily_visitors
FOR INSERT WITH CHECK (true);

-- =====================================================
-- audit_logs policies
-- =====================================================
CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- ban_pages policies
-- =====================================================
CREATE POLICY "Anyone can read ban page content" ON public.ban_pages
FOR SELECT USING (true);

CREATE POLICY "Only admins can edit ban pages" ON public.ban_pages
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- beta_access_codes policies
-- =====================================================
CREATE POLICY "Admins can manage beta_access_codes" ON public.beta_access_codes
FOR ALL TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- beta_access_redemptions policies
-- =====================================================
CREATE POLICY "Admins can view all redemptions" ON public.beta_access_redemptions
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own redemption" ON public.beta_access_redemptions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own redemptions" ON public.beta_access_redemptions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- call_sheet_config policies
-- =====================================================
CREATE POLICY "Anyone can view call sheet config" ON public.call_sheet_config
FOR SELECT USING (true);

CREATE POLICY "Only admins can modify call sheet config" ON public.call_sheet_config
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- call_sheet_heat_metrics policies
-- =====================================================
CREATE POLICY "Admins can manage heat metrics" ON public.call_sheet_heat_metrics
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- call_sheets policies
-- =====================================================
CREATE POLICY "Admins can manage all call sheets" ON public.call_sheets
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all call sheets" ON public.call_sheets
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own call sheets" ON public.call_sheets
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own call sheets" ON public.call_sheets
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own call sheets" ON public.call_sheets
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own call sheets" ON public.call_sheets
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- confirmation_cash_transactions policies
-- =====================================================
CREATE POLICY "Admins can view all transactions" ON public.confirmation_cash_transactions
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert transactions" ON public.confirmation_cash_transactions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own transactions" ON public.confirmation_cash_transactions
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- confirmation_pool policies
-- =====================================================
CREATE POLICY "Admins view pool only" ON public.confirmation_pool
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- crew_contacts policies
-- =====================================================
CREATE POLICY "Admins can manage all crew contacts" ON public.crew_contacts
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own contacts" ON public.crew_contacts
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts" ON public.crew_contacts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" ON public.crew_contacts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own contacts" ON public.crew_contacts
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- disputes policies
-- =====================================================
CREATE POLICY "Admins can manage disputes" ON public.disputes
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own disputes" ON public.disputes
FOR SELECT USING (auth.uid() = disputer_id);

-- =====================================================
-- escrow_payments policies
-- =====================================================
CREATE POLICY "Admins can manage escrow" ON public.escrow_payments
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Crew can view their escrow" ON public.escrow_payments
FOR SELECT USING (auth.uid() = crew_member_id);

-- =====================================================
-- global_call_sheets policies
-- =====================================================
CREATE POLICY "Admins full access global_call_sheets" ON public.global_call_sheets
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert" ON public.global_call_sheets
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view parsed sheets" ON public.global_call_sheets
FOR SELECT TO authenticated USING (status = 'parsed');

-- =====================================================
-- identity_groups policies
-- =====================================================
CREATE POLICY "Admins can manage identity_groups" ON public.identity_groups
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view identity_groups" ON public.identity_groups
FOR SELECT TO authenticated USING (true);

-- =====================================================
-- ig_master_identities policies
-- =====================================================
CREATE POLICY "Admins can manage ig_master_identities" ON public.ig_master_identities
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view ig_master_identities" ON public.ig_master_identities
FOR SELECT TO authenticated USING (true);

-- =====================================================
-- payment_confirmations policies
-- =====================================================
CREATE POLICY "Admins can manage confirmations" ON public.payment_confirmations
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert confirmations" ON public.payment_confirmations
FOR INSERT TO authenticated WITH CHECK (auth.uid() = confirmer_id);

CREATE POLICY "Users can view their confirmations" ON public.payment_confirmations
FOR SELECT USING (auth.uid() = confirmer_id);

-- =====================================================
-- payment_reports policies
-- =====================================================
CREATE POLICY "Admins can manage all reports" ON public.payment_reports
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own reports" ON public.payment_reports
FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON public.payment_reports
FOR SELECT USING (auth.uid() = reporter_id);

-- =====================================================
-- producers policies
-- =====================================================
CREATE POLICY "Admins can manage producers" ON public.producers
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view producers" ON public.producers
FOR SELECT USING (true);

-- =====================================================
-- profiles policies
-- =====================================================
CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- submissions policies
-- =====================================================
CREATE POLICY "Admins can manage submissions" ON public.submissions
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their submissions" ON public.submissions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their submissions" ON public.submissions
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- user_entitlements policies
-- =====================================================
CREATE POLICY "Admins can manage entitlements" ON public.user_entitlements
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own entitlements" ON public.user_entitlements
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- user_roles policies
-- =====================================================
CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- Storage policies
-- =====================================================
-- submission-documents bucket
CREATE POLICY "Users can upload submission documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'submission-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own submission documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'submission-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can manage submission documents"
ON storage.objects FOR ALL
USING (bucket_id = 'submission-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- call_sheets bucket
CREATE POLICY "Users can upload call sheets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'call_sheets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view call sheets"
ON storage.objects FOR SELECT
USING (bucket_id = 'call_sheets' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can manage call sheets"
ON storage.objects FOR ALL
USING (bucket_id = 'call_sheets' AND has_role(auth.uid(), 'admin'::app_role));

-- fafo-results bucket (public)
CREATE POLICY "Anyone can view fafo results"
ON storage.objects FOR SELECT
USING (bucket_id = 'fafo-results');

CREATE POLICY "Admins can manage fafo results"
ON storage.objects FOR ALL
USING (bucket_id = 'fafo-results' AND has_role(auth.uid(), 'admin'::app_role));
