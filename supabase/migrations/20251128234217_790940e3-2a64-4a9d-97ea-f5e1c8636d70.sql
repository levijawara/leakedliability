-- Update public_producer_search view to include verification status fields
DROP VIEW IF EXISTS public_producer_search;

CREATE VIEW public_producer_search AS
SELECT 
  p.id AS producer_id,
  p.name AS producer_name,
  p.company AS company_name,
  p.is_placeholder,
  p.has_claimed_account,
  p.stripe_verification_status,
  p.claimed_by_user_id
FROM producers p
WHERE p.account_status != 'banned';