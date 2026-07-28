export type TastemakerStatus =
  | "pending"
  | "approved"
  | "featured"
  | "host-ready"
  | "collaboration-only"
  | "inactive";

export type TastemakerContent = {
  id: string;
  kind: "photo" | "video" | "recipe" | "story";
  title: string;
  image: string;
  caption?: string;
};

export type Tastemaker = {
  id: string;
  name: string;
  handle: string;
  city: string;
  neighborhood: string;
  avatar: string;
  cover: string;
  shortBio: string;
  philosophy: string;
  cuisineFocus: string[];
  culturalBackground: string;
  wellnessFocus: string;
  signatureDishes: string[];
  gallery: string[];
  reels: { id: string; thumb: string; title: string }[];
  upcomingTableIds: string[];
  pastCollabs: { title: string; detail: string }[];
  mealPlans: { id: string; title: string; days: number; tagline: string }[];
  status: TastemakerStatus;
  featured: boolean;
  hostReady: boolean;
  appliedAt: string;
};

const img = (id: string, q = 80) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=${q}`;

export const TASTEMAKERS: Tastemaker[] = [
  {
    id: "moshe-feema",
    name: "Chef Moshe Fhima",
    handle: "@chef.moshe",
    city: "Los Angeles",
    neighborhood: "Beverly Grove",
    avatar: "/__l5e/assets-v1/db2f6438-acb3-4c4d-b0db-110ed609ab7b/moshe-fhima.jpg",
    cover: img("photo-1498579150354-977475b7ea0b"),
    shortBio:
      "Italian-trained chef hosting his first Colorfull table — a candlelit Italian night of handmade pasta and shared bottles.",
    philosophy: "Italian cooking is patience disguised as simplicity.",
    cuisineFocus: ["Italian", "Handmade pasta", "Coastal"],
    culturalBackground: "Israeli-born, trained in Northern Italy.",
    wellnessFocus: "Slow food, whole grains, real olive oil, nothing rushed.",
    signatureDishes: [
      "Hand-rolled cacio e pepe",
      "Slow-braised osso buco",
      "Lemon olive oil cake",
    ],
    gallery: [
      img("photo-1498579150354-977475b7ea0b"),
      img("photo-1473093295043-cdd812d0e601"),
      img("photo-1551183053-bf91a1d81141"),
      img("photo-1525755662778-989d0524087e"),
      img("photo-1565299624946-b28f40a0ae38"),
      img("photo-1547592180-85f173990554"),
    ],
    reels: [],
    upcomingTableIds: ["italian-night-moshe"],
    pastCollabs: [
      { title: "First Colorfull Table", detail: "Italian Night — debut 2026" },
    ],
    mealPlans: [
      {
        id: "mp-moshe-1",
        title: "A Week in Italy",
        days: 7,
        tagline: "Seven slow dinners from Northern Italy, built for the home cook.",
      },
    ],
    status: "featured",
    featured: true,
    hostReady: true,
    appliedAt: "2026-05-20",
  },
  {
    id: "vince-macintosh",
    name: "Chef Vince McIntosh",
    handle: "@chef.vince",
    city: "Los Angeles",
    neighborhood: "Marina del Rey",
    avatar: "/__l5e/assets-v1/1659e597-8d1a-49fe-af9e-4d0b27be7aa3/vince-macintosh.jpg",
    cover: img("photo-1504674900247-0877df9cc836"),
    shortBio:
      "Jamaican-American chef hosting a sunset rooftop dinner in Marina del Rey — culture, community, and bold island flavor.",
    philosophy: "Let's make the world better than we found it.",
    cuisineFocus: ["Jamaican", "Caribbean", "Community-led"],
    culturalBackground:
      "Jamaican-American, raised in a family where the table was culture, love, and gathering.",
    wellnessFocus: "Whole ingredients, bold spice, slow-built flavor.",
    signatureDishes: [
      "Jerk-spiced short rib",
      "Escovitch snapper",
      "Rum-glazed plantain",
    ],
    gallery: [
      img("photo-1504674900247-0877df9cc836"),
      img("photo-1467003909585-2f8a72700288"),
      img("photo-1547592180-85f173990554"),
      img("photo-1490645935967-10de6ba17061"),
      img("photo-1543353071-873f17a7a088"),
      img("photo-1604329760661-e71dc83f8f26"),
    ],
    reels: [],
    upcomingTableIds: ["rooftop-vince"],
    pastCollabs: [
      {
        title: "First Restaurant — Grand Rapids",
        detail: "Opened at 18 with no roadmap, just faith.",
      },
      {
        title: "Marina del Rey Rooftop Dinner",
        detail: "Wednesday, June 3, 2026 — 17 seats, 21 Union Jack",
      },
    ],
    mealPlans: [
      {
        id: "mp-vince-1",
        title: "A Week of Island Flavor",
        days: 7,
        tagline: "Seven Jamaican-rooted dinners built for the home cook.",
      },
    ],
    status: "featured",
    featured: true,
    hostReady: true,
    appliedAt: "2026-05-28",
  },
  {
    id: "richie-million-jr",
    name: "Chef Richie Million Jr.",
    handle: "@chef.richie",
    city: "Los Angeles",
    neighborhood: "West Hollywood",
    avatar: "/__l5e/assets-v1/6fa7dbc8-4e1e-497b-94a1-2a94a0ab0910/richie-million-jr.jpg",
    cover: "/__l5e/assets-v1/585d7c12-057e-408a-8c66-523fe68a9584/steak-fries.jpg",
    shortBio:
      "Philly-born, LA-based celebrity private chef hosting an intimate Colorfull communal dining experience in West Hollywood.",
    philosophy: "Life is a journey. Enjoy every day.",
    cuisineFocus: ["American", "Clean", "Soulful"],
    culturalBackground:
      "Philadelphia-born, Los Angeles-based. Self-taught celebrity private chef.",
    wellnessFocus: "Clean, intentional ingredients. Honest, generous cooking.",
    signatureDishes: [
      "New York Steak with Yukon Gold potatoes and honey caramelized carrots",
      "Honey Dijon Salmon with sweet potato purée",
      "Lemon butter asparagus",
    ],
    gallery: [
      "/__l5e/assets-v1/f1ba0a22-6d2e-4ad3-8315-922bf170163c/steak.jpg",
      "/__l5e/assets-v1/f913b05b-5829-4ae9-8029-a876cd5c4b07/salmon.jpg",
      "/__l5e/assets-v1/c38c3852-1c4a-4c1a-a1c4-cafca22cd38f/richie-hero.jpg",
      img("photo-1467003909585-2f8a72700288"),
    ],
    reels: [],
    upcomingTableIds: [],
    pastCollabs: [
      {
        title: "A Night with Richie Million Jr.",
        detail: "Tuesday, June 2, 2026 — West Hollywood communal dining",
      },
    ],
    mealPlans: [],
    status: "featured",
    featured: true,
    hostReady: true,
    appliedAt: "2026-06-02",
  },
];


export const TASTEMAKER_STATUS_LABEL: Record<TastemakerStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  featured: "Featured",
  "host-ready": "Host-ready",
  "collaboration-only": "Collaboration only",
  inactive: "Inactive",
};

export function getTastemaker(id: string) {
  return TASTEMAKERS.find((t) => t.id === id);
}

export const FEATURED_TASTEMAKERS = TASTEMAKERS.filter((t) => t.featured);
