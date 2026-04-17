-- AI Settings Tabelle (Singleton-Row)
CREATE TABLE public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read ai settings"
  ON public.ai_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage ai settings"
  ON public.ai_settings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Initialer Datensatz
INSERT INTO public.ai_settings (ai_enabled) VALUES (true);

-- Banned Words Tabelle
CREATE TABLE public.banned_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  ban_seconds integer NOT NULL DEFAULT 86400,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.banned_words ENABLE ROW LEVEL SECURITY;

-- Admins lesen + verwalten alles
CREATE POLICY "Admins can manage banned words"
  ON public.banned_words FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Auch authenticated users können lesen (damit Community-Chat clientseitig filtern kann)
CREATE POLICY "Authenticated can read banned words"
  ON public.banned_words FOR SELECT
  TO authenticated
  USING (true);