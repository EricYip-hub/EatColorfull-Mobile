import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Colorfull" },
      { name: "description", content: "Terms governing your use of the Colorfull platform." },
    ],
  }),
  component: TermsPage,
});

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 font-serif text-2xl text-foreground">{children}</h2>;
}

function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 font-serif text-5xl">Terms of Service</h1>
      <div className="mt-10 space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          <span className="brand-wordmark">Colorfull</span> is a curated hospitality and community platform that facilitates
          discovery, application, and booking between independent hosts, chefs, caterers, venues,
          permitted home kitchen operators, and other legally authorized providers and their guests.
          <span className="brand-wordmark"> Colorfull</span> is not a restaurant, caterer, kitchen operator, alcohol vendor, or food service provider.
        </p>

        <H2>Independent hosts and providers</H2>
        <p>
          Hosts and providers on <span className="brand-wordmark">Colorfull</span> are independent operators solely responsible for
          compliance with all applicable food, health, permitting, zoning, business licensing,
          alcohol, tax, insurance, and safety requirements in their jurisdiction.
        </p>

        <H2>Guest responsibility</H2>
        <p>
          Guests acknowledge that experiences take place at private residences, third-party venues,
          restaurants, commercial kitchens, permitted home kitchens, or other locations operated by
          independent providers. Guests are responsible for disclosing allergies, dietary
          restrictions, medical conditions, and sensitivities prior to attending.
        </p>

        <H2>Allergy and dietary disclaimer</H2>
        <p>
          Unless expressly stated in the event description, <span className="brand-wordmark">Colorfull</span> does not represent that any
          experience is kosher, halal, vegan, vegetarian, gluten-free, organic, allergen-free,
          medically appropriate, or free from cross-contamination.
        </p>

        <H2>No background checks or audits</H2>
        <p>
          Unless expressly stated in writing, <span className="brand-wordmark">Colorfull</span> does not conduct criminal background
          checks, credit checks, health inspections, permit inspections, insurance audits, or legal
          compliance audits. Application review does not constitute a background check, safety
          certification, legal approval, permit verification, or insurance guarantee.
        </p>

        <H2>Alcohol policy</H2>
        <p>
          Alcohol may not be sold, served, included, promoted, or distributed at any
          <span className="brand-wordmark"> Colorfull</span> experience unless legally permitted and approved in writing. Guests must
          be 21 or older with valid government-issued identification for any experience where
          alcohol is present. Hosts are solely responsible for complying with all alcohol-related
          laws, permits, insurance, and safety requirements.
        </p>

        <H2>Private addresses and event details</H2>
        <p>
          Exact addresses may be shared only after approval, confirmation, and/or booking. Guests
          may not publish, screenshot, sell, disclose, misuse, or share private addresses, host
          contact information, guest lists, or event details.
        </p>

        <H2>Curation and approval</H2>
        <p>
          Not every applicant is approved. <span className="brand-wordmark">Colorfull</span> reserves the right to decline any host or
          guest application or booking request at our sole discretion to maintain the integrity of
          the community.
        </p>

        <H2>Payments, cancellations, and modifications</H2>
        <p>
          Bookings are confirmed only after host approval and successful payment.
          <span className="brand-wordmark"> Colorfull</span> may cancel, remove, suspend, or modify any experience, reservation,
          listing, host, guest, or account at any time for safety, legal, compliance, host, venue,
          illness, payment, fraud, insurance, permitting, weather, operational, or community
          concerns.
        </p>
        <p>
          Because experiences may involve limited seating, ingredient purchases, chef preparation,
          and private venue arrangements, some reservations may be non-refundable after the stated
          cancellation cutoff.
        </p>

        <H2>Photo and video release</H2>
        <p>
          By attending a <span className="brand-wordmark">Colorfull</span> experience, guests understand that photos or videos may be
          captured by <span className="brand-wordmark">Colorfull</span>, hosts, chefs, approved partners, or other guests. Guests grant
          <span className="brand-wordmark"> Colorfull</span> permission to use approved event photos, videos, name, likeness, voice,
          testimonials, and submitted content for website, app, social media, marketing, press,
          investor, and promotional purposes. Guests who do not wish to be photographed should
          notify <span className="brand-wordmark">Colorfull</span> before the event and avoid designated photo/video areas.
        </p>

        <H2>Contact</H2>
        <p>
          legal@eatcolorfull.com · support@eatcolorfull.com · safety@eatcolorfull.com
        </p>

        <p className="pt-6 text-xs">Last updated: June 2026.</p>
      </div>
    </article>
  );
}
