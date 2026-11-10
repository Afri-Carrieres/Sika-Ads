create or replace function public.admin_reactivate_suspended_user(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  reactivated_user_id uuid;
begin
  if not exists (
    select 1
      from public.users as admin_user
     where admin_user.id = auth.uid()
       and admin_user.role = 'ADMIN'
  ) then
    raise exception using errcode = '42501', message = 'Accès réservé aux administrateurs.';
  end if;

  update public.users as target_user
     set status = 'active'
   where target_user.id = target_user_id
     and target_user.status = 'blocked'
     and exists (
       select 1
         from public.user_abuse_tracking as tracking
        where tracking.user_id = target_user.id
          and tracking.is_suspended
          and tracking.suspension_reason = 'Compte bloqué après des violations répétées'
     );

  update public.user_abuse_tracking as tracking
     set is_suspended = false,
         suspension_reason = null,
         suspension_until = null,
         updated_at = now()
   where tracking.user_id = target_user_id
     and tracking.is_suspended
  returning tracking.user_id into reactivated_user_id;

  if reactivated_user_id is null then
    raise exception using errcode = 'P0002', message = 'Aucune suspension active trouvée pour ce compte.';
  end if;

  return jsonb_build_object(
    'reactivated', true,
    'user_id', reactivated_user_id
  );
end;
$$;

revoke all on function public.admin_reactivate_suspended_user(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_reactivate_suspended_user(uuid)
  to authenticated;
