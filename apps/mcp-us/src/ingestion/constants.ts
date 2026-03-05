export const US_REGULATORY_DOMAINS = [
  'fda.gov',
  'accessdata.fda.gov',
  'ecfr.gov',
  'federalregister.gov',
  'ftc.gov',
  'cir-safety.org',
  'oehha.ca.gov',
  'usda.gov',
  'fsis.usda.gov',
];

export const DISCOVERY_QUERIES = [
  // FDA — Food Additives & GRAS
  'FDA food additives permitted list 21 CFR 172',
  'FDA GRAS substances generally recognized as safe',
  'FDA color additives approved list 21 CFR 73 74 82',
  'FDA food contact substances notification program',
  'FDA prior-sanctioned food ingredients',
  // FDA — Food Labelling
  'FDA food labelling requirements 21 CFR 101',
  'FDA nutrition facts label requirements',
  'FDA allergen labelling FALCPA FASTER Act major allergens',
  'FDA front-of-package labelling requirements',
  'FDA organic labelling USDA requirements',
  // FDA — Dietary Supplements
  'FDA dietary supplement regulation DSHEA',
  'FDA new dietary ingredient NDI notification requirements',
  'FDA dietary supplement labelling supplement facts',
  'FDA dietary supplement claims structure function',
  // FDA — Cosmetics
  'FDA cosmetics regulation MoCRA 2022',
  'FDA cosmetics prohibited restricted ingredients',
  'FDA cosmetics facility registration product listing MoCRA',
  'FDA cosmetic labelling requirements',
  'FDA cosmetics adverse event reporting',
  // FTC — Claims & Advertising
  'FTC health claims advertising substantiation',
  'FTC dietary supplement advertising guide',
  'FTC environmental marketing green guides',
  'FTC endorsement guides 2023 testimonials influencer',
  'FTC health products compliance guidance 2022',
  'FTC advertising enforcement actions dietary supplements',
  'FTC deceptive advertising cases food health',
  // FDA — Import
  'FDA food import requirements prior notice',
  'FDA Foreign Supplier Verification Program FSVP',
  'FDA import alerts detained products',
  'FDA warning letters food dietary supplements cosmetics',
  'FDA recalls safety alerts food cosmetics',
  // FDA — Allergens
  'FDA food allergens FALCPA FASTER Act sesame major allergens',
  'FDA tainted supplements database alerts',
  'FDA color additives permitted cosmetics 21 CFR 73 74',
  // OEHHA / Prop 65
  'California Proposition 65 chemical list OEHHA',
  'OEHHA Prop 65 safe harbor levels NSRL MADL',
  'Prop 65 warning requirements food supplements cosmetics',
  // USDA
  'USDA organic standards National Organic Program',
  'USDA FSIS meat poultry labeling regulations',
  'USDA FSIS food safety inspection requirements',
];

export const ROOT_URLS = [
  'https://www.fda.gov/food/food-ingredients-packaging',
  'https://www.fda.gov/food/food-labeling-nutrition',
  'https://www.fda.gov/food/dietary-supplements',
  'https://www.fda.gov/cosmetics',
  'https://www.fda.gov/food/importing-food-products-united-states',
  'https://www.ecfr.gov/current/title-21',
  'https://www.ftc.gov/legal-library/browse/rules/health-claims',
];

// Domains that require Browser Use (JS-rendered or interactive portals)
export const BROWSER_USE_DOMAINS = [
  'accessdata.fda.gov',
];

// eCFR parts to ingest via direct API
export const ECFR_PARTS: Array<{ title: number; part: number }> = [
  // Title 21 — Food & Drug
  { title: 21, part: 101 },  // Food Labeling
  { title: 21, part: 111 },  // Dietary Supplement cGMP
  { title: 21, part: 170 },  // Food Additives General
  { title: 21, part: 172 },  // Food Additives Permitted
  { title: 21, part: 173 },  // Secondary Direct Food Additives
  { title: 21, part: 182 },  // GRAS Substances
  { title: 21, part: 184 },  // Direct GRAS Affirmed
  { title: 21, part: 186 },  // Indirect GRAS Affirmed
  { title: 21, part: 189 },  // Prohibited Substances
  { title: 21, part: 190 },  // Dietary Supplements
  { title: 21, part: 700 },  // Cosmetics General
  { title: 21, part: 701 },  // Cosmetics Labeling
  { title: 21, part: 740 },  // Cosmetics Warnings
  { title: 21, part: 73 },   // Color Additives Exempt
  { title: 21, part: 74 },   // Color Additives Certification
  { title: 21, part: 81 },   // Color Additive General
  { title: 21, part: 82 },   // Color Additives Listing
  // Title 7 — Agriculture
  { title: 7, part: 205 },   // USDA National Organic Program
  // Title 9 — FSIS
  { title: 9, part: 317 },   // FSIS Meat Labeling
  { title: 9, part: 381 },   // FSIS Poultry Labeling
];

export function classifyRegulatoryBody(
  url: string
): 'FDA' | 'FTC' | 'USDA' | 'CIR' | 'OEHHA' | 'OTHER' {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('fda.gov')) return 'FDA';
  if (hostname.includes('ftc.gov')) return 'FTC';
  if (hostname.includes('oehha.ca.gov')) return 'OEHHA';
  if (hostname.includes('usda.gov') || hostname.includes('fsis.usda.gov')) return 'USDA';
  if (hostname.includes('cir-safety.org')) return 'CIR';
  return 'OTHER';
}
