
-- 1. Extend status enum
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'waitlisted';

-- 2. Tables capacity meta
CREATE TABLE IF NOT EXISTS public.tables_meta (
  id text PRIMARY KEY,
  seats_total int NOT NULL CHECK (seats_total > 0)
);
ALTER TABLE public.tables_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads table meta"
  ON public.tables_meta FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
