CREATE TABLE public.chef_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL,
  order_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chef_ratings_chef ON public.chef_ratings(chef_id);
CREATE INDEX idx_chef_ratings_user ON public.chef_ratings(user_id);

GRANT SELECT ON public.chef_ratings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.chef_ratings TO authenticated;
GRANT ALL ON public.chef_ratings TO service_role;

ALTER TABLE public.chef_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ratings"
ON public.chef_ratings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users insert rating for own fulfilled order"
ON public.chef_ratings FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chef_orders o
    WHERE o.id = chef_ratings.order_id
      AND o.user_id = auth.uid()
      AND o.chef_id = chef_ratings.chef_id
      AND o.status = 'fulfilled'::chef_order_status
  )
);

CREATE POLICY "Users update own rating"
ON public.chef_ratings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage ratings"
ON public.chef_ratings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER chef_ratings_updated_at
BEFORE UPDATE ON public.chef_ratings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();