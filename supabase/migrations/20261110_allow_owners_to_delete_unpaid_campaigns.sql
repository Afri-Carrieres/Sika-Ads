drop policy if exists "campaigns_delete_unpaid_owner" on public.campaigns;

create policy "campaigns_delete_unpaid_owner"
on public.campaigns for delete
to authenticated
using (
  "advertiserId" = auth.uid()
  and "createdBy" = 'user'
  and coalesce("paymentConfirmed", false) = false
  and status in ('pending', 'failed', 'rejected')
  and coalesce("paymentStatus", 'pending') in (
    'pending',
    'pending_payment',
    'failed'
  )
  and coalesce("campaignPaymentStatus", 'pending_payment') in (
    'pending_payment',
    'payment_failed',
    'payment_rejected'
  )
);
