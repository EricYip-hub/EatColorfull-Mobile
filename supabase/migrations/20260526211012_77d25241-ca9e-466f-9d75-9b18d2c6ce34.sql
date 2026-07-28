-- 1. Create storage bucket for tastemaker videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tastemaker-videos',
  'tastemaker-videos',
  true,
  524288000, -- 500 MB
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/mpeg']
);

-- 2. Storage RLS policies
CREATE POLICY "Anyone can view tastemaker videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tastemaker-videos');

CREATE POLICY "Hosts and admins can upload tastemaker videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tastemaker-videos'
  AND (public.has_role(auth.uid(), 'host'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Hosts and admins can update tastemaker videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tastemaker-videos'
  AND (public.has_role(auth.uid(), 'host'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Hosts and admins can delete tastemaker videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tastemaker-videos'
  AND (public.has_role(auth.uid(), 'host'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

-- 3. Create tastemaker_videos table
CREATE TABLE public.tastemaker_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tastemaker_id TEXT NOT NULL,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  poster_url TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_tastemaker_videos_tastemaker_id ON public.tastemaker_videos(tastemaker_id);

-- 4. Grants (videos are public-readable, so anon needs SELECT)
GRANT SELECT ON public.tastemaker_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tastemaker_videos TO authenticated;
GRANT ALL ON public.tastemaker_videos TO service_role;

-- 5. Enable RLS
ALTER TABLE public.tastemaker_videos ENABLE ROW LEVEL SECURITY;

-- 6. Policies
CREATE POLICY "Anyone can view tastemaker videos"
ON public.tastemaker_videos FOR SELECT
USING (true);

CREATE POLICY "Hosts and admins can insert tastemaker videos"
ON public.tastemaker_videos FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'host'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Hosts and admins can update tastemaker videos"
ON public.tastemaker_videos FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'host'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'host'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Hosts and admins can delete tastemaker videos"
ON public.tastemaker_videos FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'host'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 7. Timestamp trigger
CREATE TRIGGER set_tastemaker_videos_updated_at
BEFORE UPDATE ON public.tastemaker_videos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();