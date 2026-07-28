ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS notifications_user_undelivered_idx
  ON public.notifications (user_id)
  WHERE delivered_at IS NULL;
