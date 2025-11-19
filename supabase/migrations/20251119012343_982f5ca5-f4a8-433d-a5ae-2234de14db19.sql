-- Phase 1: Database Schema Enhancements for Subscription System

-- Add new columns to user_entitlements table
ALTER TABLE public.user_entitlements
ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly' CHECK (billing_frequency IN ('monthly', 'annual')),
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'tier_1' CHECK (subscription_tier IN ('tier_1', 'tier_2')),
ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_entitlements_grace_period ON public.user_entitlements(grace_period_ends_at) WHERE grace_period_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_entitlements_status ON public.user_entitlements(status);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_tier ON public.user_entitlements(subscription_tier);

-- Update existing status check constraint to include new statuses
ALTER TABLE public.user_entitlements DROP CONSTRAINT IF EXISTS user_entitlements_status_check;
ALTER TABLE public.user_entitlements ADD CONSTRAINT user_entitlements_status_check 
CHECK (status IN ('active', 'inactive', 'grace_period', 'past_due', 'cancelled'));

-- Add comment for documentation
COMMENT ON COLUMN public.user_entitlements.billing_frequency IS 'Monthly or annual billing cycle';
COMMENT ON COLUMN public.user_entitlements.subscription_tier IS 'Subscription tier (tier_1, tier_2)';
COMMENT ON COLUMN public.user_entitlements.payment_failed_at IS 'Timestamp of first payment failure';
COMMENT ON COLUMN public.user_entitlements.failed_attempts IS 'Number of consecutive payment failures (max 3)';
COMMENT ON COLUMN public.user_entitlements.grace_period_ends_at IS 'When grace period expires (5 business days from 3rd failure)';
