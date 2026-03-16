
ALTER TABLE public.profiles 
ADD COLUMN sentinel_plus_until timestamptz DEFAULT NULL,
ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
