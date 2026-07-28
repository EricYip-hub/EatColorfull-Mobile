import { supabase } from "@/integrations/supabase/client";

export type FormSubmissionSource =
  | "signup"
  | "host_application"
  | "guest_application"
  | "tastemaker_application"
  | "rsvp_irie"
  | "rsvp_event"
  | "meal_prep_request"
  | "meal_plan_request"
  | "join_request"
  | "order_molino"
  | "contact";

export type FormSubmissionInput = {
  source: FormSubmissionSource;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  notes?: string | null;
  payload?: Record<string, unknown>;
};

/**
 * Best-effort fire-and-forget log of any form submission to the
 * `form_submissions` admin audit table. Failures are swallowed so they
 * never block the user's actual submission flow.
 */
export async function logFormSubmission(input: FormSubmissionInput): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("form_submissions").insert({
      source: input.source,
      user_id: userData.user?.id ?? null,
      name: input.name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      payload: (input.payload ?? {}) as never,
    });
  } catch (err) {
    console.warn("[logFormSubmission] failed", err);
  }
}

/**
 * Submit an application via SECURITY DEFINER RPC and return the new
 * submission id so the applicant can be sent to a status page.
 */
export async function submitApplication(input: FormSubmissionInput): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("submit_application_form", {
      _source: input.source,
      _name: input.name ?? "",
      _email: input.email ?? "",
      _phone: input.phone ?? "",
      _location: input.location ?? "",
      _notes: input.notes ?? "",
      _payload: (input.payload ?? {}) as never,
    });
    if (error) throw error;
    return (data as string) ?? null;
  } catch (err) {
    console.warn("[submitApplication] failed", err);
    return null;
  }
}
