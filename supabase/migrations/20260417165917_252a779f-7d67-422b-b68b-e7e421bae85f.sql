CREATE TABLE public.chat_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banned_until timestamptz NOT NULL,
  reason text,
  banned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_bans_user ON public.chat_bans(user_id, banned_until DESC);

ALTER TABLE public.chat_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bans"
ON public.chat_bans FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all bans"
ON public.chat_bans FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can insert bans"
ON public.chat_bans FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Users can self-ban (auto-moderation)"
ON public.chat_bans FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND banned_by IS NULL);

CREATE POLICY "Admins can update bans"
ON public.chat_bans FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can delete bans"
ON public.chat_bans FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));