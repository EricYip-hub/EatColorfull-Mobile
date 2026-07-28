import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  photos: string[];
  alt: string;
  aspectClassName?: string;
  rounded?: string;
  fallback?: React.ReactNode;
};

export function ListingPhotoCarousel({
  photos,
  alt,
  aspectClassName = "aspect-[4/3]",
  rounded = "",
  fallback,
}: Props) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    setCount(embla.scrollSnapList().length);
    embla.on("select", onSelect);
    embla.on("reInit", () => {
      setCount(embla.scrollSnapList().length);
      onSelect();
    });
    onSelect();
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  if (!photos || photos.length === 0) {
    return (
      <div className={cn("w-full overflow-hidden bg-muted", aspectClassName, rounded)}>
        {fallback}
      </div>
    );
  }

  const showControls = photos.length > 1;

  return (
    <div className={cn("relative w-full overflow-hidden bg-muted", aspectClassName, rounded)}>
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {photos.map((src, i) => (
            <div key={`${src}-${i}`} className="relative h-full min-w-0 flex-[0_0_100%]">
              <img
                src={src}
                alt={`${alt} — photo ${i + 1} of ${photos.length}`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {showControls && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              embla?.scrollPrev();
            }}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/65 group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              embla?.scrollNext();
            }}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/65 group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {Array.from({ length: count }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full bg-white/90 transition-all",
                  i === selected ? "w-4" : "w-1.5 bg-white/55",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
