
create table public.client_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  session_id text,
  event text not null,
  path text,
  user_agent text,
  props jsonb not null default '{}'::jsonb
);

create index client_events_event_created_at_idx on public.client_events (event, created_at desc);
create index client_events_session_idx on public.client_events (session_id, created_at desc);

alter table public.client_events enable row level security;

create policy "Anyone can insert client events"
  on public.client_events for insert
  to anon, authenticated
  with check (
    user_id is null or user_id = auth.uid()
  );

create policy "Admins read client events"
  on public.client_events for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));
