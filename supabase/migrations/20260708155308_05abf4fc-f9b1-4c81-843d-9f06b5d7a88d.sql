ALTER TABLE public.tastemaker_videos
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'upload'
    CHECK (platform IN ('tiktok', 'youtube', 'instagram', 'upload'));

CREATE INDEX IF NOT EXISTS idx_tastemaker_videos_platform
  ON public.tastemaker_videos(tastemaker_id, platform);