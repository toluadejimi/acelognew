-- Virtual accounts (one per user) for SprintPay generate-virtual-account flow
CREATE TABLE IF NOT EXISTS public.virtual_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  account_no text NOT NULL,
  account_name text NOT NULL,
  bank_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.virtual_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own virtual account"
  ON public.virtual_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role / Edge Functions insert via service key (no policy needed for that)
-- Optionally allow insert only for own user_id (e.g. from Edge Function using service role)
COMMENT ON TABLE public.virtual_accounts IS 'One virtual account per user for bank transfer funding via SprintPay';
