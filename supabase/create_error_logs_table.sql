-- SQL Migration: Create error_logs table for real-time tracking
create table if not exists public.error_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  level text default 'error', -- 'error', 'warning', 'info'
  message text not null,
  stack text,
  component_stack text,
  url text,
  user_agent text,
  user_email text,
  metadata jsonb default '{}'::jsonb
);

-- Enable RLS
alter table public.error_logs enable row level security;

-- Allow anonymous inserts (so we can log errors even if user is not logged in)
drop policy if exists "Allow public inserts to error_logs" on public.error_logs;
create policy "Allow public inserts to error_logs"
  on public.error_logs for insert
  with check (true);

-- Only admins should read error logs
drop policy if exists "Allow admins to view error_logs" on public.error_logs;
create policy "Allow admins to view error_logs"
  on public.error_logs for select
  using (
    exists (
      select 1 from public.usuarios
      where email = auth.jwt() ->> 'email'
      and role in ('admin', 'super-admin')
    )
  );

-- Comment for the table
comment on table public.error_logs is 'Logs for frontend errors and critical events for real-time monitoring.';
