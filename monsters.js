let monsters = [
  {
    id: "0-3-8",
    name: "Skyrazor",
    category: "Flying",
    form: "Raptix",
    color: { name: "Rose", hex: "#ec4899" },
    stats: { hp: 1, maxhp: 1, power: 3, stars: 1 },
    img: "assets/monster1.png"
  },
  {
    id: "1-5-1",
    name: "Stonefang",
    category: "Earth",
    form: "Herizo",
    color: { name: "Azure", hex: "#3b82f6" },
    stats: { hp: 6, maxhp: 6, power: 3, stars: 0 },
    img: "assets/monster2.png"
  },
  {
    id: "2-2-5",
    name: "Shadeclaw",
    category: "Ceiling",
    form: "Stalax",
    color: { name: "Shadow", hex: "#374151" },
    stats: { hp: 7, maxhp: 7, power: 1, stars: 1 },
    img: "assets/monster3.png"
  },
  {
    id: "0-0-3",
    name: "Goldtalon",
    category: "Flying",
    form: "Aileron",
    color: { name: "Gold", hex: "#f59e0b" },
    stats: { hp: 3, maxhp: 3, power: 3, stars: 1 },
    img: "assets/monster4.png"
  },
  {
    id: "1-2-7",
    name: "Bronzebite",
    category: "Earth",
    form: "Rochet",
    color: { name: "Bronze", hex: "#b45309" },
    stats: { hp: 4, maxhp: 4, power: 3, stars: 1 },
    img: "assets/monster5.png"
  },
  {
    id: "2-5-0",
    name: "Crimsonbane",
    category: "Ceiling",
    form: "Pendu",
    color: { name: "Crimson", hex: "#ef4444" },
    stats: { hp: 5, maxhp: 5, power: 1, stars: 0 },
    img: "assets/monster6.png"
  },
  {
    id: "0-5-9",
    name: "Stormveil",
    category: "Flying",
    form: "Fumee",
    color: { name: "Cyan", hex: "#06b6d4" },
    stats: { hp: 10, maxhp: 10, power: 3, stars: 2 },
    img: "assets/monster7.png"
  },
  {
    id: "1-8-4",
    name: "Ironjaw",
    category: "Flying",
    form: "Gravelon",
    color: { name: "Iron", hex: "#9ca3af" },
    stats: { hp: 8, maxhp: 8, power: 5, stars: 2 },
    img: "assets/monster8.png"
  },
  {
    id: "2-4-6",
    name: "Bloodfeather",
    category: "Flying",
    form: "Corvax",
    color: { name: "Vermilion", hex: "#dc2626" },
    stats: { hp: 6, maxhp: 6, power: 2, stars: 1 },
    img: "assets/monster9.png"
  },
  {
    id: "0-7-2",
    name: "Frostwing",
    category: "Flying",
    form: "Nebrix",
    color: { name: "Silver", hex: "#d1d5db" },
    stats: { hp: 9, maxhp: 9, power: 2, stars: 3 },
    img: "assets/monster10.png"
  },
  {
    id: "1-3-3",
    name: "Earthbreaker",
    category: "Flying",
    form: "Gorak",
    color: { name: "Olive", hex: "#6b7280" },
    stats: { hp: 12, maxhp: 12, power: 4, stars: 2 },
    img: "assets/monster11.png"
  },
  {
    id: "2-9-0",
    name: "Nightmaw",
    category: "Flying",
    form: "Lurix",
    color: { name: "Indigo", hex: "#4338ca" },
    stats: { hp: 5, maxhp: 5, power: 4, stars: 2 },
    img: "assets/monster12.png"
  },
  {
    id: "0-6-8",
    name: "Skybreaker",
    category: "Flying",
    form: "Aerath",
    color: { name: "Teal", hex: "#14b8a6" },
    stats: { hp: 11, maxhp: 11, power: 3, stars: 3 },
    img: "assets/monster13.png"
  },
  {
    id: "1-9-4",
    name: "Moltenfang",
    category: "Earth",
    form: "Molgar",
    color: { name: "Amber", hex: "#f97316" },
    stats: { hp: 9, maxhp: 9, power: 4, stars: 3 },
    img: "assets/monster14.png"
  },
  {
    id: "2-1-2",
    name: "Darkspire",
    category: "Flying",
    form: "Shadeon",
    color: { name: "Obsidian", hex: "#111827" },
    stats: { hp: 4, maxhp: 4, power: 2, stars: 2 },
    img: "assets/monster15.png"
  },
  {
    id: "0-8-5",
    name: "Windreaper",
    category: "Flying",
    form: "Aeronis",
    color: { name: "Azure", hex: "#38bdf8" },
    stats: { hp: 8, maxhp: 8, power: 3, stars: 2 },
    img: "assets/monster16.png"
  },

  {
    id: "1-4-9",
    name: "Crystalhorn",
    category: "Earth",
    form: "Gemraxx",
    color: { name: "Purple", hex: "#8b5cf6" },
    stats: { hp: 10, maxhp: 10, power: 5, stars: 2 },
    img: "assets/monster17.png"
  },

  {
    id: "2-7-3",
    name: "Voidclaw",
    category: "Ceiling",
    form: "Umbraxis",
    color: { name: "Black", hex: "#000000" },
    stats: { hp: 6, maxhp: 6, power: 9, stars: 3 },
    img: "assets/monster18.png"
  },

  {
    id: "0-1-7",
    name: "Flamewyrm",
    category: "Flying",
    form: "Pyrothon",
    color: { name: "Scarlet", hex: "#e11d48" },
    stats: { hp: 13, maxhp: 13, power: 7, stars: 4 },
    img: "assets/monster19.png"
  },
  {
    id: "1-6-2",
    name: "Quartzfist",
    category: "Earth",
    form: "Geodon",
    color: { name: "Rose", hex: "#f43f5e" },
    stats: { hp: 7, maxhp: 7, power: 4, stars: 1 },
    img: "assets/monster20.png"
  },

  {
    id: "2-3-8",
    name: "Spectrewing",
    category: "Ceiling",
    form: "Phantros",
    color: { name: "Violet", hex: "#7c3aed" },
    stats: { hp: 5, maxhp: 5, power: 6, stars: 2 },
    img: "assets/monster21.png"
  }
];

window.MONSTERS = monsters;
