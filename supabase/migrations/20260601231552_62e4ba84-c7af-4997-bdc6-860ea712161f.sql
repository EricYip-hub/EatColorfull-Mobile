
-- Bookings for ticketed events (Irie Supper Club, future dinners)
CREATE TABLE public.event_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  age integer,
  phone text,
  dietary_notes text,
  guest_count integer NOT NULL DEFAULT 1,
  coupon_code text,
  price_cents integer NOT NULL DEFAULT 0,
  amount_due_cents integer NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_bookings TO authenticated;
GRANT INSERT ON public.event_bookings TO anon;
GRANT ALL ON public.event_bookings TO service_role;

ALTER TABLE public.event_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a booking"
  ON public.event_bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view all bookings"
  ON public.event_bookings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update bookings"
  ON public.event_bookings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_event_bookings_updated_at
  BEFORE UPDATE ON public.event_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_event_bookings_event_slug ON public.event_bookings(event_slug);
CREATE INDEX idx_event_bookings_email ON public.event_bookings(email);

-- Coupon codes
CREATE TABLE public.event_coupons (
  code text PRIMARY KEY,
  event_slug text,
  discount_percent integer NOT NULL DEFAULT 100 CHECK (discount_percent BETWEEN 0 AND 100),
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_coupons TO anon, authenticated;
GRANT ALL ON public.event_coupons TO service_role;

ALTER TABLE public.event_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active coupons"
  ON public.event_coupons FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "Admins manage coupons"
  ON public.event_coupons FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_event_coupons_updated_at
  BEFORE UPDATE ON public.event_coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the launch coupon: 100% off for Irie Supper Club
INSERT INTO public.event_coupons (code, event_slug, discount_percent, active)
VALUES ('IRIE2026', 'irie-supper-club', 100, true);
