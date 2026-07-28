import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { getChefEventBySlug } from "@/lib/chef-events.functions";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/e/$slug")({
  loader: async ({ params }) => {
    const event = await getChefEventBySlug({ data: { slug: params.slug } });
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData }) => {
    const e = loaderData?.event;
    const title = e ? `${e.title} — Colorfull` : "Event — Colorfull";
    const desc = e?.description?.slice(0, 160) ?? "A Colorfull pop-up event.";
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
    ];
    if (e?.cover_url) {
      meta.push({ property: "og:image", content: e.cover_url });
      meta.push({ name: "twitter:image", content: e.cover_url });
    }
    return { meta };
  },
  component: EventPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-2xl p-12">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="eyebrow">Not found</p>
      <h1 className="mt-3 font-serif text-4xl">This event link isn't live.</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        It may have been removed, or the link is incorrect.
      </p>
    </div>
  ),
});

function EventPage() {
  const { event } = Route.useLoaderData();
  const slug = event.slug;
  const eventId = event.id;

  useEffect(() => {
    track("invite_view", { slug, eventId });
  }, [slug, eventId]);

  const url =
    typeof window !== "undefined"
      ? window.location.href
      : `https://eatcolorfull.com/e/${slug}`;

  async function handleShare() {
    track("invite_share", { slug, eventId });
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: event.title, url });
      } catch {
        /* user cancelled */
      }
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(url);
    }
  }

  function handleRsvpClick() {
    track("invite_rsvp_click", { slug, eventId });
  }

  const dateLabel = event.event_date
    ? new Date(event.event_date).toLocaleString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const menu = Array.isArray(event.menu) ? (event.menu as any[]) : [];

  return (
    <article>
      {event.cover_url && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted md:aspect-[21/9]">
          <img
            src={event.cover_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <section className="mx-auto max-w-3xl px-6 py-16">
        {event.chef_name && <p className="eyebrow">With {event.chef_name}</p>}
        <h1 className="mt-3 font-serif text-5xl text-balance">{event.title}</h1>
        {dateLabel && (
          <p className="mt-4 text-sm uppercase tracking-[0.22em] text-muted-foreground">
            {dateLabel}
          </p>
        )}
        {event.pickup_address && (
          <p className="mt-2 text-sm text-muted-foreground">{event.pickup_address}</p>
        )}
        {event.description && (
          <p className="mt-8 whitespace-pre-line leading-relaxed text-foreground/90">
            {event.description}
          </p>
        )}

        {menu.length > 0 && (
          <div className="mt-12">
            <p className="eyebrow">Menu</p>
            <ul className="mt-4 divide-y divide-border border-t border-border">
              {menu.map((item, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 py-4">
                  <div>
                    <p className="font-serif text-lg">{item.name}</p>
                    {item.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {typeof item.price === "number" && (
                    <span className="text-sm tabular-nums">${item.price.toFixed(2)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12 flex flex-wrap gap-3">
          <a
            href={`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(`I'd like to reserve for ${event.title}. ${url}`)}`}
            onClick={handleRsvpClick}
            className="inline-flex h-11 items-center bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-foreground/90"
          >
            Reserve / RSVP
          </a>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-11 items-center border border-border px-5 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
          >
            Share
          </button>
        </div>

        <div className="mt-6 border border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
          To reserve, reply to the message you received from the host with the items
          you'd like and your pickup time.
        </div>
      </section>
    </article>
  );
}
