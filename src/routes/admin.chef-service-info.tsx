import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/chef-service-info")({
  component: AdminChefServiceInfo,
});

const SLUG = "moshe-fhima";

function AdminChefServiceInfo() {
  const [firstUse, setFirstUse] = useState("");
  const [firstInterstate, setFirstInterstate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("chef_service_info")
      .select("first_use_date, first_interstate_use_date")
      .eq("chef_slug", SLUG)
      .maybeSingle()
      .then(({ data }) => {
        setFirstUse(data?.first_use_date ?? "");
        setFirstInterstate(data?.first_interstate_use_date ?? "");
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("chef_service_info")
      .upsert({
        chef_slug: SLUG,
        first_use_date: firstUse || null,
        first_interstate_use_date: firstInterstate || null,
      });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Saved.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-serif text-3xl">Chef Service Info — Moshe Fhima</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Edit first-use dates shown on the public chef page for trademark
        verification.
      </p>
      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-8 space-y-5 rounded-2xl border border-foreground/10 bg-card p-6">
          <div>
            <Label>First date of use</Label>
            <Input
              type="date"
              value={firstUse}
              onChange={(e) => setFirstUse(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>First interstate use date (if applicable)</Label>
            <Input
              type="date"
              value={firstInterstate}
              onChange={(e) => setFirstInterstate(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}
