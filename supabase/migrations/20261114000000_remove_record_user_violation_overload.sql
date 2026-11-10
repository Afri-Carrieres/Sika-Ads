drop function if exists public.record_user_violation(uuid, text, numeric, text, uuid);

create or replace function public.record_campaign_rejection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from 'rejected'
     and new.status = 'rejected'
     and new."createdBy" = 'user' then
    perform public.record_user_violation(
      new."advertiserId",
      'rejected_campaign',
      null,
      'Campagne rejetée par un administrateur',
      new.id::text
    );
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
