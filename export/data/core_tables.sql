-- =====================================================
-- CORE TABLES DATA EXPORT (Profiles + Payment Reports)
-- Exported: 2026-01-23
-- Note: Full producers/crew_contacts exports require Supabase CLI due to size
-- =====================================================

SET session_replication_role = 'replica';

-- =====================================================
-- profiles (20 rows)
-- =====================================================
INSERT INTO public.profiles (id, user_id, email, legal_first_name, legal_last_name, account_type, beta_access, business_name, confirmation_cash_balance, leaderboard_report_unlock, account_status, created_by_admin, created_by_admin_id, created_at, updated_at) VALUES
('13427a2f-43cc-4614-8236-baf8391c9c86', 'db294de2-99f7-4252-b751-ca9c9048cff8', 'keaton.brownlow@gmail.com', 'Keaton', 'Brownlow', 'crew', false, NULL, 0, false, 'active', false, NULL, '2025-12-23 01:55:01.786645+00', '2025-12-23 01:55:01.786645+00'),
('1e3929d9-73fd-4a9d-8e06-abe742e1f560', '8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7', 'lojawara@gmail.com', 'Levi', 'Jawara', 'crew', false, NULL, 3.00, true, 'active', false, NULL, '2025-10-10 01:36:57.641744+00', '2025-12-01 23:00:46.386392+00'),
('326afb28-b6c0-4ac7-a390-d522ecbcb288', 'c7eb9acf-1217-4b2b-8f3d-be1ee95600c0', 'libertine@dotblk.com', 'Joshua', 'Libertine', 'crew', false, NULL, 0, false, 'active', false, NULL, '2025-10-12 18:50:37.719225+00', '2025-10-13 02:58:38.512652+00'),
('543b2635-6aec-4062-8080-a840c4bb968d', '174729e6-4ee6-463a-a666-1ac4efa5f281', 'leakedliability@gmail.com', 'Leaked', 'Liability', 'producer', true, NULL, 0, false, 'active', false, NULL, '2025-10-11 22:14:38.648037+00', '2026-01-06 01:27:43.589343+00'),
('5c0b7178-168d-40ad-8bdc-4ccd7443add0', '9d42f6c9-ced5-487b-9c04-15fb0e3333a3', 'adamatom88@aol.com', 'Adam', 'Taylor', 'producer', false, NULL, 0, false, 'active', false, NULL, '2025-11-20 03:36:58.514374+00', '2025-11-20 03:36:58.514374+00'),
('61b3332f-401b-4eae-abe8-fafabf78c277', 'ed24b951-75fb-405d-becd-23cb7736222f', 'contact@pablomenaa.com', 'Pablo', 'Mena', 'crew', false, NULL, 0, false, 'active', false, NULL, '2025-11-15 19:51:16.739045+00', '2025-11-15 19:51:16.739045+00'),
('6b234d5e-29e0-4fff-82d4-404d082cf098', '3e96129c-c15d-4120-88ef-20b20a41bc3e', 'contact.ryansilver@gmail.com', 'Ryan', 'Silver', 'crew', false, NULL, 1.00, true, 'active', true, '8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7', '2025-11-19 04:23:11.5489+00', '2025-11-21 17:32:00.330372+00'),
('90a995cb-a446-4ae8-bb33-b916482c737d', '44fda179-c685-47eb-92ce-6081f948bc35', 'jackcook82212@gmail.com', 'Jack', 'Cook', 'crew', false, NULL, 0, false, 'active', false, NULL, '2025-10-13 01:45:11.822887+00', '2025-10-13 02:58:38.512652+00'),
('926d2685-eb23-48ec-8e30-2c90bea97be9', '88e10495-febc-474e-ae50-662849be2dbd', 'sambjet@gmil.com', 'Sam', 'Brave', 'crew', false, NULL, 0, false, 'active', false, NULL, '2025-11-15 17:17:24.107999+00', '2025-11-15 17:17:24.107999+00'),
('9d72fe88-adc3-42c0-a406-aaa34f6962d0', '880e297d-85a7-4fb3-826b-1ed34849d2fd', 'chris.pintoproductions@gmail.com', 'Christopher', 'Pinto', 'crew', false, NULL, 1.00, true, 'active', false, NULL, '2025-11-12 23:48:39.113402+00', '2025-11-15 18:38:41.041448+00'),
('aa00f0c8-dd67-4754-a438-4cc8f9346f92', 'f113074e-57f5-48ca-a96c-2f40bcfb690d', 'jewelpz@gmail.com', 'Jewel', 'Perez', 'crew', false, NULL, 0, true, 'active', false, NULL, '2025-11-16 03:57:40.723892+00', '2025-11-19 06:55:21.910322+00');

-- Note: Remaining profiles and full producers/crew_contacts tables require CLI export due to size
-- Use: supabase db dump --data-only --table public.producers -f export/data/producers_full.sql

SET session_replication_role = 'origin';
