// Post-dinner review system (frontend prototype).
//
// Guests rate six dimensions after attending a table. Ratings feed an internal
// "Table Score" per host. Strong signals surface elegant public badges; any
// sensitive or negative feedback is routed privately to Colorfull admin for
// review and never shown on a host's public profile.

export type CriterionKey =
  | "food"
  | "ambience"
  | "hostEnergy"
  | "cleanliness"
  | "flow"
  | "wouldReturn";

export const CRITERIA: Array<{
  key: CriterionKey;
  label: string;
  helper: string;
}> = [
  { key: "food", label: "The food", helper: "Taste, intention, craft." },
  { key: "ambience", label: "The room", helper: "Lighting, music, the feel of the space." },
  { key: "hostEnergy", label: "Host energy", helper: "Warmth, presence, hospitality." },
  { key: "cleanliness", label: "Clean & cared for", helper: "Home, table, kitchen, bathroom." },
  { key: "flow", label: "Flow of the night", helper: "Pacing, conversation, arrival to close." },
  { key: "wouldReturn", label: "Would you return?", helper: "Honest gut feeling." },
];

export type Review = {
  id: string;
  tableId: string;
  hostId: string;
  guestName: string;
  attendedOn: string; // date string
  ratings: Record<CriterionKey, number>; // 1–5
  publicNote?: string; // shown publicly (short, edited)
  privateNote?: string; // visible only to Colorfull admin
  flagged?: boolean; // sensitive — needs admin review
  adminReviewed?: boolean;
};

export const BADGES = {
  guestFavorite: {
    key: "guestFavorite",
    label: "Guest Favorite",
    description: "Consistently high ratings across multiple tables.",
  },
  beautifulTable: {
    key: "beautifulTable",
    label: "Beautiful Table",
    description: "Guests called out the room, the light, the styling.",
  },
  exceptionalFood: {
    key: "exceptionalFood",
    label: "Exceptional Food",
    description: "Food consistently rated 4.7+ across recent dinners.",
  },
  warmHost: {
    key: "warmHost",
    label: "Warm Host",
    description: "Guests felt cared for from arrival to close.",
  },
  cleanTrusted: {
    key: "cleanTrusted",
    label: "Clean & Trusted",
    description: "Home and table consistently rated for care.",
  },
  colorfullVerified: {
    key: "colorfullVerified",
    label: "Colorfull Verified",
    description: "Vetted by our team. Consistent quality across the year.",
  },
} as const;

export type BadgeKey = keyof typeof BADGES;

// Mock reviews — enough density to derive scores and badges per host.
export const REVIEWS: Review[] = [
  // Yael Avraham — strong across the board
  { id: "r1", tableId: "mediterranean-west-hollywood", hostId: "yael-avraham", guestName: "Ariella S.", attendedOn: "2026-04-12",
    ratings: { food: 5, ambience: 5, hostEnergy: 5, cleanliness: 5, flow: 5, wouldReturn: 5 },
    publicNote: "I arrived a stranger and left with three real friendships." },
  { id: "r2", tableId: "mediterranean-west-hollywood", hostId: "yael-avraham", guestName: "Jonah R.", attendedOn: "2026-03-22",
    ratings: { food: 5, ambience: 5, hostEnergy: 5, cleanliness: 5, flow: 4, wouldReturn: 5 },
    publicNote: "Quietly the best night I've had this year." },
  { id: "r3", tableId: "mediterranean-west-hollywood", hostId: "yael-avraham", guestName: "Sasha M.", attendedOn: "2026-02-18",
    ratings: { food: 5, ambience: 5, hostEnergy: 5, cleanliness: 5, flow: 5, wouldReturn: 5 } },

  // Marisol — exceptional food + warm host
  { id: "r4", tableId: "heritage-silver-lake", hostId: "marisol-ortega", guestName: "Daniel K.", attendedOn: "2026-04-02",
    ratings: { food: 5, ambience: 4, hostEnergy: 5, cleanliness: 5, flow: 5, wouldReturn: 5 },
    publicNote: "The mole alone was worth the night." },
  { id: "r5", tableId: "heritage-silver-lake", hostId: "marisol-ortega", guestName: "Priya N.", attendedOn: "2026-03-14",
    ratings: { food: 5, ambience: 4, hostEnergy: 5, cleanliness: 5, flow: 4, wouldReturn: 5 } },

  // Rae — beautiful table + clean
  { id: "r6", tableId: "plant-forward-venice", hostId: "rae-lin", guestName: "Marco T.", attendedOn: "2026-04-20",
    ratings: { food: 4, ambience: 5, hostEnergy: 4, cleanliness: 5, flow: 5, wouldReturn: 5 },
    publicNote: "Golden hour, linen, a long quiet table." },
  { id: "r7", tableId: "plant-forward-venice", hostId: "rae-lin", guestName: "Lena F.", attendedOn: "2026-03-30",
    ratings: { food: 4, ambience: 5, hostEnergy: 4, cleanliness: 5, flow: 5, wouldReturn: 4 } },

  // Diego — strong fire, slightly lower cleanliness (outdoor)
  { id: "r8", tableId: "fire-table-malibu", hostId: "diego-marin", guestName: "Eitan B.", attendedOn: "2026-04-05",
    ratings: { food: 5, ambience: 5, hostEnergy: 4, cleanliness: 4, flow: 4, wouldReturn: 5 } },

  // Noa — warm but flagged private note (needs admin)
  { id: "r9", tableId: "shabbat-mid-city", hostId: "noa-becker", guestName: "Talia W.", attendedOn: "2026-04-11",
    ratings: { food: 4, ambience: 5, hostEnergy: 5, cleanliness: 5, flow: 4, wouldReturn: 5 },
    publicNote: "A real Friday night." },
  { id: "r10", tableId: "shabbat-mid-city", hostId: "noa-becker", guestName: "Anonymous", attendedOn: "2026-04-11",
    ratings: { food: 3, ambience: 4, hostEnergy: 3, cleanliness: 4, flow: 3, wouldReturn: 3 },
    privateNote: "Another guest made a comment I found uncomfortable. The host handled it but I want Colorfull to know.",
    flagged: true },
];

// Per-host hand-tuned context: tenure, repeat rate, cancellations, response time.
// These feed the internal Table Score alongside review averages.
export const HOST_SIGNALS: Record<
  string,
  {
    dinnersHosted: number;
    repeatGuestRate: number; // 0–1
    cancellationRate: number; // 0–1, lower is better
    responseHours: number; // average hours to respond
    verified: boolean;
    tenureMonths: number;
  }
> = {
  "yael-avraham": { dinnersHosted: 22, repeatGuestRate: 0.45, cancellationRate: 0.0, responseHours: 3, verified: true, tenureMonths: 14 },
  "marisol-ortega": { dinnersHosted: 18, repeatGuestRate: 0.38, cancellationRate: 0.02, responseHours: 5, verified: true, tenureMonths: 12 },
  "rae-lin": { dinnersHosted: 14, repeatGuestRate: 0.3, cancellationRate: 0.0, responseHours: 4, verified: true, tenureMonths: 9 },
  "diego-marin": { dinnersHosted: 9, repeatGuestRate: 0.22, cancellationRate: 0.05, responseHours: 8, verified: false, tenureMonths: 6 },
  "noa-becker": { dinnersHosted: 16, repeatGuestRate: 0.5, cancellationRate: 0.01, responseHours: 6, verified: true, tenureMonths: 11 },
};

export type HostScore = {
  hostId: string;
  tableScore: number; // 0–100 (internal, can be shown softly)
  reviewCount: number;
  averages: Record<CriterionKey, number>;
  badges: BadgeKey[];
  tier: "Rising" | "Trusted" | "Signature" | "Founding";
  perks: string[];
};

function average(nums: number[]) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

type ReviewLike = {
  hostId: string | null;
  flagged?: boolean;
  ratings: Record<CriterionKey, number | null>;
};

export function computeHostScore(
  hostId: string,
  externalReviews?: ReviewLike[],
): HostScore {
  const sourceReviews: ReviewLike[] =
    externalReviews && externalReviews.length > 0
      ? externalReviews
      : REVIEWS.map((r) => ({ hostId: r.hostId, flagged: r.flagged, ratings: r.ratings }));
  const hostReviews = sourceReviews.filter((r) => r.hostId === hostId && !r.flagged);
  const signals = HOST_SIGNALS[hostId] ?? {
    dinnersHosted: 0, repeatGuestRate: 0, cancellationRate: 0, responseHours: 24, verified: false, tenureMonths: 0,
  };

  const averages = CRITERIA.reduce((acc, c) => {
    const nums = hostReviews
      .map((r) => r.ratings[c.key])
      .filter((n): n is number => typeof n === "number");
    acc[c.key] = Number(average(nums).toFixed(2));
    return acc;
  }, {} as Record<CriterionKey, number>);

  const ratingAvg = average(Object.values(averages).filter((n) => n > 0));
  // Score blend: 70% ratings, 15% repeat guests, 10% reliability, 5% responsiveness.
  const ratingPart = (ratingAvg / 5) * 70;
  const repeatPart = signals.repeatGuestRate * 15;
  const reliabilityPart = (1 - Math.min(1, signals.cancellationRate * 5)) * 10;
  const responsePart = Math.max(0, 1 - signals.responseHours / 24) * 5;
  const tableScore = Math.round(ratingPart + repeatPart + reliabilityPart + responsePart);

  const badges: BadgeKey[] = [];
  if (signals.verified) badges.push("colorfullVerified");
  if (averages.food >= 4.7) badges.push("exceptionalFood");
  if (averages.ambience >= 4.7) badges.push("beautifulTable");
  if (averages.hostEnergy >= 4.7) badges.push("warmHost");
  if (averages.cleanliness >= 4.7) badges.push("cleanTrusted");
  if (ratingAvg >= 4.7 && hostReviews.length >= 3) badges.push("guestFavorite");

  const tier: HostScore["tier"] =
    tableScore >= 92 ? "Founding" : tableScore >= 85 ? "Signature" : tableScore >= 75 ? "Trusted" : "Rising";

  const perks: string[] = [];
  if (tier === "Rising") perks.push("Up to 6 seats", "Standard placement");
  if (tier === "Trusted") perks.push("Up to 8 seats", "Featured in archetype rows", "Verified badge eligible");
  if (tier === "Signature") perks.push("Up to 10 seats", "Priority placement on /discover", "Editorial profile module");
  if (tier === "Founding") perks.push("Up to 12 seats", "Homepage feature rotation", "First access to brand collaborations");

  return { hostId, tableScore, reviewCount: hostReviews.length, averages, badges, tier, perks };
}

export function badgeLabel(key: BadgeKey) {
  return BADGES[key].label;
}
