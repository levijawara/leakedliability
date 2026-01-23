-- =====================================================
-- ENTITLEMENTS & ACCESS DATA EXPORT
-- Exported: 2026-01-23
-- Project: Leaked Liability™
-- =====================================================

-- Disable triggers during import
SET session_replication_role = 'replica';

-- =====================================================
-- user_roles (1 row)
-- =====================================================
TRUNCATE TABLE public.user_roles CASCADE;

INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
('76b1a491-a106-4897-a27a-f3a82bebd1f6', '8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7', 'admin', '2025-10-10 02:31:50.827257+00');

-- =====================================================
-- user_entitlements (7 rows)
-- =====================================================
TRUNCATE TABLE public.user_entitlements CASCADE;

INSERT INTO public.user_entitlements (id, user_id, entitlement_type, source, status, stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_end, billing_frequency, created_at, updated_at, payment_failed_at, grace_period_ends_at, failed_attempts) VALUES
('203d060c-aa83-4719-9962-4be4f610c222', '3e96129c-c15d-4120-88ef-20b20a41bc3e', 'leaderboard', 'contributor', 'active', NULL, NULL, 'tier_1', NULL, 'monthly', '2025-11-19 04:23:12.584388+00', '2025-11-19 05:18:14.696718+00', NULL, NULL, 0),
('36e919a4-ad29-4fce-b72a-84ae55166e23', 'f113074e-57f5-48ca-a96c-2f40bcfb690d', 'leaderboard', 'contributor', 'active', NULL, NULL, 'tier_1', NULL, 'monthly', '2025-11-19 06:55:21.910322+00', '2025-11-19 06:55:26.931765+00', NULL, NULL, 0),
('3efc1a9f-9995-4818-8b29-48b88334f5cd', '722ef19e-77d6-4232-8a79-eeaaa9f84d7c', 'leaderboard', 'contributor', 'active', NULL, NULL, 'tier_1', NULL, 'monthly', '2025-11-27 20:37:34.664531+00', '2025-11-27 20:38:04.296294+00', NULL, NULL, 0),
('61040e03-98dd-4639-ac4e-b33f9809dc9c', '89362339-6124-4bbd-820b-5ed6eff5fc8a', 'leaderboard', 'contributor', 'active', NULL, NULL, 'tier_1', NULL, 'monthly', '2025-11-12 10:21:45.534662+00', '2025-11-12 15:40:13.747676+00', NULL, NULL, 0),
('6ea48674-ee45-4e03-a9a6-a84409bae293', '8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7', 'leaderboard', 'contributor', 'active', NULL, NULL, 'tier_1', NULL, 'monthly', '2025-10-15 05:52:53.661737+00', '2025-11-12 10:25:19.95181+00', NULL, NULL, 0),
('dc8261fd-6bfe-4fad-ba85-64168795180d', '880e297d-85a7-4fb3-826b-1ed34849d2fd', 'leaderboard', 'contributor', 'active', NULL, NULL, 'tier_1', NULL, 'monthly', '2025-11-13 01:12:02.323823+00', '2025-11-13 01:12:02.323823+00', NULL, NULL, 0),
('e2b9e484-95f5-42f0-b77e-f0e26fa1bd74', '174729e6-4ee6-463a-a666-1ac4efa5f281', 'leaderboard', 'stripe_subscription', 'cancelled', 'cus_TE8p3zkyPpBYbr', 'sub_1SHgXS2MQfs6Q1jdb6ekY156', 'producer_t1', NULL, 'monthly', '2025-10-13 10:00:07.788535+00', '2026-01-03 07:58:04.744156+00', NULL, NULL, 0);

-- =====================================================
-- beta_access_redemptions (2 rows)
-- =====================================================
TRUNCATE TABLE public.beta_access_redemptions CASCADE;

INSERT INTO public.beta_access_redemptions (id, code_id, user_id, redeemed_at) VALUES
('abaee28f-2c7b-4836-83bf-69cb2ca6accb', 'd3ec0eba-18dc-4472-8e4f-42489a32ce72', '479454eb-7dbc-4554-96ae-c413442a91f0', '2026-01-09 20:58:25.306008+00'),
('fd69542d-5074-415d-818c-cb4ed254757f', 'd3ec0eba-18dc-4472-8e4f-42489a32ce72', '174729e6-4ee6-463a-a666-1ac4efa5f281', '2026-01-06 01:27:43.354246+00');

-- Re-enable triggers
SET session_replication_role = 'origin';
