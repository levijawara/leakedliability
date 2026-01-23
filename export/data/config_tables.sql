-- =====================================================
-- CONFIG TABLES DATA EXPORT
-- Exported: 2026-01-23
-- Project: Leaked Liability™
-- =====================================================

-- Disable triggers during import
SET session_replication_role = 'replica';

-- =====================================================
-- pscs_config (15 rows)
-- =====================================================
TRUNCATE TABLE public.pscs_config CASCADE;

INSERT INTO public.pscs_config (key, value, description) VALUES
('AGE_PENALTY_BASE_LATE', 300, 'Base penalty after 60 days'),
('AGE_PENALTY_CAP', 650, 'Maximum age penalty'),
('AGE_PENALTY_RATE_EARLY', 8, 'Penalty per day for debts <= 60 days old'),
('AGE_PENALTY_RATE_LATE', 1.5, 'Additional penalty per day after 60 days'),
('AGE_THRESHOLD_DAYS', 60, 'Days threshold for age penalty calculation change'),
('AMOUNT_PENALTY_CAP', 300, 'Maximum amount penalty'),
('AMOUNT_PENALTY_RATE', 0.15, 'Penalty per dollar owed'),
('FORGIVENESS_HALFLIFE_DAYS', 30, 'Days for forgiveness to reach 50% (exponential decay)'),
('HISTORY_PENALTY_RETENTION', 0.25, 'Percentage of original penalty retained as "history"'),
('MAX_SCORE', 1000, 'Maximum possible PSCS score'),
('REPEAT_CITIES_PENALTY', 40, 'Penalty per additional city owed'),
('REPEAT_CREW_PENALTY', 80, 'Penalty per additional crew member owed'),
('REPEAT_JOBS_PENALTY', 60, 'Penalty per additional job owed'),
('VENDOR_COUNT_PENALTY', 20, 'Additional penalty per vendor owed (higher impact than crew)'),
('VENDOR_PENALTY_MULTIPLIER', 1.5, 'Multiplier for vendor debt age/amount penalties (heavier than crew)');

-- =====================================================
-- leaderboard_config (1 row)
-- =====================================================
TRUNCATE TABLE public.leaderboard_config CASCADE;

INSERT INTO public.leaderboard_config (id, created_at, free_access_enabled, locked_at, producer_count_at_lock, threshold_locked, updated_at) VALUES
('90815b60-5688-45ac-8bc6-7d772d66ee93', '2025-10-12 07:53:52.74435+00', true, NULL, 0, false, '2025-10-12 07:53:52.74435+00');

-- =====================================================
-- site_settings (1 row)
-- =====================================================
TRUNCATE TABLE public.site_settings CASCADE;

INSERT INTO public.site_settings (id, maintenance_mode, maintenance_message, public_leaderboard_ready, send_producer_notifications, updated_at) VALUES
('f0ebeb1b-1b5e-4f62-9be5-1bcdb40925ce', false, 'We are performing system maintenance. Please check back later.', true, false, '2025-12-28 09:08:16.1787+00');

-- =====================================================
-- site_notices (1 row)
-- =====================================================
TRUNCATE TABLE public.site_notices CASCADE;

INSERT INTO public.site_notices (id, title, content, visible_to, created_at, updated_at) VALUES
('053f28bd-0705-4219-bc4d-02fa449b9125', 'Confirmation Cash Validity', 'Confirmation Cash balances remain valid for as long as the Leaked Liability™ platform is operational. They hold no cash value outside the LL ecosystem and can only be redeemed for in-platform purposes such as merchandise, services, or other LL-authorized uses.', 'all', '2025-10-23 23:53:41.662083+00', '2025-10-23 23:53:41.662083+00');

-- =====================================================
-- call_sheet_config (1 row)
-- =====================================================
TRUNCATE TABLE public.call_sheet_config CASCADE;

INSERT INTO public.call_sheet_config (id, created_at, rate_limit_enabled, rate_limit_per_hour, updated_at) VALUES
('2220bebb-e73b-45b0-b2f0-cf9aedb39b4a', '2025-12-29 08:05:26.622536+00', false, 20, '2025-12-29 08:05:26.622536+00');

-- =====================================================
-- confirmation_pool (1 row)
-- =====================================================
TRUNCATE TABLE public.confirmation_pool CASCADE;

INSERT INTO public.confirmation_pool (id, available_balance, total_collected, total_distributed, updated_at) VALUES
('ce996e57-68f0-4bfe-81cb-db3179b86e45', 994.00, 1000.00, 6.00, '2025-12-01 23:00:46.386392+00');

-- =====================================================
-- beta_access_codes (1 row)
-- =====================================================
TRUNCATE TABLE public.beta_access_codes CASCADE;

INSERT INTO public.beta_access_codes (id, code, created_at, current_uses, expired_at, is_active, max_uses) VALUES
('d3ec0eba-18dc-4472-8e4f-42489a32ce72', 'PAARTHURNAX', '2026-01-04 19:28:49.982168+00', 2, NULL, true, 10);

-- Re-enable triggers
SET session_replication_role = 'origin';
