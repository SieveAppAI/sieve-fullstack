export const US_REGULATORY_DOMAINS = [
  'fda.gov',
  'accessdata.fda.gov',
  'ecfr.gov',
  'federalregister.gov',
  'ftc.gov',
  'cir-safety.org',
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
  // FDA — Import
  'FDA food import requirements prior notice',
  'FDA Foreign Supplier Verification Program FSVP',
  'FDA import alerts detained products',
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
  'ecfr.gov',
  'accessdata.fda.gov',
];

export function classifyRegulatoryBody(
  url: string
): 'FDA' | 'FTC' | 'USDA' | 'CIR' | 'OTHER' {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('fda.gov')) return 'FDA';
  if (hostname.includes('ftc.gov')) return 'FTC';
  if (hostname.includes('usda.gov')) return 'USDA';
  if (hostname.includes('cir-safety.org')) return 'CIR';
  return 'OTHER';
}
