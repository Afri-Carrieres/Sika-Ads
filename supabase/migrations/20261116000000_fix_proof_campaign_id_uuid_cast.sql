create or replace function public.enforce_proof_submission_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  check_result jsonb;
  token_user_id uuid;
  token_campaign_id uuid;
  token_image_hash text;
  token_file_size integer;
  token_content_type text;
  token_image_width integer;
  token_image_height integer;
  token_score numeric;
begin
  if public.is_staff() or auth.role() = 'service_role' then
    return new;
  end if;
  if new."userId" is distinct from auth.uid()
     or new.status is distinct from 'pending'
     or coalesce(new."aiValidation", false)
     or new."aiAnalysis" is not null then
    raise exception using errcode = '42501', message = 'Données de preuve non autorisées.';
  end if;
  if new.size is null or new.size < 51200 or new.size > 2097152
     or new.type is null or new.type not in ('image/jpeg', 'image/png') then
    raise exception using errcode = '23514', message = 'La preuve doit être une image JPG ou PNG de 50 Ko à 2 Mo.';
  end if;
  if new."imageHash" is null or new."imageHash" !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '23514', message = 'L’empreinte de la preuve est invalide.';
  end if;
  if new."validationToken" is null then
    raise exception using errcode = '42501', message = 'La vérification de la preuve est requise.';
  end if;

  check_result := public.check_proof_submission(new."imageHash");
  if not coalesce((check_result->>'allowed')::boolean, false) then
    raise exception using errcode = '42501', message = check_result->>'message';
  end if;
  if new."campaignId" is null or not exists (
    select 1
      from public.campaigns as campaign
     where campaign.id = new."campaignId"::uuid
       and campaign.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'La campagne sélectionnée n’est plus active.';
  end if;

  select token_row.user_id, token_row.campaign_id, token_row.content_hash,
         token_row.file_size, token_row.content_type, token_row.image_width,
         token_row.image_height, token_row.score
    into token_user_id, token_campaign_id, token_image_hash, token_file_size,
         token_content_type, token_image_width, token_image_height, token_score
    from public.proof_prevalidation_tokens as token_row
   where token_row.token = new."validationToken"
     and token_row.used_at is null
     and token_row.expires_at > now()
   for update;
  if not found
     or token_user_id is distinct from new."userId"
     or token_campaign_id is distinct from new."campaignId"::uuid
     or token_image_hash is distinct from new."imageHash"
     or token_file_size is distinct from new.size
     or token_content_type is distinct from new.type
     or token_image_width < 540
     or token_image_height < 720
     or token_score < 0.3 then
    raise exception using errcode = '42501', message = 'La vérification de cette preuve a expiré ou ne correspond plus à son fichier.';
  end if;

  update public.proof_prevalidation_tokens
     set used_at = now()
   where token = new."validationToken";
  return new;
end;
$$;
