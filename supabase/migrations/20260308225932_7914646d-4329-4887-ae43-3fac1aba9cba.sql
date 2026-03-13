-- Add is_blocked column to profiles
ALTER TABLE public.profiles ADD COLUMN is_blocked boolean NOT NULL DEFAULT false;

-- Update the "Anyone can view active products" policy won't be affected
-- But we need to block users from signing in by checking is_blocked in app logic