alter table if exists public.invitations
  add column if not exists property_id uuid,
  add column if not exists property_name text,
  add column if not exists related_customer_name text,
  add column if not exists invited_name text,
  add column if not exists created_by_user_id uuid,
  add column if not exists created_by_name text,
  add column if not exists internal_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invitations_property_id_fkey'
  ) then
    alter table public.invitations
      add constraint invitations_property_id_fkey
      foreign key (property_id) references public.properties(id)
      on delete set null;
  end if;
end $$;
