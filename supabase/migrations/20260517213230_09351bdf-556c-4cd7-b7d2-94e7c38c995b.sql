
-- Feedback table
CREATE TABLE public.table_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  table_id TEXT NOT NULL,
  loved TEXT[] NOT NULL DEFAULT '{}',
  would_eat_again TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.table_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own feedback" ON public.table_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own feedback" ON public.table_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts and admins view all feedback" ON public.table_feedback
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'host'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Meal plan requests
CREATE TABLE public.meal_plan_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  table_id TEXT,
  plan_type TEXT,
  cuisine_style TEXT,
  dietary_restrictions TEXT,
  wellness_goals TEXT,
  foods_more_of TEXT,
  foods_to_avoid TEXT,
  days_count INT,
  grocery_list BOOLEAN NOT NULL DEFAULT false,
  hosting_menu BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_plan_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own meal plan requests" ON public.meal_plan_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own meal plan requests" ON public.meal_plan_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts and admins view all meal plan requests" ON public.meal_plan_requests
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'host'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Hosts and admins update meal plan requests" ON public.meal_plan_requests
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'host'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'host'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_meal_plan_requests_updated_at
  BEFORE UPDATE ON public.meal_plan_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_meal_plan_requests_user ON public.meal_plan_requests(user_id);
CREATE INDEX idx_meal_plan_requests_table ON public.meal_plan_requests(table_id);
CREATE INDEX idx_table_feedback_user ON public.table_feedback(user_id);
CREATE INDEX idx_table_feedback_table ON public.table_feedback(table_id);
