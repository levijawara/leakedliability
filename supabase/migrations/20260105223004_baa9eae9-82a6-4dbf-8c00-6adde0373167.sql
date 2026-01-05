-- Fix search_path for upsert_user_ig_map function
CREATE OR REPLACE FUNCTION upsert_user_ig_map(
  p_user_id UUID,
  p_name TEXT,
  p_ig_handle TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_ig_map (user_id, name, ig_handle, updated_at)
  VALUES (p_user_id, TRIM(p_name), p_ig_handle, NOW())
  ON CONFLICT (user_id, LOWER(TRIM(name))) 
  DO UPDATE SET ig_handle = EXCLUDED.ig_handle, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;