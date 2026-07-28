-- Drop dupes keeping the earliest per (user_id, table_id)
DELETE FROM public.table_feedback a
USING public.table_feedback b
WHERE a.user_id = b.user_id
  AND a.table_id = b.table_id
  AND a.created_at > b.created_at;

ALTER TABLE public.table_feedback
  ADD CONSTRAINT table_feedback_user_table_unique UNIQUE (user_id, table_id);