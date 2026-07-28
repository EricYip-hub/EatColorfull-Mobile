-- 1. Track which notification a join_request decision created so hosts
--    can see delivery/seen status next to the request.
ALTER TABLE public.join_requests
  ADD COLUMN IF NOT EXISTS notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL;

-- 2. Speed up the per-user notifications query (used by NotificationsBell).
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- 3. Update the join-request status trigger to record the notification id
--    it emits, so hosts can read delivery state from join_requests.
CREATE OR REPLACE FUNCTION public.trg_join_request_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _new_notif_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF NEW.status = 'approved'::request_status AND OLD.status = 'pending'::request_status THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.user_id, 'approved', 'Your seat was approved',
              'Pay to confirm your reservation.', '/dashboard')
      RETURNING id INTO _new_notif_id;
      NEW.notification_id := _new_notif_id;
    ELSIF NEW.status = 'declined'::request_status AND OLD.status = 'pending'::request_status THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.user_id, 'declined', 'Request not accepted',
              COALESCE(NEW.host_note, 'The host could not confirm your seat.'), '/dashboard')
      RETURNING id INTO _new_notif_id;
      NEW.notification_id := _new_notif_id;
    ELSIF NEW.status = 'paid'::request_status AND OLD.status = 'approved'::request_status THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.user_id, 'confirmed', 'Reservation confirmed',
              'Your seat is confirmed. We''ll send arrival details closer to the date.', '/dashboard')
      RETURNING id INTO _new_notif_id;
      NEW.notification_id := _new_notif_id;
    END IF;

    IF (OLD.status IN ('approved'::request_status, 'paid'::request_status)
        AND NEW.status IN ('cancelled'::request_status, 'declined'::request_status)) THEN
      PERFORM public.promote_waitlist(NEW.table_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Hosts/admins need to read the notification row their decision created
--    in order to render Sent/Delivered/Seen on the host dashboard.
DROP POLICY IF EXISTS "Hosts and admins view decision notifications" ON public.notifications;
CREATE POLICY "Hosts and admins view decision notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  (public.has_role(auth.uid(), 'host'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.join_requests jr WHERE jr.notification_id = notifications.id
  )
);

-- 5. Data hygiene: archive read notifications older than 90 days.
--    Uses pg_cron if available; safe no-op otherwise.
CREATE OR REPLACE FUNCTION public.purge_old_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deleted integer;
BEGIN
  WITH d AS (
    DELETE FROM public.notifications
    WHERE read_at IS NOT NULL AND read_at < now() - interval '90 days'
    RETURNING 1
  )
  SELECT count(*) INTO _deleted FROM d;
  RETURN _deleted;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-old-notifications')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-notifications');
    PERFORM cron.schedule(
      'purge-old-notifications',
      '17 3 * * *',
      $cron$SELECT public.purge_old_notifications();$cron$
    );
  END IF;
END
$$;