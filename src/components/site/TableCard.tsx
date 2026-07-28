import { Link } from "@tanstack/react-router";
import type { Table } from "@/lib/tables-data";

export function TableCard({ table }: { table: Table }) {
  return (
    <article className="group flex h-full w-full flex-col">
      <Link
        to="/tables/$tableId"
        params={{ tableId: table.id }}
        className="block overflow-hidden bg-muted"
      >
        <div className="aspect-[4/5] overflow-hidden">
          <img
            src={table.image}
            alt={table.title}
            loading="lazy"
            style={table.focalPoint ? { objectPosition: table.focalPoint } : undefined}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </div>
      </Link>
      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="eyebrow truncate text-[10px]">{table.archetype}</span>
          <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
            {table.seatsRemaining}/{table.seatsTotal} seats
          </span>
        </div>
        <h3 className="font-serif text-base leading-snug line-clamp-2 min-h-[2.6em]">
          <Link to="/tables/$tableId" params={{ tableId: table.id }} className="hover:underline underline-offset-4">
            {table.title}
          </Link>
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2 min-h-[2.6em]">
          {table.description}
        </p>
        <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
          {table.neighborhood} · {table.date}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
          <span className="font-serif text-sm">${table.price}</span>
          <Link
            to="/tables/$tableId"
            params={{ tableId: table.id }}
            className="text-[9px] uppercase tracking-[0.18em] text-foreground underline underline-offset-[4px] decoration-1 hover:decoration-primary"
          >
            Apply
          </Link>
        </div>
      </div>
    </article>
  );
}
