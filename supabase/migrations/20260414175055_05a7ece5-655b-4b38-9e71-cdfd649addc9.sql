
-- Table for age verification requests (admin approval flow)
CREATE TABLE public.age_verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.age_verification_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (no auth required since this is before login)
CREATE POLICY "Anyone can create verification request"
ON public.age_verification_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Anyone can read their own request by device_id
CREATE POLICY "Anyone can read own request by device_id"
ON public.age_verification_requests
FOR SELECT
TO anon, authenticated
USING (true);

-- Admins can update (approve/deny)
CREATE POLICY "Admins can update verification requests"
ON public.age_verification_requests
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Admins can delete
CREATE POLICY "Admins can delete verification requests"
ON public.age_verification_requests
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
