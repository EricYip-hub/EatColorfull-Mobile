import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { logFormSubmission } from "@/lib/log-form-submission";
import { useAuth } from "@/lib/auth-context";
import { TABLES } from "@/lib/tables-data";
import { ColorfullMark } from "@/components/brand/ColorfullMark";
import { toast } from "sonner";

const searchSchema = z.object({ table: fallback(z.string(), "").optional() });

const planSchema = z.object({
  plan_type: z.string().min(1, "Choose a starting point"),
  cuisine_style: z.string().trim().max(200, "Keep under 200 characters").optional(),
  dietary_restrictions: z.string().trim().max(300, "Keep under 300 characters").optional(),
  wellness_goals: z.string().trim().max(300, "Keep under 300 characters").optional(),
  foods_more_of: z.string().trim().max(300, "Keep under 300 characters").optional(),
  foods_to_avoid: z.string().trim().max(300, "Keep under 300 characters").optional(),
  days_count: z.number().int().min(1, "At least 1 day").max(30, "Up to 30 days"),
  grocery_list: z.boolean(),
  hosting_menu: z.boolean(),
});

export const Route = createFileRoute("/_authenticated/bring-this-home")({
  head: () => ({
    meta: [
      { title: "Bring This Home — Colorfull" },
      {
        name: "description",
        content:
          "Share what stayed with you and request a personalized meal plan inspired by your Colorfull table.",
      },
    ],
  }),
  validateSearch: zodValidator(searchSchema),
  component: BringThisHomePage,
});

const LOVED_OPTIONS = [
  "The food",
  "The people",
  "The atmosphere",
  "The conversation",
  "The host",
  "The space",
  "The overall feeling",
];

const AGAIN_OPTIONS = [
  { value: "yes", label: "Yes, I loved it" },
  { value: "maybe", label: "Maybe, with some changes" },
  { value: "no", label: "Not my style" },
];

const PLAN_OPTIONS = [
  "Mediterranean reset",
  "Anti-inflammatory meal plan",
  "Gut-friendly plan",
  "High-protein plan",
  "Family-style weekly plan",
  "Dinner-party hosting menu",
  "Date-night menu",
  "Grocery list plan",
  "Custom plan inspired by this table",
];

function BringThisHomePage() {
  const { user } = useAuth();
  const { table: tableId } = Route.useSearch();
  const navigate = useNavigate();
  const table = tableId ? TABLES.find((t) => t.id === tableId) : undefined;

  const [loved, setLoved] = useState<string[]>([]);
  const [again, setAgain] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [plan, setPlan] = useState({
    plan_type: "",
    cuisine_style: "",
    dietary_restrictions: "",
    wellness_goals: "",
    foods_more_of: "",
    foods_to_avoid: "",
    days_count: 7,
    grocery_list: false,
    hosting_menu: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleLoved = (opt: string) =>
    setLoved((p) => (p.includes(opt) ? p.filter((x) => x !== opt) : [...p, opt]));

  const submitFeedback = async () => {
    if (!user) return;
    if (loved.length === 0 && !again) {
      toast.error("Tell us a little about how the table felt.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("table_feedback").insert({
      user_id: user.id,
      table_id: tableId ?? "unspecified",
      loved,
      would_eat_again: again || null,
      notes: notes || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't save your reflection. Please try again.");
      return;
    }
    setFeedbackSaved(true);
    toast.success("Thank you — your reflection is saved.");
    document.getElementById("bring-home")?.scrollIntoView({ behavior: "smooth" });
  };

  const submitMealPlan = async () => {
    if (!user) return;
    const parsed = planSchema.safeParse(plan);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString();
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error(fieldErrors.plan_type ?? "Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { error } = await supabase.from("meal_plan_requests").insert({
      user_id: user.id,
      table_id: tableId ?? null,
      ...parsed.data,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't send your request. Please try again.");
      return;
    }
    void logFormSubmission({
      source: "meal_plan_request",
      email: user.email ?? null,
      location: tableId ?? null,
      notes: [parsed.data.wellness_goals, parsed.data.dietary_restrictions, parsed.data.foods_to_avoid]
        .filter(Boolean)
        .join(" · ") || null,
      payload: {
        plan_type: parsed.data.plan_type,
        days_count: parsed.data.days_count,
        hosting_menu: parsed.data.hosting_menu,
        grocery_list: parsed.data.grocery_list,
      },
    });
    toast.success("Your meal plan request is in. We'll be in touch.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 text-primary">
            <ColorfullMark className="h-8 w-8" />
            <span className="brand-wordmark text-[15px] leading-none">Colorfull</span>
          </div>
          <p className="eyebrow mt-8">After the table</p>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl leading-tight">
            How did the table feel?
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm md:text-base text-muted-foreground">
            Tell us what stayed with you so we can help curate more meaningful tables
            and personalized food experiences for you.
          </p>
          {table && (
            <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Reflecting on · {table.title}
            </p>
          )}
        </div>
      </section>

      {/* Feedback */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-sm border border-border bg-card p-8 md:p-10 shadow-sm">
          <p className="eyebrow">Reflection</p>
          <h2 className="mt-3 font-serif text-2xl md:text-3xl">
            What did you love most about the experience?
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {LOVED_OPTIONS.map((opt) => {
              const active = loved.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleLoved(opt)}
                  className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.16em] transition-colors ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:border-foreground"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <h3 className="mt-10 font-serif text-xl md:text-2xl">
            Would you eat this style of food again?
          </h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {AGAIN_OPTIONS.map((o) => {
              const active = again === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setAgain(o.value)}
                  className={`rounded-sm border p-4 text-left text-sm transition-colors ${
                    active
                      ? "border-foreground bg-secondary/60"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>

          <div className="mt-8">
            <label className="eyebrow">Anything else worth remembering?</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="A dish, a story, a moment…"
              className="mt-3 w-full rounded-sm border border-border bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={submitFeedback}
              disabled={submitting || feedbackSaved}
              className="inline-flex h-11 items-center border border-foreground px-6 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background disabled:opacity-50"
            >
              {feedbackSaved ? "Saved ✓" : "Save reflection"}
            </button>
          </div>
        </div>
      </section>

      {/* Bring this home CTA */}
      <section id="bring-home" className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="eyebrow">A taste, taken home</p>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl">Bring This Home</h2>
          <p className="mx-auto mt-5 max-w-xl text-sm md:text-base text-muted-foreground">
            Loved what you ate? Request a personalized meal plan inspired by this table —
            crafted around the flavors, rhythm and feeling you just experienced.
          </p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-10 inline-flex h-12 items-center bg-foreground px-8 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
            >
              Request a Meal Plan
            </button>
          )}
        </div>
      </section>

      {/* Meal plan form */}
      {showForm && (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-sm border border-border bg-card p-8 md:p-10 shadow-sm">
            <p className="eyebrow">Your plan</p>
            <h3 className="mt-3 font-serif text-2xl md:text-3xl">
              Tell us how you like to eat.
            </h3>

            <div className="mt-8">
              <label className="eyebrow">Choose a starting point</label>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PLAN_OPTIONS.map((p) => {
                  const active = plan.plan_type === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlan({ ...plan, plan_type: p })}
                      className={`rounded-sm border p-3 text-left text-sm transition-colors ${
                        active
                          ? "border-foreground bg-secondary/60"
                          : "border-border hover:border-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              {errors.plan_type && (
                <p className="mt-2 text-xs text-destructive">{errors.plan_type}</p>
              )}
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <Field
                label="Cuisine style you enjoyed"
                value={plan.cuisine_style}
                onChange={(v) => setPlan({ ...plan, cuisine_style: v })}
                placeholder="Coastal Mediterranean, Levantine…"
                error={errors.cuisine_style}
                maxLength={200}
              />
              <Field
                label="Dietary restrictions or allergies"
                value={plan.dietary_restrictions}
                onChange={(v) => setPlan({ ...plan, dietary_restrictions: v })}
                placeholder="Gluten-free, no shellfish…"
                error={errors.dietary_restrictions}
                maxLength={300}
              />
              <Field
                label="Health or wellness goals"
                value={plan.wellness_goals}
                onChange={(v) => setPlan({ ...plan, wellness_goals: v })}
                placeholder="Anti-inflammatory, energy, sleep…"
                error={errors.wellness_goals}
                maxLength={300}
              />
              <Field
                label="Foods you want more of"
                value={plan.foods_more_of}
                onChange={(v) => setPlan({ ...plan, foods_more_of: v })}
                placeholder="Leafy greens, omega-3s…"
                error={errors.foods_more_of}
                maxLength={300}
              />
              <Field
                label="Foods you want to avoid"
                value={plan.foods_to_avoid}
                onChange={(v) => setPlan({ ...plan, foods_to_avoid: v })}
                placeholder="Refined sugar, dairy…"
                error={errors.foods_to_avoid}
                maxLength={300}
              />
              <div>
                <label className="eyebrow">How many days of meals?</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={plan.days_count}
                  onChange={(e) =>
                    setPlan({ ...plan, days_count: Number(e.target.value) || 1 })
                  }
                  className="mt-3 w-full rounded-sm border border-border bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                />
                {errors.days_count && (
                  <p className="mt-2 text-xs text-destructive">{errors.days_count}</p>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Toggle
                label="Include a grocery list"
                value={plan.grocery_list}
                onChange={(v) => setPlan({ ...plan, grocery_list: v })}
              />
              <Toggle
                label="Include a hosting menu"
                value={plan.hosting_menu}
                onChange={(v) => setPlan({ ...plan, hosting_menu: v })}
              />
            </div>

            <p className="mt-8 text-xs text-muted-foreground">
              Our team will craft your plan by hand. Soon, plans will be personalized by
              AI using your tastes, wellness goals and Colorfull compatibility profile.
            </p>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                to="/dashboard"
                className="inline-flex h-11 items-center justify-center text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
              >
                Maybe later
              </Link>
              <button
                onClick={submitMealPlan}
                disabled={submitting}
                className="inline-flex h-12 items-center justify-center bg-foreground px-8 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send my request"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="eyebrow">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`mt-3 w-full rounded-sm border bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground ${
          error ? "border-destructive" : "border-border"
        }`}
      />
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center justify-between rounded-sm border p-4 text-left text-sm transition-colors ${
        value ? "border-foreground bg-secondary/60" : "border-border hover:border-foreground"
      }`}
    >
      <span>{label}</span>
      <span
        className={`text-[11px] uppercase tracking-[0.22em] ${
          value ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {value ? "Yes" : "No"}
      </span>
    </button>
  );
}
