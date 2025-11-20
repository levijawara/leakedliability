-- Drop the old restrictive constraint
ALTER TABLE user_entitlements
DROP CONSTRAINT IF EXISTS user_entitlements_subscription_tier_check;

-- Add new constraint allowing all valid tier values
ALTER TABLE user_entitlements
ADD CONSTRAINT user_entitlements_subscription_tier_check
CHECK (subscription_tier IN ('tier_1', 'tier_2', 'crew_t1', 'producer_t1', 'producer_t2'));