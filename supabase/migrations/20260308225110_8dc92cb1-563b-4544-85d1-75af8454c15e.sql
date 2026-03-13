-- Allow admins to insert transactions (for credit/debit actions)
CREATE POLICY "Admins can insert transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage all wallets (insert if needed)
CREATE POLICY "Admins can insert wallets"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));