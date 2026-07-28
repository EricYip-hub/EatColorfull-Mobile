import mediterranean from "@/assets/table-mediterranean.jpg";
import heritage from "@/assets/table-heritage.jpg";
import plant from "@/assets/table-plant.jpg";
import fire from "@/assets/table-fire.jpg";
import shabbat from "@/assets/table-shabbat.jpg";
import salon from "@/assets/table-salon.jpg";
import candlelit from "@/assets/table-candlelit.jpg";
import supperclub from "@/assets/table-supperclub.jpg";

export type Table = {
  id: string;
  title: string;
  archetype: string;
  date: string;
  time: string;
  /** ISO 8601 local datetime used for reliable sorting/filtering. */
  startsAt: string;
  neighborhood: string;
  seatsTotal: number;
  seatsRemaining: number;
  hostName: string;
  hostId: string;
  moodTags: string[];
  price: number;
  image: string;
  /** CSS object-position for the hero image. Keep key subjects in frame when
   * the image is cropped to portrait (4:5) thumbnails. Defaults to "50% 50%". */
  focalPoint?: string;
  description: string;
  expect: string[];
  menu: string[];
  guestVibe: string;
  hostNote: string;
};

export const ARCHETYPES = [
  "Heritage Table",
  "Mediterranean Table",
  "Sacred Table",
  "Plant Forward Table",
  "Longevity Table",
  "Fire Table",
  "Sensory Table",
  "Biohacker Table",
  "Creator Table",
  "Music Table",
  "Shabbat Table",
  "Founding Salon",
] as const;

export const TABLES: Table[] = [
  {
    id: "mediterranean-west-hollywood",
    title: "The Mediterranean Table",
    archetype: "Mediterranean Table",
    date: "Saturday, June 14",
    time: "7:30 PM",
    startsAt: "2026-06-14T19:30:00",
    neighborhood: "West Hollywood",
    seatsTotal: 8,
    seatsRemaining: 4,
    hostName: "Yael Avraham",
    hostId: "yael-avraham",
    moodTags: ["Candlelit", "Coastal", "Slow"],
    price: 150,
    image: mediterranean,
    description:
      "A candlelit communal dinner rooted in coastal flavors, storytelling, and slow hospitality. A long table of strangers shares one menu, one room, one evening.",
    expect: [
      "A welcome ritual with citrus and olive",
      "Five hand-plated courses, served family style",
      "Hosted conversation prompts between courses",
      "Natural wine pairings (optional)",
    ],
    menu: [
      "Whipped labneh, za'atar, warm flatbread",
      "Charred eggplant, pomegranate, tahini",
      "Slow-roasted lamb shoulder, preserved lemon",
      "Saffron rice, herb yogurt",
      "Olive oil cake, orange blossom",
    ],
    guestVibe:
      "Curious, warm, and present. Guests who love long conversations and unhurried meals.",
    hostNote:
      "I cook the food my grandmother fed strangers. Come hungry, leave a little changed.",
  },
  {
    id: "heritage-silver-lake",
    title: "The Heritage Table",
    archetype: "Heritage Table",
    date: "Friday, June 20",
    time: "8:00 PM",
    startsAt: "2026-06-20T20:00:00",
    neighborhood: "Silver Lake",
    seatsTotal: 10,
    seatsRemaining: 6,
    hostName: "Marisol Ortega",
    hostId: "marisol-ortega",
    moodTags: ["Family-style", "Storytelling", "Earthy"],
    price: 165,
    image: heritage,
    description:
      "An evening built around recipes carried across borders. Each dish arrives with its memory.",
    expect: [
      "A communal table of 10",
      "Four heritage courses with origin notes",
      "Shared toasts and a guided round of stories",
    ],
    menu: [
      "Heirloom corn tlacoyos",
      "Mole negro, slow-braised pork",
      "Chayote and herb salad",
      "Cinnamon flan",
    ],
    guestVibe: "Open hearts. People who love food with a story.",
    hostNote: "This is the table I grew up at. I'd love for you to join it.",
  },
  {
    id: "plant-forward-venice",
    title: "The Plant Forward Table",
    archetype: "Plant Forward Table",
    date: "Sunday, June 22",
    time: "6:00 PM",
    startsAt: "2026-06-22T18:00:00",
    neighborhood: "Venice",
    seatsTotal: 8,
    seatsRemaining: 3,
    hostName: "Rae Lin",
    hostId: "rae-lin",
    moodTags: ["Bright", "Garden", "Daylight"],
    price: 140,
    image: plant,
    focalPoint: "35% 50%",
    description:
      "A daylight dinner of farm-driven plates, served on a long garden table at golden hour.",
    expect: [
      "A garden welcome with herbal aperitif",
      "Six small plates, all plant-based",
      "Foraged herb pairings",
    ],
    menu: [
      "Stone fruit, basil, sea salt",
      "Charred squash, tahini, sumac",
      "Wild rice, mushroom, herb oil",
      "Fig leaf panna cotta",
    ],
    guestVibe: "Bright, curious, food-led.",
    hostNote: "Eat with the seasons. Sit with strangers. Leave with friends.",
  },
  {
    id: "fire-table-malibu",
    title: "The Fire Table",
    archetype: "Fire Table",
    date: "Saturday, June 28",
    time: "7:00 PM",
    startsAt: "2026-06-28T19:00:00",
    neighborhood: "Malibu",
    seatsTotal: 10,
    seatsRemaining: 5,
    hostName: "Diego Marín",
    hostId: "diego-marin",
    moodTags: ["Open flame", "Smoke", "Dusk"],
    price: 180,
    image: fire,
    description:
      "Cooked entirely over open flame. A ritual dinner around fire, smoke, and shared plates at the edge of the canyon.",
    expect: [
      "Welcome by the fire",
      "Live-fire cooking, served as it comes",
      "Communal seating around a long oak table",
    ],
    menu: [
      "Wood-fired flatbread",
      "Whole grilled fish, herb salsa",
      "Embered carrots, brown butter",
      "Caramelized stone fruit, cream",
    ],
    guestVibe: "Warm, adventurous, present.",
    hostNote: "Fire is the oldest dinner host. We just keep it company.",
  },
  {
    id: "shabbat-mid-city",
    title: "The Shabbat Table",
    archetype: "Shabbat Table",
    date: "Friday, June 27",
    time: "7:00 PM",
    startsAt: "2026-06-27T19:00:00",
    neighborhood: "Mid-City",
    seatsTotal: 8,
    seatsRemaining: 2,
    hostName: "Noa Becker",
    hostId: "noa-becker",
    moodTags: ["Ritual", "Candlelit", "Warm"],
    price: 150,
    image: shabbat,
    focalPoint: "35% 50%",
    description:
      "A traditional Shabbat dinner, opened to a curated table of guests of all backgrounds.",
    expect: [
      "Candle lighting and blessing over wine and challah",
      "Four-course family-style dinner",
      "A slow Friday night",
    ],
    menu: [
      "Homemade challah",
      "Roasted chicken, lemon, olives",
      "Saffron rice with pine nuts",
      "Honey cake",
    ],
    guestVibe: "Reflective, warm, open.",
    hostNote: "Bring yourself, exactly as you are.",
  },
  {
    id: "founding-salon",
    title: "The Founding Salon",
    archetype: "Founding Salon",
    date: "Saturday, July 12",
    time: "7:30 PM",
    startsAt: "2026-07-12T19:30:00",
    neighborhood: "Hollywood Hills",
    seatsTotal: 12,
    seatsRemaining: 7,
    hostName: "Colorfull",
    hostId: "colorfull",
    moodTags: ["Founding", "Curated", "Intimate"],
    price: 150,
    image: salon,
    focalPoint: "25% 50%",
    description:
      "An intimate first table for the Colorfull community. A curated evening of food, conversation, culture, and connection.",
    expect: [
      "A curated guest list",
      "A multi-course tasting from a guest chef",
      "A guided dialogue on what we want from a table",
    ],
    menu: ["A surprise menu, built around the season"],
    guestVibe: "Founding members of the community.",
    hostNote: "You are the first table. Thank you for sitting with us.",
  },
  {
    id: "candlelit-arts-district",
    title: "The Candlelit Table",
    archetype: "Sensory Table",
    date: "Thursday, July 3",
    time: "8:00 PM",
    startsAt: "2026-07-03T20:00:00",
    neighborhood: "Arts District",
    seatsTotal: 10,
    seatsRemaining: 5,
    hostName: "Ines Moreau",
    hostId: "ines-moreau",
    moodTags: ["Candlelit", "Tasting", "Slow"],
    price: 175,
    image: candlelit,
    focalPoint: "50% 70%",
    description:
      "A long candlelit tasting built around small, hand-plated courses, served slowly across one quiet evening.",
    expect: [
      "A candle-lit welcome",
      "Seven small courses",
      "Wine pairings (optional)",
    ],
    menu: [
      "Hamachi crudo, citrus, chili",
      "Charred greens, anchovy",
      "Caesar, aged parmesan",
      "Olive oil cake",
    ],
    guestVibe: "Quiet, curious, present.",
    hostNote: "Come for the candles. Stay for the third course.",
  },
  {
    id: "supper-club-downtown",
    title: "The Supper Club",
    archetype: "Creator Table",
    date: "Saturday, July 19",
    time: "8:00 PM",
    startsAt: "2026-07-19T20:00:00",
    neighborhood: "Downtown",
    seatsTotal: 10,
    seatsRemaining: 6,
    hostName: "August Reyes",
    hostId: "august-reyes",
    moodTags: ["Intimate", "Late-night", "Lively"],
    price: 160,
    image: supperclub,
    description:
      "A long-table supper club for ten — warm lighting, shared bottles, and a four-course menu meant to be lingered over.",
    expect: [
      "Welcome cocktail",
      "Four shared courses",
      "Late-night conversation",
    ],
    menu: [
      "Marinated olives, almonds",
      "Handmade pasta, brown butter",
      "Roasted branzino, herbs",
      "Chocolate olive oil cake",
    ],
    guestVibe: "Warm, talkative, up for a late night.",
    hostNote: "Pull up a chair. We're just getting started.",
  },
];

export type Host = {
  id: string;
  name: string;
  neighborhood: string;
  archetype: string;
  bio: string;
  philosophy: string;
  signatures: string[];
  vibe: string;
  trust: string[];
  /** Portrait of the host (different from the table's food photo). */
  portrait?: string;
};

export const HOSTS: Host[] = [
  {
    id: "yael-avraham",
    name: "Yael Avraham",
    neighborhood: "West Hollywood",
    archetype: "Mediterranean Table",
    bio: "A second-generation cook hosting Mediterranean dinners from her West Hollywood home.",
    philosophy: "A table is a small act of hospitality. Done well, it is also a small act of culture.",
    signatures: ["Slow-roasted lamb shoulder", "Whipped labneh", "Olive oil cake"],
    vibe: "Andalusian guitar, low candlelight, a little Fairuz.",
    trust: ["Founding Host", "Candlelit Mediterranean dinners", "Guests often return"],
    portrait: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=70",
  },
  {
    id: "marisol-ortega",
    name: "Marisol Ortega",
    neighborhood: "Silver Lake",
    archetype: "Heritage Table",
    bio: "A Oaxacan-born cook hosting heritage dinners drawn from her grandmother's recipes.",
    philosophy: "Every recipe is a memory worth feeding to strangers.",
    signatures: ["Mole negro", "Heirloom corn tlacoyos", "Cinnamon flan"],
    vibe: "Soft cumbia, terracotta, hand-thrown ceramics.",
    trust: ["Founding Host", "Storytelling table", "Family-style service"],
    portrait: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=800&q=70",
  },
  {
    id: "rae-lin",
    name: "Rae Lin",
    neighborhood: "Venice",
    archetype: "Plant Forward Table",
    bio: "A garden-driven cook hosting daylight dinners on a long table under fig trees.",
    philosophy: "Eat with the seasons. Sit with strangers. Leave with friends.",
    signatures: ["Stone fruit, basil, salt", "Charred squash, tahini", "Fig leaf panna cotta"],
    vibe: "Golden hour, linen, foraged herbs.",
    trust: ["Garden host", "All plant-based", "Daylight dinners"],
    portrait: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=70",
  },
  {
    id: "diego-marin",
    name: "Diego Marín",
    neighborhood: "Malibu",
    archetype: "Fire Table",
    bio: "A live-fire cook hosting ritual dinners at the edge of the canyon.",
    philosophy: "Fire is the oldest dinner host. We keep it company.",
    signatures: ["Whole grilled fish", "Wood-fired flatbread", "Embered carrots"],
    vibe: "Smoke, oak, dusk light over the Pacific.",
    trust: ["Open-flame cooking", "Outdoor host", "Canyon table"],
    portrait: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=70",
  },
  {
    id: "noa-becker",
    name: "Noa Becker",
    neighborhood: "Mid-City",
    archetype: "Shabbat Table",
    bio: "A weekly Shabbat host opening her table to guests of all backgrounds.",
    philosophy: "Bring yourself, exactly as you are.",
    signatures: ["Homemade challah", "Roasted chicken with olives", "Honey cake"],
    vibe: "Candlelight, slow Friday nights, blessing over wine.",
    trust: ["Weekly host", "Welcoming all backgrounds", "Ritual-led"],
    portrait: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=800&q=70",
  },
];

export const TESTIMONIALS = [
  {
    quote: "I arrived a stranger and left with three real friendships. The food was just the doorway.",
    name: "Ariella S.",
    detail: "Mediterranean Table, West Hollywood",
  },
  {
    quote: "It felt like a private dinner party in a city I thought I already knew. Quietly the best night I've had this year.",
    name: "Jonah R.",
    detail: "Fire Table, Malibu",
  },
  {
    quote: "Curated in a way that actually feels curated. The room was the menu.",
    name: "Sasha M.",
    detail: "Founding Salon, Hollywood Hills",
  },
];
