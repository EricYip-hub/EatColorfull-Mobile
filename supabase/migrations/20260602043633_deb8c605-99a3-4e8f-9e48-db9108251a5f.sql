GRANT INSERT ON public.event_bookings TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.event_bookings TO authenticated;
GRANT ALL ON public.event_bookings TO service_role;