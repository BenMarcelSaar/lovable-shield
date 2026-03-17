
CREATE TABLE public.plus_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  days integer NOT NULL DEFAULT 7,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamp with time zone
);

ALTER TABLE public.plus_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage plus codes" ON public.plus_codes
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Anyone can read unredeemed codes for validation" ON public.plus_codes
  FOR SELECT TO authenticated
  USING (true);

INSERT INTO public.plus_codes (code, days) VALUES ('BEN26', 7), ('SENTINEL+', 7);
