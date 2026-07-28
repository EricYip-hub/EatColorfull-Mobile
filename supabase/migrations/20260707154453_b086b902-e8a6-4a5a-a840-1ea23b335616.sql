
-- 1) Profile date of birth
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 2) Notification trigger on form_submissions (single funnel for all app submissions)
CREATE OR REPLACE FUNCTION public.trg_form_submission_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := NEW.user_id;
  _title text;
  _body text;
  _link text := '/dashboard';
BEGIN
  -- Resolve user by email when user_id is not attached (e.g. host applications)
  IF _uid IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(NEW.email) LIMIT 1;
  END IF;

  IF _uid IS NULL THEN
    RETURN NEW;
  END IF;

  CASE NEW.source
    WHEN 'host_application' THEN
      _title := 'Host application received';
      _body  := 'Thanks for applying to host. Our team will review your application and follow up by email.';
      _link  := '/host';
    WHEN 'guest_application' THEN
      _title := 'Guest application received';
      _body  := 'Your application to attend is in. We''ll match you with a table soon.';
    WHEN 'tastemaker_application' THEN
      _title := 'Tastemaker application received';
      _body  := 'Thanks for applying. We''ll be in touch shortly.';
      _link  := '/tastemakers';
    WHEN 'meal_prep_request' THEN
      _title := 'Meal prep request sent';
      _body  := 'The chef has your request and will confirm shortly.';
      _link  := '/meal-prep';
    WHEN 'meal_plan_request' THEN
      _title := 'Meal plan request sent';
      _body  := 'The chef has your meal plan request and will follow up.';
      _link  := '/meal-prep';
    WHEN 'rsvp_irie', 'rsvp_event' THEN
      _title := 'RSVP received';
      _body  := 'Your RSVP is in. Details on the way.';
    WHEN 'order_molino' THEN
      _title := 'Order received';
      _body  := 'Your Molino order is in. Confirmation coming by email.';
    WHEN 'join_request' THEN
      _title := 'Seat request sent';
      _body  := 'The host has your request. We''ll notify you when they respond.';
    WHEN 'contact' THEN
      _title := 'Message received';
      _body  := 'Thanks for reaching out. We''ll get back to you shortly.';
    WHEN 'signup' THEN
      RETURN NEW; -- skip signup, handled elsewhere
    ELSE
      _title := 'Submission received';
      _body  := 'We got your submission. Details on the way.';
  END CASE;

  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (_uid, 'submission_' || NEW.source, _title, _body, _link);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block user submission
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS form_submission_notify ON public.form_submissions;
CREATE TRIGGER form_submission_notify
AFTER INSERT ON public.form_submissions
FOR EACH ROW EXECUTE FUNCTION public.trg_form_submission_notify();
