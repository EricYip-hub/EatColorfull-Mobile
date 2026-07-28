-- Roles enum + table (separate from profiles to prevent privilege escalation)
create type public.app_role as enum ('guest', 'host', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  dietary_notes text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer role check (avoids recursive RLS)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Auto-create profile + assign guest role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.user_roles (user_id, role)
  values (new.id, 'guest');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS: profiles
create policy "Users view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Hosts and admins view all profiles"
  on public.profiles for select
  to authenticated
  using (public.has_role(auth.uid(), 'host') or public.has_role(auth.uid(), 'admin'));

create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- RLS: user_roles
create policy "Users view own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Join request status enum + table
create type public.request_status as enum ('pending', 'approved', 'declined', 'paid', 'cancelled');

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  table_id text not null,
  status public.request_status not null default 'pending',
  message text,
  host_note text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, table_id)
);

alter table public.join_requests enable row level security;

create index join_requests_table_id_idx on public.join_requests (table_id);
create index join_requests_user_id_idx on public.join_requests (user_id);
create index join_requests_status_idx on public.join_requests (status);

create trigger join_requests_set_updated_at
  before update on public.join_requests
  for each row execute function public.set_updated_at();

-- RLS: join_requests
create policy "Guests create own requests"
  on public.join_requests for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');

create policy "Users view own requests"
  on public.join_requests for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Hosts and admins view all requests"
  on public.join_requests for select
  to authenticated
  using (public.has_role(auth.uid(), 'host') or public.has_role(auth.uid(), 'admin'));

create policy "Guests cancel own pending requests"
  on public.join_requests for update
  to authenticated
  using (auth.uid() = user_id and status in ('pending', 'approved'))
  with check (auth.uid() = user_id and status = 'cancelled');

create policy "Hosts and admins manage requests"
  on public.join_requests for update
  to authenticated
  using (public.has_role(auth.uid(), 'host') or public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'host') or public.has_role(auth.uid(), 'admin'));

-- Public seat counts view: paid bookings per table (this is what reduces seats)
create or replace view public.table_seat_counts
with (security_invoker = true)
as
select
  table_id,
  count(*) filter (where status = 'paid')::int as paid_seats,
  count(*) filter (where status = 'approved')::int as approved_seats,
  count(*) filter (where status = 'pending')::int as pending_seats
from public.join_requests
group by table_id;

-- Make seat counts readable to everyone (anonymous + authenticated)
grant select on public.table_seat_counts to anon, authenticated;