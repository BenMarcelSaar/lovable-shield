
CREATE TABLE public.site_shutdown (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  active boolean NOT NULL DEFAULT false,
  shutdown_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_shutdown ENABLE ROW LEVEL SECURITY;

-- Everyone can read shutdown status
CREATE POLICY "Anyone can read shutdown status"
ON public.site_shutdown FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage shutdown"
ON public.site_shutdown FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Insert initial row
INSERT INTO public.site_shutdown (active, shutdown_until) VALUES (false, null);
