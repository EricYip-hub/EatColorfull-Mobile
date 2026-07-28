ALTER TABLE public.table_feedback
  ADD COLUMN IF NOT EXISTS host_id text,
  ADD COLUMN IF NOT EXISTS food smallint,
  ADD COLUMN IF NOT EXISTS ambience smallint,
  ADD COLUMN IF NOT EXISTS host_energy smallint,
  ADD COLUMN IF NOT EXISTS cleanliness smallint,
  ADD COLUMN IF NOT EXISTS flow smallint,
  ADD COLUMN IF NOT EXISTS would_return smallint,
  ADD COLUMN IF NOT EXISTS public_note text,
  ADD COLUMN IF NOT EXISTS private_note text,
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_reviewed boolean NOT NULL DEFAULT false;

ALTER TABLE public.table_feedback
  ADD CONSTRAINT table_feedback_rating_range CHECK (
    (food IS NULL OR food BETWEEN 1 AND 5) AND
    (ambience IS NULL OR ambience BETWEEN 1 AND 5) AND
    (host_energy IS NULL OR host_energy BETWEEN 1 AND 5) AND
    (cleanliness IS NULL OR cleanliness BETWEEN 1 AND 5) AND
    (flow IS NULL OR flow BETWEEN 1 AND 5) AND
    (would_return IS NULL OR would_return BETWEEN 1 AND 5)
  );

CREATE INDEX IF NOT EXISTS idx_table_feedback_host_id ON public.table_feedback(host_id);
CREATE INDEX IF NOT EXISTS idx_table_feedback_table_id ON public.table_feedback(table_id);