export interface CountryInfo {
  code: string;
  name: string;
  englishName: string;
  flagEmoji: string;
}

export interface RegionInfo {
  code: string;
  tag: string;
  name: string;
  englishName: string;
  colorHex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

// Exact HLTV Region Colors
export const REGIONS: RegionInfo[] = [
  {
    code: "EU",
    tag: "EU",
    name: "Европа",
    englishName: "Europe",
    colorHex: "#004bb5",
    bgClass: "bg-[#004bb5]",
    textClass: "text-white",
    borderClass: "border-[#1d64d8]/40",
  },
  {
    code: "AM",
    tag: "AM",
    name: "Америка",
    englishName: "Americas",
    colorHex: "#b81d1d",
    bgClass: "bg-[#b81d1d]",
    textClass: "text-white",
    borderClass: "border-[#dc2626]/40",
  },
  {
    code: "AS",
    tag: "AS",
    name: "Азия",
    englishName: "Asia",
    colorHex: "#c97712",
    bgClass: "bg-[#c97712]",
    textClass: "text-white",
    borderClass: "border-[#f59e0b]/40",
  },
  {
    code: "AF",
    tag: "AF",
    name: "Африка",
    englishName: "Africa",
    colorHex: "#187a3d",
    bgClass: "bg-[#187a3d]",
    textClass: "text-white",
    borderClass: "border-[#22c55e]/40",
  },
  {
    code: "OC",
    tag: "OC",
    name: "Океания",
    englishName: "Oceania",
    colorHex: "#008299",
    bgClass: "bg-[#008299]",
    textClass: "text-white",
    borderClass: "border-[#06b6d4]/40",
  },
];

export const UN_REGIONS = REGIONS;

export const COUNTRIES: CountryInfo[] = [
  { code: "RU", name: "Россия", englishName: "Russia", flagEmoji: "🇷🇺" },
  { code: "KZ", name: "Казахстан", englishName: "Kazakhstan", flagEmoji: "🇰🇿" },
  { code: "UA", name: "Украина", englishName: "Ukraine", flagEmoji: "🇺🇦" },
  { code: "BY", name: "Беларусь", englishName: "Belarus", flagEmoji: "🇧🇾" },
  { code: "UZ", name: "Узбекистан", englishName: "Uzbekistan", flagEmoji: "🇺🇿" },
  { code: "KG", name: "Кыргызстан", englishName: "Kyrgyzstan", flagEmoji: "🇰🇬" },
  { code: "AZ", name: "Азербайджан", englishName: "Azerbaijan", flagEmoji: "🇦🇿" },
  { code: "AM", name: "Армения", englishName: "Armenia", flagEmoji: "🇦🇲" },
  { code: "GE", name: "Грузия", englishName: "Georgia", flagEmoji: "🇬🇪" },
  { code: "MD", name: "Молдова", englishName: "Moldova", flagEmoji: "🇲🇩" },
  { code: "TJ", name: "Таджикистан", englishName: "Tajikistan", flagEmoji: "🇹🇯" },
  { code: "TM", name: "Туркменистан", englishName: "Turkmenistan", flagEmoji: "🇹🇲" },
  { code: "RS", name: "Сербия", englishName: "Serbia", flagEmoji: "🇷🇸" },
  { code: "DE", name: "Германия", englishName: "Germany", flagEmoji: "🇩🇪" },
  { code: "SE", name: "Швеция", englishName: "Sweden", flagEmoji: "🇸🇪" },
  { code: "DK", name: "Дания", englishName: "Denmark", flagEmoji: "🇩🇰" },
  { code: "PL", name: "Польша", englishName: "Poland", flagEmoji: "🇵🇱" },
  { code: "FI", name: "Финляндия", englishName: "Finland", flagEmoji: "🇫🇮" },
  { code: "NO", name: "Норвегия", englishName: "Norway", flagEmoji: "🇳🇴" },
  { code: "EE", name: "Эстония", englishName: "Estonia", flagEmoji: "🇪🇪" },
  { code: "LV", name: "Латвия", englishName: "Latvia", flagEmoji: "🇱🇻" },
  { code: "LT", name: "Литва", englishName: "Lithuania", flagEmoji: "🇱🇹" },
  { code: "FR", name: "Франция", englishName: "France", flagEmoji: "🇫🇷" },
  { code: "GB", name: "Великобритания", englishName: "United Kingdom", flagEmoji: "🇬🇧" },
  { code: "US", name: "США", englishName: "United States", flagEmoji: "🇺🇸" },
  { code: "CA", name: "Канада", englishName: "Canada", flagEmoji: "🇨🇦" },
  { code: "BR", name: "Бразилия", englishName: "Brazil", flagEmoji: "🇧🇷" },
  { code: "AR", name: "Аргентина", englishName: "Argentina", flagEmoji: "🇦🇷" },
  { code: "MN", name: "Монголия", englishName: "Mongolia", flagEmoji: "🇲🇳" },
  { code: "TR", name: "Турция", englishName: "Turkey", flagEmoji: "🇹🇷" },
  { code: "CN", name: "Китай", englishName: "China", flagEmoji: "🇨🇳" },
  { code: "KR", name: "Южная Корея", englishName: "South Korea", flagEmoji: "🇰🇷" },
  { code: "JP", name: "Япония", englishName: "Japan", flagEmoji: "🇯🇵" },
  { code: "AU", name: "Австралия", englishName: "Australia", flagEmoji: "🇦🇺" },
  { code: "NZ", name: "Новая Зеландия", englishName: "New Zealand", flagEmoji: "🇳🇿" },
  { code: "ZA", name: "ЮАР", englishName: "South Africa", flagEmoji: "🇿🇦" },
  { code: "EG", name: "Египет", englishName: "Egypt", flagEmoji: "🇪🇬" },
  { code: "IL", name: "Израиль", englishName: "Israel", flagEmoji: "🇮🇱" },
  { code: "OTHER", name: "Другая страна", englishName: "Other", flagEmoji: "🌐" },
];

const countryMap = new Map<string, CountryInfo>();
for (const c of COUNTRIES) {
  countryMap.set(c.code.toUpperCase(), c);
}

const regionMap = new Map<string, RegionInfo>();
for (const r of REGIONS) {
  regionMap.set(r.code.toUpperCase(), r);
}

export function getCountry(code?: string | null): CountryInfo {
  if (!code) return { code: "OTHER", name: "Другая страна", englishName: "Other", flagEmoji: "🌐" };
  const upper = code.trim().toUpperCase();
  const found = countryMap.get(upper);
  if (found) return found;

  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) {
    return { code: upper, name: upper, englishName: upper, flagEmoji: "🌐" };
  }

  return { code: upper, name: code, englishName: code, flagEmoji: "🌐" };
}

export function getCountryFlag(code?: string | null): string {
  return getCountry(code).flagEmoji;
}

export function getCountryName(code?: string | null): string {
  return getCountry(code).name;
}

export function getFlagImageUrl(code?: string | null, width: 40 | 80 | 160 = 40): string {
  const c = getCountry(code);
  if (c.code === "OTHER" || c.code.length !== 2) {
    return "";
  }
  return `https://flagcdn.com/w${width}/${c.code.toLowerCase()}.png`;
}

export function getRegionInfo(code?: string | null): RegionInfo {
  if (!code) {
    return REGIONS[0]; // EU by default
  }
  const upper = code.trim().toUpperCase();

  // Direct match by code/tag
  const direct = regionMap.get(upper);
  if (direct) return direct;

  // Normalization aliases
  if (
    upper === "EUROPE" ||
    upper === "EU" ||
    upper === "CIS" ||
    upper === "СНГ" ||
    upper === "RU" ||
    upper === "ЕВРОПА"
  ) {
    return REGIONS[0]; // EU
  }
  if (
    upper === "AM" ||
    upper === "AMERICA" ||
    upper === "AMERICAS" ||
    upper === "NA" ||
    upper === "SA" ||
    upper === "NORTH_AMERICA" ||
    upper === "LATIN_AMERICA" ||
    upper === "LATAM" ||
    upper === "USA" ||
    upper === "US" ||
    upper === "АМЕРИКА"
  ) {
    return REGIONS[1]; // AM
  }
  if (
    upper === "AS" ||
    upper === "ASIA" ||
    upper === "KZ" ||
    upper === "AZ" ||
    upper === "APAC" ||
    upper === "АЗИЯ"
  ) {
    return REGIONS[2]; // AS
  }
  if (upper === "AF" || upper === "AFRICA" || upper === "АФРИКА") {
    return REGIONS[3]; // AF
  }
  if (upper === "OC" || upper === "OCEANIA" || upper === "AU" || upper === "OCE" || upper === "ОКЕАНИЯ") {
    return REGIONS[4]; // OC
  }

  return {
    code: upper,
    tag: upper.substring(0, 2).toUpperCase(),
    name: code,
    englishName: code,
    colorHex: "#004bb5",
    bgClass: "bg-[#004bb5]",
    textClass: "text-white",
    borderClass: "border-[#1d64d8]/40",
  };
}
