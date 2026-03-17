
CREATE TABLE public.used_plus_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);

ALTER TABLE public.used_plus_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own used codes" ON public.used_plus_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own used codes" ON public.used_plus_codes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
