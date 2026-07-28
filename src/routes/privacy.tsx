import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Colorfull" },
      { name: "description", content: "How Colorfull collects, uses, and protects your information." },
    ],
  }),
  component: PrivacyPage,
});

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 font-serif text-2xl text-foreground">{children}</h2>;
}

function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 font-serif text-5xl">Privacy Policy</h1>
      <div className="mt-10 space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          <span className="brand-wordmark">Colorfull</span> does not sell personal information. We may use information to operate the
          platform, process applications and bookings, communicate with users, improve services,
          prevent fraud, comply with law, and market <span className="brand-wordmark">Colorfull</span> experiences where permitted.
        </p>

        <H2>Information we collect</H2>
        <p>Application information, booking and payment information, communications, and event content you submit.</p>

        <H2>Application information</H2>
        <p>
          Name, contact details, location, references, and the responses you provide when applying
          to attend or host.
        </p>

        <H2>Booking and payment information</H2>
        <p>
          Reservation details, transaction records, and the payment details processed by our
          payment providers. We do not store full card numbers.
        </p>

        <H2>Communications</H2>
        <p>
          Email and message content between guests, hosts, and the <span className="brand-wordmark">Colorfull</span> team for booking,
          coordination, and support.
        </p>

        <H2>SMS and email consent</H2>
        <p>
          By providing your phone number or email, you consent to receive booking, reminder,
          confirmation, and account messages. You can opt out of marketing at any time via the
          unsubscribe link or by writing to privacy@eatcolorfull.com. Message and data rates may
          apply.
        </p>

        <H2>Photos, videos, and event content</H2>
        <p>
          Photos and videos captured at events, including those submitted by hosts, chefs, partners,
          and guests, may be used to operate and market the platform subject to this policy.
        </p>

        <H2>Cookies and analytics</H2>
        <p>
          We use cookies and analytics tools to understand traffic, improve the product, and detect
          fraud.
        </p>

        <H2>Service providers</H2>
        <p>
          We share information with payment processors, email and SMS providers, hosting and
          analytics providers strictly to operate the platform.
        </p>

        <H2>How we use information</H2>
        <p>
          To operate the platform, process applications and bookings, communicate with users,
          improve services, prevent fraud, comply with law, and market <span className="brand-wordmark">Colorfull</span> experiences where
          permitted.
        </p>

        <H2>How we share information</H2>
        <p>
          With hosts and guests as needed to coordinate experiences, with service providers under
          contract, and where required by law.
        </p>

        <H2>No sale of personal information</H2>
        <p>
          <span className="brand-wordmark">Colorfull</span> does not sell, rent, license, or monetize your personal information.
          <span className="brand-wordmark"> Colorfull</span> may use host profiles, event-related content, submitted materials, and
          approved photos or videos to operate, market, promote, and improve the platform, subject
          to this Privacy Policy and applicable law.
        </p>

        <H2>California privacy rights</H2>
        <p>
          California residents may request access to, correction of, or deletion of personal
          information, and may opt out of certain sharing. Contact privacy@eatcolorfull.com.
        </p>

        <H2>Data deletion requests</H2>
        <p>
          Email privacy@eatcolorfull.com and we will respond within a reasonable timeframe.
        </p>

        <H2>Data retention</H2>
        <p>
          We retain information for as long as needed to provide the service, comply with legal
          obligations, resolve disputes, and enforce our agreements.
        </p>

        <H2>Security disclaimer</H2>
        <p>
          We use reasonable safeguards but no system is perfectly secure. Notify us immediately of
          any suspected unauthorized access.
        </p>

        <H2>Children and minors</H2>
        <p>
          <span className="brand-wordmark">Colorfull</span> is intended for adults. We do not knowingly collect personal information
          from individuals under 18.
        </p>

        <H2>Private addresses</H2>
        <p>
          Exact host addresses are revealed only to approved guests, no earlier than 48 hours before
          the experience.
        </p>

        <H2>Contact</H2>
        <p>
          privacy@eatcolorfull.com · legal@eatcolorfull.com · support@eatcolorfull.com
        </p>

        <p className="pt-6 text-xs">Last updated: June 2026.</p>
      </div>
    </article>
  );
}
