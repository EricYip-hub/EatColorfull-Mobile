import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community Standards — Colorfull" },
      { name: "description", content: "How we behave at the table." },
    ],
  }),
  component: CommunityPage,
});

const PRINCIPLES = [
  { t: "Show up on time, or not at all.", b: "Late arrivals disrupt the room. If you can't make it, tell your host as early as possible." },
  { t: "Treat the home as a guest, not a customer.", b: "These are private spaces. Respect the host, the room, and the other guests." },
  { t: "Be present.", b: "Phones down at the table. The conversation is the experience." },
  { t: "Disclose allergies and restrictions in advance.", b: "Hosts cook for the table. Help them cook for you." },
  { t: "Hold what's shared at the table.", b: "Stories shared between guests stay between guests. Photos of others require consent." },
  { t: "Pay your seat, on time.", b: "Approved guests are committing to a small, limited table. Cancellations affect everyone." },
];

const RULES = [
  "No harassment",
  "No discrimination",
  "No threats, violence, or intimidation",
  "No weapons",
  "No illegal drugs or illegal activity",
  "No unauthorized alcohol sales, service, or promotion",
  "No unsafe food practices",
  "No bringing extra guests without approval",
  "No filming or photographing others without consent",
  "No sharing, publishing, or misusing private addresses or event details",
  "No damaging property",
  "No off-platform payment or booking circumvention",
  "No impersonation or false information",
];

function CommunityPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <p className="eyebrow">The agreement</p>
      <h1 className="mt-3 font-serif text-5xl">How we behave at the table.</h1>
      <p className="mt-6 text-muted-foreground">
        <span className="brand-wordmark">Colorfull</span> is a small, considered community. These are the things every guest and host
        agrees to before they sit down.
      </p>
      <ol className="mt-12 space-y-10">
        {PRINCIPLES.map((s, i) => (
          <li key={s.t} className="grid grid-cols-[auto_1fr] gap-6">
            <span className="font-serif text-3xl text-muted-foreground">0{i + 1}</span>
            <div>
              <h2 className="font-serif text-2xl">{s.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.b}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-20 border-t border-border pt-12">
        <p className="eyebrow">Community rules</p>
        <h2 className="mt-3 font-serif text-3xl">Behavior that is not permitted.</h2>
        <ul className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {RULES.map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden>·</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          <span className="brand-wordmark">Colorfull</span> may remove, suspend, ban, or report any user for safety, legal,
          compliance, brand, or community reasons.
        </p>
      </section>
    </article>
  );
}
