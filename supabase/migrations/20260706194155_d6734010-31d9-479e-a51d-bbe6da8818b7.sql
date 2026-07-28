
CREATE OR REPLACE FUNCTION public.trg_chef_order_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _listing_title text;
  _chef_user_id uuid;
BEGIN
  SELECT title INTO _listing_title FROM public.chef_listings WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
  SELECT user_id INTO _chef_user_id FROM public.chef_profiles WHERE id = COALESCE(NEW.chef_id, OLD.chef_id);

  IF TG_OP = 'INSERT' THEN
    -- Guest: order requested
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (NEW.user_id, 'chef_order_requested', 'Order requested',
            'Your order for ' || COALESCE(_listing_title, 'a chef listing') || ' has been sent. The chef will confirm shortly.',
            '/orders/' || NEW.id);
    -- Chef: new order
    IF _chef_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (_chef_user_id, 'chef_order_new', 'New order received',
              'A guest requested ' || COALESCE(_listing_title, 'one of your listings') || '.',
              '/orders/' || NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Status transitions
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'confirmed'::chef_order_status AND OLD.status = 'pending'::chef_order_status THEN
        INSERT INTO public.notifications (user_id, kind, title, body, link)
        VALUES (NEW.user_id, 'chef_order_confirmed', 'Order confirmed',
                'Your chef accepted your order for ' || COALESCE(_listing_title, 'their listing') || '.',
                '/orders/' || NEW.id);
      ELSIF NEW.status = 'cancelled'::chef_order_status AND OLD.status IS DISTINCT FROM 'cancelled'::chef_order_status THEN
        INSERT INTO public.notifications (user_id, kind, title, body, link)
        VALUES (NEW.user_id, 'chef_order_cancelled', 'Order cancelled',
                'Your order for ' || COALESCE(_listing_title, 'a chef listing') || ' was cancelled.',
                '/orders/' || NEW.id);
        IF _chef_user_id IS NOT NULL AND _chef_user_id <> NEW.user_id THEN
          INSERT INTO public.notifications (user_id, kind, title, body, link)
          VALUES (_chef_user_id, 'chef_order_cancelled', 'Order cancelled',
                  'An order for ' || COALESCE(_listing_title, 'your listing') || ' was cancelled.',
                  '/orders/' || NEW.id);
        END IF;
      ELSIF NEW.status = 'fulfilled'::chef_order_status AND OLD.status IS DISTINCT FROM 'fulfilled'::chef_order_status THEN
        INSERT INTO public.notifications (user_id, kind, title, body, link)
        VALUES (NEW.user_id, 'chef_order_fulfilled', 'Order fulfilled',
                'Your order for ' || COALESCE(_listing_title, 'a chef listing') || ' is complete. Enjoy!',
                '/orders/' || NEW.id);
      END IF;
    END IF;

    -- Payment transitions
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
        INSERT INTO public.notifications (user_id, kind, title, body, link)
        VALUES (NEW.user_id, 'chef_payment_confirmed', 'Payment confirmed',
                'Your payment for ' || COALESCE(_listing_title, 'a chef order') || ' was received.',
                '/orders/' || NEW.id);
        IF _chef_user_id IS NOT NULL AND _chef_user_id <> NEW.user_id THEN
          INSERT INTO public.notifications (user_id, kind, title, body, link)
          VALUES (_chef_user_id, 'chef_payment_received', 'Payment received',
                  'You received payment for ' || COALESCE(_listing_title, 'your listing') || '.',
                  '/orders/' || NEW.id);
        END IF;
      ELSIF NEW.payment_status = 'pending_verification' AND OLD.payment_status IS DISTINCT FROM 'pending_verification' THEN
        IF _chef_user_id IS NOT NULL AND _chef_user_id <> NEW.user_id THEN
          INSERT INTO public.notifications (user_id, kind, title, body, link)
          VALUES (_chef_user_id, 'chef_payment_pending', 'Payment awaiting verification',
                  'A guest submitted a manual payment for ' || COALESCE(_listing_title, 'your listing') || '. Please confirm.',
                  '/orders/' || NEW.id);
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chef_order_notifications ON public.chef_orders;
CREATE TRIGGER chef_order_notifications
AFTER INSERT OR UPDATE ON public.chef_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_chef_order_notifications();
