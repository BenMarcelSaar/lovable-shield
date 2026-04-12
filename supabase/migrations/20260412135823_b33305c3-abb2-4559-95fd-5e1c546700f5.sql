
-- 1. Fix privilege escalation: restrict profile updates to safe columns only
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile safely"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
  AND sentinel_plus_until IS NOT DISTINCT FROM (SELECT p.sentinel_plus_until FROM public.profiles p WHERE p.id = auth.uid())
);

-- 2. Fix plus_codes exposure: remove the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can read unredeemed codes for validation" ON public.plus_codes;

-- 3. Create atomic code redemption function (fixes race condition + removes need for client to read codes)
CREATE OR REPLACE FUNCTION public.redeem_plus_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_row plus_codes%ROWTYPE;
  days_val int;
  until_val timestamptz;
BEGIN
  -- Lock the row to prevent concurrent redemptions
  SELECT * INTO code_row FROM plus_codes
  WHERE code = UPPER(TRIM(p_code)) FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Code.');
  END IF;

  IF code_row.redeemed_by IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dieser Code wurde bereits eingelöst.');
  END IF;

  days_val := COALESCE(code_row.days, 7);
  until_val := now() + (days_val || ' days')::interval;

  UPDATE plus_codes SET redeemed_by = auth.uid(), redeemed_at = now() WHERE id = code_row.id;
  UPDATE profiles SET sentinel_plus_until = until_val WHERE id = auth.uid();

  -- Record in used_plus_codes
  INSERT INTO used_plus_codes (code, user_id) VALUES (UPPER(TRIM(p_code)), auth.uid());

  RETURN jsonb_build_object('success', true, 'until', until_val);
END;
$$;
