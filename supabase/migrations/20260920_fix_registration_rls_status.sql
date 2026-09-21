-- ============================================================
-- Migration RLS : Autoriser le statut pending_verification à la création de profil
-- Date: 2026-09-20
-- ============================================================

-- Met à jour la politique RLS sur la table public.users pour que les nouveaux inscrits 
-- créés avec statut 'pending_verification' (ou 'active') soient autorisés.

drop policy if exists "users_insert_self_defaults" on public.users;

create policy "users_insert_self_defaults"
on public.users for insert
to authenticated
with check (
  (
    id = auth.uid()
    and role = 'AMBASSADOR'
    and (status = 'pending_verification' or status = 'active')
    and balance = 0
    and "totalEarned" = 0
    and clicks = 0
    and "referralCount" = 0
    and "referralEarnings" = 0
  )
  or public.is_staff()
);
