alter table public.abuse_activity_log
  alter column reference_id type text using reference_id::text;

alter table public.abuse_violation_log
  alter column reference_id type text using reference_id::text;

create or replace function public.record_user_violation(
  target_user_id uuid,
  violation_type text,
  content_score numeric default null,
  violation_reason text default null,
  reference_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
  rejected_total integer;
  next_suspension timestamptz;
  should_ban boolean;
begin
  if violation_type not in ('rejected_submission', 'rejected_campaign') then
    raise exception using errcode = '22023', message = 'Invalid violation type';
  end if;
  insert into public.abuse_violation_log (user_id, violation_type, content_score, reason, reference_id)
  values (target_user_id, violation_type, content_score, left(violation_reason, 500), reference_id)
  on conflict on constraint abuse_violation_log_reference_id_violation_type_key
  do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    return jsonb_build_object('recorded', false);
  end if;

  insert into public.user_abuse_tracking (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;
  update public.user_abuse_tracking
  set rejected_submissions = rejected_submissions
        + case when violation_type = 'rejected_submission' then 1 else 0 end,
      rejected_campaigns = rejected_campaigns
        + case when violation_type = 'rejected_campaign' then 1 else 0 end,
      last_violation = now(),
      last_violation_type = violation_type,
      updated_at = now()
  where user_id = target_user_id;

  select rejected_submissions + rejected_campaigns
    into rejected_total
    from public.user_abuse_tracking
    where user_id = target_user_id;

  should_ban := rejected_total >= 15
    or (content_score is not null and content_score < 0.2 and rejected_total >= 3);
  if should_ban then
    update public.users set status = 'blocked' where id = target_user_id;
    update public.user_abuse_tracking
    set is_suspended = true, suspension_reason = 'Compte bloqué après des violations répétées',
        suspension_until = null, updated_at = now()
    where user_id = target_user_id;
  elsif rejected_total >= 7 then
    next_suspension := now() + interval '7 days';
    update public.user_abuse_tracking
    set is_suspended = true, suspension_reason = 'Violations répétées',
        suspension_until = next_suspension, updated_at = now()
    where user_id = target_user_id;
  elsif rejected_total >= 3 then
    next_suspension := now() + interval '24 hours';
    update public.user_abuse_tracking
    set is_suspended = true, suspension_reason = 'Violations répétées',
        suspension_until = next_suspension, updated_at = now()
    where user_id = target_user_id;
  end if;

  return jsonb_build_object(
    'recorded', true,
    'rejection_count', rejected_total,
    'suspended_until', next_suspension,
    'banned', should_ban
  );
end;
$$;

revoke all on function public.record_user_violation(uuid, text, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.record_user_violation(uuid, text, numeric, text, text)
  to service_role;

create or replace function public.record_proof_rejection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ai_score numeric;
begin
  if old.status is distinct from 'rejected' and new.status = 'rejected' then
    ai_score := nullif(new."aiAnalysis"->>'confidence', '')::numeric / 100;
    perform public.record_user_violation(
      new."userId",
      'rejected_submission',
      ai_score,
      coalesce(new."rejectionReason", new."aiAnalysis"->>'reason', 'Preuve rejetée'),
      new.id::text
    );
  end if;
  return new;
end;
$$;
