create or replace function public.protect_users_monetization_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if session_user = 'service_role' or auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_staff() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.balance is distinct from old.balance
     or new."totalEarned" is distinct from old."totalEarned"
     or new.clicks is distinct from old.clicks
     or new."referralCount" is distinct from old."referralCount"
     or new."referralEarnings" is distinct from old."referralEarnings"
     or new."referralCode" is distinct from old."referralCode"
  then
    raise exception using
      errcode = '42501',
      message = 'Non-staff users cannot modify privileged columns';
  end if;

  return new;
end;
$$;

create or replace function public.request_withdrawal(
  p_user_id uuid,
  p_withdrawal_id text,
  p_amount numeric,
  p_provider text,
  p_phone text,
  p_country text,
  p_client_request_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_name text;
  v_withdrawal public.withdrawals%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;

  select balance, name
  into v_balance, v_name
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'user_not_found';
  end if;

  select *
  into v_withdrawal
  from public.withdrawals
  where id = p_withdrawal_id
  for update;

  if found then
    if v_withdrawal."userId" is distinct from p_user_id then
      raise exception using errcode = '42501', message = 'withdrawal_user_mismatch';
    end if;

    if v_withdrawal."balanceDebited" or v_withdrawal.status <> 'pending' then
      return p_withdrawal_id;
    end if;

    if v_balance < p_amount then
      raise exception using errcode = 'P0001', message = 'insufficient_balance';
    end if;

    update public.users
    set balance = v_balance - p_amount
    where id = p_user_id;

    update public.withdrawals
    set "balanceDebited" = true,
        "debitedAt" = now()
    where id = p_withdrawal_id;

    return p_withdrawal_id;
  end if;

  if v_balance < p_amount then
    raise exception using errcode = 'P0001', message = 'insufficient_balance';
  end if;

  insert into public.withdrawals (
    id,
    "userId",
    "userName",
    amount,
    provider,
    phone,
    country,
    status,
    "createdAt",
    "clientRequestId",
    "balanceDebited",
    "debitedAt"
  ) values (
    p_withdrawal_id,
    p_user_id,
    coalesce(v_name, 'Utilisateur'),
    p_amount,
    p_provider,
    p_phone,
    p_country,
    'pending',
    now(),
    p_client_request_id,
    true,
    now()
  );

  update public.users
  set balance = v_balance - p_amount
  where id = p_user_id;

  return p_withdrawal_id;
end;
$$;

revoke all on function public.request_withdrawal(uuid, text, numeric, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.request_withdrawal(uuid, text, numeric, text, text, text, text)
  to service_role;

create or replace function public.reject_withdrawal(p_withdrawal_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_withdrawal public.withdrawals%rowtype;
begin
  if not public.is_staff() then
    raise exception using errcode = '42501', message = 'Admin required';
  end if;

  select *
  into v_withdrawal
  from public.withdrawals
  where id = p_withdrawal_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'withdrawal_not_found';
  end if;

  if v_withdrawal.status = 'failed'
     and v_withdrawal."failureReason" = 'rejected_by_admin' then
    return true;
  end if;

  if v_withdrawal.status not in ('pending', 'pending_approval') then
    return false;
  end if;

  if v_withdrawal."balanceDebited" and v_withdrawal.amount > 0 then
    update public.users
    set balance = balance + v_withdrawal.amount
    where id = v_withdrawal."userId";

    if not found then
      raise exception using errcode = 'P0002', message = 'user_not_found';
    end if;
  end if;

  update public.withdrawals
  set status = 'failed',
      "failureReason" = 'rejected_by_admin',
      "refundedBy" = auth.uid(),
      "refundedAt" = case
        when v_withdrawal."balanceDebited" then now()
        else null
      end
  where id = p_withdrawal_id;

  return true;
end;
$$;

revoke all on function public.reject_withdrawal(text) from public, anon;
grant execute on function public.reject_withdrawal(text) to authenticated, service_role;
