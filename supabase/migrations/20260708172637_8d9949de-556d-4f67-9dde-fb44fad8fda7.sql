
INSERT INTO public.chef_profiles (tastemaker_id, user_id, service_area, accepting_orders)
VALUES 
  ('vince-macintosh', '0943f974-6f17-469e-bc4c-143643bfac01', 'Los Angeles', true),
  ('richie-million-jr', '0943f974-6f17-469e-bc4c-143643bfac01', 'Los Angeles', true)
ON CONFLICT DO NOTHING;
