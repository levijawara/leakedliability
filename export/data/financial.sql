-- =====================================================
-- FINANCIAL DATA EXPORT
-- Exported: 2026-01-23
-- Project: Leaked Liability™
-- =====================================================

-- Disable triggers during import
SET session_replication_role = 'replica';

-- =====================================================
-- past_debts (9 rows)
-- =====================================================
TRUNCATE TABLE public.past_debts CASCADE;

INSERT INTO public.past_debts (id, producer_id, amount_owed, days_overdue, date_resolved, reporter_type, total_reports_at_time, created_at) VALUES
('29e7f632-df17-409b-b6ce-3a7d997c6918', '6153a2f7-79a4-432b-af00-f34b7ab60854', 450.00, 20, '2025-10-28', 'crew', 1, '2025-10-28 18:56:34.666863+00'),
('3f68b088-f0f6-4eb2-8625-731bf47655eb', '64732f12-d892-4357-850d-94c011aae56d', 1000.00, 160, '2025-11-15', 'crew', 1, '2025-11-15 18:38:41.041448+00'),
('44c0d4bf-bd08-4fe5-9a01-6a0005169ad9', 'ee48d81f-017a-449d-91f9-d075e38afdad', 700.00, 55, '2025-11-16', 'crew', 1, '2025-11-16 01:50:35.301919+00'),
('7d2160bd-040a-417b-b9f4-f6db602ed329', 'cfc741b0-e1fa-40a0-bd97-f0d29aa35ad5', 600.00, 784, '2025-11-21', 'crew', 1, '2025-11-21 17:32:00.330372+00'),
('82aa0cf6-0cd4-4bdb-a401-bfdc9b957945', 'f877f8a0-37b6-467d-9008-eb498d957be5', 400.00, 9, '2025-10-22', 'crew', 1, '2025-10-28 18:56:34.666863+00'),
('95610f10-e51b-438e-92c1-a8a3e2eb6d8f', 'd5a23023-51f4-4104-8d1c-d8e17812d7b4', 500.00, 61, '2025-11-04', 'crew', 1, '2025-11-04 16:32:33.152064+00'),
('cc2aedf9-1439-41ab-9b7b-317694fdde61', '2029581d-8d7c-42ce-aabc-890ac6c4e60a', 500.00, 2, '2025-11-13', 'crew', 1, '2025-11-13 19:05:47.343547+00'),
('e506e2f5-baae-4a44-ad4d-61afcd7dc1e2', '2ef21991-b027-4a02-a19e-84706df4ad11', 600.00, 27, '2025-12-01', 'crew', 1, '2025-12-01 23:00:46.386392+00'),
('f0c0eba8-bc59-4eff-a838-767897137327', '634d4fad-b1a7-4859-88a6-ab0908f76705', 850.00, 32, '2025-11-20', 'crew', 1, '2025-11-20 05:52:16.633386+00');

-- =====================================================
-- escrow_payments (1 row)
-- =====================================================
TRUNCATE TABLE public.escrow_payments CASCADE;

INSERT INTO public.escrow_payments (id, payment_code, crew_member_id, producer_id, payment_report_id, amount_due, status, stripe_session_id, stripe_payment_intent_id, paid_at, released_at, metadata, created_at, updated_at) VALUES
('8445d7e8-d49f-4039-a625-8961a2f048a6', '0DF137', '722ef19e-77d6-4232-8a79-eeaaa9f84d7c', '0e9c77df-c245-4061-8566-e66bf731d844', 'd1eff899-ca9c-47f1-8d11-64d5d95ce1c9', 801.88, 'pending', NULL, NULL, NULL, NULL, '{"created_by_admin": "8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7", "producer_name": "Unknown", "project_name": "Revolt TV 1984"}', '2025-11-29 01:01:51.696575+00', '2025-11-29 01:01:51.696575+00');

-- =====================================================
-- payment_confirmations (7 rows)
-- =====================================================
TRUNCATE TABLE public.payment_confirmations CASCADE;

INSERT INTO public.payment_confirmations (id, payment_report_id, producer_id, confirmer_id, confirmation_type, amount_paid, payment_proof_url, notes, verified, confirmed_by_admin, confirmed_by_user_id, paid_by, created_at, updated_at) VALUES
('0ba339da-5b00-484c-a1c5-12a6526d5453', '7f72340e-eee2-4113-8c44-ef4275258d53', 'f877f8a0-37b6-467d-9008-eb498d957be5', '8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7', 'crew_confirmation', 400, 'b69c8495-c1b2-45b4-b85d-477d9be994cd.jpeg', NULL, true, false, NULL, NULL, '2025-10-22 16:07:57.64624+00', '2025-10-22 16:07:57.64624+00'),
('17df1b58-8d60-4fbd-abda-7e26461d68ba', '9edddd6b-508a-4d74-8c43-119d26b12e88', '6153a2f7-79a4-432b-af00-f34b7ab60854', '8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7', 'producer_documentation', 450, '6323a7ad-8aff-4efc-a69f-bf0ed8f15efe.PNG', 'Self-service confirmation submitted on 2025-10-28T18:24:43.686Z', false, false, NULL, NULL, '2025-10-28 18:24:44.460559+00', '2025-10-28 18:24:44.460559+00'),
('42f22c08-94b3-4f7f-a3f1-e53f5d5a0460', '2ce77442-8800-4545-a8c5-e5329c38cf0b', '2ef21991-b027-4a02-a19e-84706df4ad11', '8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7', 'producer_documentation', 600, '576c847d-e4ce-4a51-bea9-ded167887b54.png', 'Self-service confirmation submitted on 2025-12-01T23:00:46.165Z', false, false, NULL, NULL, '2025-12-01 23:00:46.386392+00', '2025-12-01 23:00:46.386392+00'),
('74f2c91e-ddcd-40c6-9cfe-f9dcaffcb34c', 'f6f8e095-a2c2-4bdb-a99d-a1cf01257cf9', '64732f12-d892-4357-850d-94c011aae56d', '880e297d-85a7-4fb3-826b-1ed34849d2fd', 'producer_documentation', 1000, 'e1d21e82-b4a1-4e79-a8a9-1174414671c4.png', 'Self-service confirmation submitted on 2025-11-15T18:38:40.803Z', false, false, NULL, NULL, '2025-11-15 18:38:41.041448+00', '2025-11-15 18:38:41.041448+00'),
('88be6218-0e64-4aab-9787-77849a9eace8', 'cea93885-49ef-4d15-b94c-47f27c6cbe61', '634d4fad-b1a7-4859-88a6-ab0908f76705', '8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7', 'producer_documentation', 850, 'edeaf883-4e8e-463b-903c-5234c475da8b.jpeg', 'Self-service confirmation submitted on 2025-11-20T05:52:16.391Z', false, false, NULL, NULL, '2025-11-20 05:52:16.633386+00', '2025-11-20 05:52:16.633386+00'),
('b2063266-38d4-449b-af34-fbae7c6885c6', 'fc9a0093-a474-4bcf-9149-e55bd5b72b14', '2029581d-8d7c-42ce-aabc-890ac6c4e60a', '8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7', 'producer_documentation', 500, '9bff2041-496e-451c-a943-a4e9ef12afb4.jpeg', 'Self-service confirmation submitted on 2025-11-13T19:05:47.059Z', false, false, NULL, NULL, '2025-11-13 19:05:47.343547+00', '2025-11-13 19:05:47.343547+00'),
('e5434900-efc7-4a27-817a-70c9d79087e2', '12841fee-0b2e-4a04-b968-b6b3e45d0e24', 'd5a23023-51f4-4104-8d1c-d8e17812d7b4', '8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7', 'producer_documentation', 500, 'fde5f2b0-04df-4811-8a21-2953aca70e7a.png', 'Self-service confirmation submitted on 2025-11-04T16:32:32.872Z', false, false, NULL, NULL, '2025-11-04 16:32:33.152064+00', '2025-11-04 16:32:33.152064+00');

-- =====================================================
-- queued_producer_notifications (4 rows)
-- =====================================================
TRUNCATE TABLE public.queued_producer_notifications CASCADE;

INSERT INTO public.queued_producer_notifications (id, payment_report_id, report_id, producer_email, project_name, amount_owed, days_overdue, sent_at, created_at) VALUES
('216bfac0-1d06-4da2-938a-70e15b1475c7', 'd7102e60-58ad-4b20-b3a5-eb44ebef00b5', 'CR-20251012-37438', 'sergeyavetisyan1995@gmail.com', 'Lilit Hovhannisyan', 500, 756, '2025-11-19 09:20:46.834+00', '2025-10-12 03:23:22.420988+00'),
('664f32a1-81e1-45b2-8924-d2ecf9c38209', '981d6436-c8bd-448f-9b4c-c4583b023187', 'CR-20251119-60303', 'finance@culturecreative.global', 'Kanye West''s Halloween Sunday Service', 500.00, 1480, '2025-11-19 09:15:54.134+00', '2025-11-19 07:09:19.843893+00'),
('c6170ae8-3541-4dd4-a588-bccd97b64f7c', '2ce77442-8800-4545-a8c5-e5329c38cf0b', 'CR-20251112-18184', 'connordittman@yahoo.com', 'Be Balanced', 600, 8, '2025-11-19 09:20:52.434+00', '2025-11-12 10:25:26.558329+00'),
('ca7c6724-c365-47e0-9464-e315e2996ff6', 'cea93885-49ef-4d15-b94c-47f27c6cbe61', 'CR-20251020-17815', 'sjohnson@fender.com', 'FENDER x Die Spitz', 850, 1, '2025-11-19 09:20:49.482+00', '2025-10-20 19:39:55.09749+00');

-- Re-enable triggers
SET session_replication_role = 'origin';
