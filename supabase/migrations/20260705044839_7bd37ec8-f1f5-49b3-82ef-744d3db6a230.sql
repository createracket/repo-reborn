
create table if not exists public.brief_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brief_id uuid not null,
  brief_source text not null check (brief_source in ('user', 'lead')),
  created_at timestamptz not null default now(),
  unique (user_id, brief_id, brief_source)
);

grant select, insert, delete on public.brief_interests to authenticated;
grant all on public.brief_interests to service_role;

alter table public.brief_interests enable row level security;

create policy "Users read own brief interests"
  on public.brief_interests for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own brief interests"
  on public.brief_interests for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users delete own brief interests"
  on public.brief_interests for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins read all brief interests"
  on public.brief_interests for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index if not exists brief_interests_user_idx on public.brief_interests(user_id);
create index if not exists brief_interests_brief_idx on public.brief_interests(brief_id, brief_source);
