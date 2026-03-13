-- Add phone to virtual_accounts for user verification
ALTER TABLE public.virtual_accounts
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.virtual_accounts.phone IS 'User phone number (e.g. 11 digits) for virtual account';
