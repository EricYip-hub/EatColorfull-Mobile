
-- ============ ENUMS ============
CREATE TYPE public.chef_listing_kind AS ENUM ('meal_prep','hosted_table','private_dining','product','merch');
CREATE TYPE public.chef_listing_status AS ENUM ('draft','active','paused','sold_out');
CREATE TYPE public.chef_video_platform AS ENUM ('instagram','tiktok','youtube','upload');
CREATE TYPE public.chef_order_status AS ENUM ('pending','confirmed','fulfilled','cancelled');
CREATE TYPE public.chef_fulfillment AS ENUM ('pickup','delivery');

-- ============ chef_profiles ============
CREATE TABLE public.chef_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tastemaker_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  service_area text,
  extended_bio text,
  accepting_orders boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chef_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chef_profiles TO authenticated;
GRANT ALL ON public.chef_profiles TO service_role;
ALTER TABLE public.chef_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read chef profiles" ON public.chef_profiles FOR SELECT USING (true);
CREATE POLICY "Chef manages own profile" ON public.chef_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage chef profiles" ON public.chef_profiles FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER chef_profiles_updated BEFORE UPDATE ON public.chef_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ chef_listings ============
CREATE TABLE public.chef_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  kind public.chef_listing_kind NOT NULL,
  title text NOT NULL,
  description text,
  price_cents integer,
  currency text NOT NULL DEFAULT 'USD',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_url text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  slug text NOT NULL UNIQUE,
  status public.chef_listing_status NOT NULL DEFAULT 'draft',
  inventory_remaining integer,
  cutoff_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chef_listings_chef ON public.chef_listings(chef_id);
CREATE INDEX idx_chef_listings_kind_status ON public.chef_listings(kind, status);
GRANT SELECT ON public.chef_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chef_listings TO authenticated;
GRANT ALL ON public.chef_listings TO service_role;
ALTER TABLE public.chef_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active listings" ON public.chef_listings FOR SELECT USING (status = 'active'::public.chef_listing_status);
CREATE POLICY "Chef reads own listings" ON public.chef_listings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()));
CREATE POLICY "Chef writes own listings" ON public.chef_listings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()));
CREATE POLICY "Admins manage listings" ON public.chef_listings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER chef_listings_updated BEFORE UPDATE ON public.chef_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ chef_kitchen_videos ============
CREATE TABLE public.chef_kitchen_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  platform public.chef_video_platform NOT NULL,
  external_url text,
  thumbnail_url text,
  uploaded_video_id uuid REFERENCES public.tastemaker_videos(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  linked_listing_id uuid REFERENCES public.chef_listings(id) ON DELETE SET NULL,
  cta_label text,
  display_order integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chef_kitchen_videos_chef ON public.chef_kitchen_videos(chef_id, display_order);
GRANT SELECT ON public.chef_kitchen_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chef_kitchen_videos TO authenticated;
GRANT ALL ON public.chef_kitchen_videos TO service_role;
ALTER TABLE public.chef_kitchen_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read public videos" ON public.chef_kitchen_videos FOR SELECT USING (is_public = true);
CREATE POLICY "Chef reads own videos" ON public.chef_kitchen_videos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()));
CREATE POLICY "Chef writes own videos" ON public.chef_kitchen_videos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()));
CREATE POLICY "Admins manage videos" ON public.chef_kitchen_videos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER chef_kitchen_videos_updated BEFORE UPDATE ON public.chef_kitchen_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ chef_favorites ============
CREATE TABLE public.chef_favorites (
  user_id uuid NOT NULL,
  chef_id uuid NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chef_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chef_favorites TO authenticated;
GRANT ALL ON public.chef_favorites TO service_role;
ALTER TABLE public.chef_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.chef_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ chef_orders ============
CREATE TABLE public.chef_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chef_id uuid NOT NULL REFERENCES public.chef_profiles(id) ON DELETE RESTRICT,
  listing_id uuid NOT NULL REFERENCES public.chef_listings(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  fulfillment public.chef_fulfillment NOT NULL DEFAULT 'pickup',
  fulfillment_date date,
  address jsonb,
  dietary_notes text,
  total_cents integer NOT NULL DEFAULT 0,
  status public.chef_order_status NOT NULL DEFAULT 'pending',
  source_video_id uuid REFERENCES public.chef_kitchen_videos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chef_orders_user ON public.chef_orders(user_id);
CREATE INDEX idx_chef_orders_chef ON public.chef_orders(chef_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chef_orders TO authenticated;
GRANT ALL ON public.chef_orders TO service_role;
ALTER TABLE public.chef_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON public.chef_orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create own orders" ON public.chef_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Chef views orders for own listings" ON public.chef_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()));
CREATE POLICY "Chef updates orders for own listings" ON public.chef_orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()));
CREATE POLICY "Admins manage orders" ON public.chef_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER chef_orders_updated BEFORE UPDATE ON public.chef_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ chef_link_clicks ============
CREATE TABLE public.chef_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.chef_listings(id) ON DELETE CASCADE,
  referrer text,
  utm_source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chef_link_clicks_listing ON public.chef_link_clicks(listing_id, created_at DESC);
GRANT INSERT ON public.chef_link_clicks TO anon, authenticated;
GRANT SELECT ON public.chef_link_clicks TO authenticated;
GRANT ALL ON public.chef_link_clicks TO service_role;
ALTER TABLE public.chef_link_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone records clicks" ON public.chef_link_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Chef reads own click analytics" ON public.chef_link_clicks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chef_listings l
    JOIN public.chef_profiles cp ON cp.id = l.chef_id
    WHERE l.id = listing_id AND cp.user_id = auth.uid()
  ));
CREATE POLICY "Admins read click analytics" ON public.chef_link_clicks FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- ============ chef_profile_views ============
CREATE TABLE public.chef_profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  viewer_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chef_profile_views_chef ON public.chef_profile_views(chef_id, created_at DESC);
GRANT INSERT ON public.chef_profile_views TO anon, authenticated;
GRANT SELECT ON public.chef_profile_views TO authenticated;
GRANT ALL ON public.chef_profile_views TO service_role;
ALTER TABLE public.chef_profile_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone records profile views" ON public.chef_profile_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Chef reads own profile views" ON public.chef_profile_views FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()));
CREATE POLICY "Admins read profile views" ON public.chef_profile_views FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- ============ storage bucket ============
INSERT INTO storage.buckets (id, name, public) VALUES ('chef-photos','chef-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read chef photos" ON storage.objects FOR SELECT USING (bucket_id = 'chef-photos');
CREATE POLICY "Hosts upload chef photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chef-photos' AND (has_role(auth.uid(),'host'::app_role) OR has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "Hosts update chef photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chef-photos' AND (has_role(auth.uid(),'host'::app_role) OR has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "Hosts delete chef photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chef-photos' AND (has_role(auth.uid(),'host'::app_role) OR has_role(auth.uid(),'admin'::app_role)));
