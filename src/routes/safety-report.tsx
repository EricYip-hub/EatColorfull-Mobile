import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/safety-report")({
  head: () => ({
    meta: [
      { title: "Report a Food Safety or Safety Concern — Colorfull" },
      { name: "description", content: "Report a food safety, illness, injury, allergy, or other safety concern related to a Colorfull experience." },
    ],
  }),
  component: SafetyReportPage,
});

function SafetyReportPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    const filtered = list.filter((f) => {
      if (f.size > 20 * 1024 * 1024) {
        setError(`"${f.name}" is larger than 20MB and was skipped.`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...filtered].slice(0, 10));
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, any> = {};
    fd.forEach((v, k) => {
      payload[k] = typeof v === "string" ? v : (v as File).name;
    });

    try {
      // Upload attachments first, if any
      const uploaded: { name: string; path: string; size: number; type: string }[] = [];
      if (files.length > 0) {
        const folder = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}`;
        for (const file of files) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${folder}/${safeName}`;
          const { error: upErr } = await supabase.storage
            .from("safety-report-attachments")
            .upload(path, file, { contentType: file.type || undefined, upsert: false });
          if (upErr) throw upErr;
          uploaded.push({ name: file.name, path, size: file.size, type: file.type });
        }
        payload.attachments = uploaded;
      }

      const { error: insertErr } = await supabase.from("form_submissions").insert({
        source: "safety_report",
        name: String(fd.get("name") || "") || null,
        email: String(fd.get("email") || "") || null,
        phone: String(fd.get("phone") || "") || null,
        notes: String(fd.get("description") || "") || null,
        payload,
      });
      if (insertErr) throw insertErr;
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Could not submit. Please email safety@eatcolorfull.com directly.");
    } finally {
      setSubmitting(false);
    }
  }


  if (submitted) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="eyebrow">Report received</p>
        <h1 className="mt-3 font-serif text-4xl">Thank you for letting us know.</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Our team will review your report and follow up if you've granted permission. For urgent
          medical concerns, please contact your healthcare provider or call 911. You may also
          report directly to your local environmental health agency.
        </p>
      </section>
    );
  }

  return (
    <article className="mx-auto max-w-2xl px-6 py-20">
      <p className="eyebrow">Safety</p>
      <h1 className="mt-3 font-serif text-4xl">Report a Food Safety or Safety Concern</h1>
      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
        If you experienced a food safety issue, illness, injury, allergy concern, unsafe condition,
        or other safety matter related to a <span className="brand-wordmark">Colorfull</span> experience, please submit the details
        below. Guests may also report concerns directly to the applicable local environmental
        health agency.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <Row><F label="Name"><input name="name" required className="i" /></F><F label="Email"><input name="email" type="email" required className="i" /></F></Row>
        <Row><F label="Phone"><input name="phone" className="i" /></F><F label="Event date"><input name="event_date" type="date" className="i" /></F></Row>
        <F label="Event name"><input name="event_name" className="i" /></F>
        <F label="Host or chef name"><input name="host_chef_name" className="i" /></F>
        <F label="Food consumed"><textarea name="food_consumed" rows={2} className="i" /></F>
        <F label="Description of concern"><textarea name="description" rows={5} required className="i" /></F>
        <F label="Symptoms or injury, if any"><textarea name="symptoms" rows={3} className="i" /></F>
        <Row>
          <F label="Did you receive medical care?">
            <select name="medical_care" className="i" defaultValue="">
              <option value="" disabled>Select…</option>
              <option>No</option>
              <option>Yes — outpatient</option>
              <option>Yes — emergency / hospitalized</option>
              <option>Prefer not to say</option>
            </select>
          </F>
          <F label="May Colorfull follow up with you?">
            <select name="follow_up_permission" className="i" required defaultValue="">
              <option value="" disabled>Select…</option>
              <option>Yes</option>
              <option>No</option>
            </select>
          </F>
        </Row>
        <F label="Photos or supporting documents (optional — up to 10 files, 20MB each)">
          <div className="mt-2 space-y-2">
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.txt,.heic"
              onChange={onFilesSelected}
              className="block w-full text-sm file:mr-4 file:border file:border-foreground/20 file:bg-background file:px-3 file:py-2 file:text-[11px] file:uppercase file:tracking-[0.18em] file:text-foreground hover:file:bg-foreground hover:file:text-background"
            />
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 border border-foreground/10 bg-background px-3 py-2 text-xs">
                    <span className="truncate">
                      {f.name}
                      <span className="ml-2 text-muted-foreground">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </F>


        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit report"}
        </button>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          For urgent medical emergencies, call 911. You may also email safety@eatcolorfull.com.
        </p>

        <style>{`.i{margin-top:.5rem;height:2.75rem;width:100%;border:1px solid var(--color-border);background:var(--color-background);padding:0 .75rem;font-size:.875rem;outline:none;}textarea.i{height:auto;padding:.75rem;line-height:1.5;}.i:focus{border-color:var(--color-foreground);}`}</style>
      </form>
    </article>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 md:grid-cols-2">{children}</div>;
}
