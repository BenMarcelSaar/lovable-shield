ALTER TABLE public.community_messages ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Allow admins to delete any message
CREATE POLICY "Admins can delete any message"
ON public.community_messages
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));