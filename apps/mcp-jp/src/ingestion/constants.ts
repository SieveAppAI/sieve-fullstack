export const JP_REGULATORY_DOMAINS = [
  'ffcr.or.jp',
  'caa.go.jp',
  'mhlw.go.jp',
  'jcia.org',
  'nite.go.jp',
  'fsc.go.jp',
  'japaneselawtranslation.go.jp',
  'dfa25.nihs.go.jp',
];

export const DISCOVERY_QUERIES = [
  // MHLW - Food Safety
  'Japan food safety regulations MHLW food sanitation act',
  'Japan food additive designated list permitted',
  'Japan existing food additives list natural origin',
  'Japan food contaminants limits heavy metals pesticides',
  'Japan imported food safety requirements MHLW',
  // MHLW - Cosmetics
  'Japan cosmetics regulation MHLW standards negative list',
  'Japan quasi-drug regulation pharmaceutical medical devices act',
  'Japan cosmetics ingredient restrictions prohibited',
  'Japan cosmetics labelling requirements INCI',
  // CAA - Food Labelling & Claims
  'Japan food labelling act CAA requirements',
  'Japan food with function claims FFC notification',
  'Japan FOSHU approved products health claims',
  'Japan allergen declaration mandatory labelling',
  'Japan nutrition labelling standards requirements',
  'Japan food additive standards CAA consumer affairs',
  // FFCR - Food Additives
  'Japan designated food additives FFCR list specifications',
  'Japan food additive specifications standards 8th edition',
  'Japan maximum residue limits pesticides veterinary drugs',
  // JCIA - Cosmetics Industry
  'Japan cosmetic industry association JCIA self-regulatory standards',
  'Japan cosmetics positive list preservatives UV absorbers',
  // NITE - Chemical Database
  'Japan NITE CHRIP chemical database cosmetics ingredients',
  // Import
  'Japan food import notification requirements quarantine',
  'Japan cosmetics import registration quasi-drug',
];

export const ROOT_URLS = [
  'https://www.ffcr.or.jp/en/',
  'https://www.mhlw.go.jp/english/topics/foodsafety/',
  'https://www.caa.go.jp/en/policy/food_labeling/',
  'https://www.japaneselawtranslation.go.jp/',
  'https://www.jcia.org/n/eng/',
];

// Domains that require Browser Use (JS-rendered or Japanese-only portals)
export const BROWSER_USE_DOMAINS = [
  'fld.caa.go.jp',
  'laws.e-gov.go.jp',
  'dfa25.nihs.go.jp',
];

export function classifyRegulatoryBody(
  url: string
): 'MHLW' | 'CAA' | 'FFCR' | 'JCIA' | 'NITE' | 'FSCJ' | 'OTHER' {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('mhlw.go.jp')) return 'MHLW';
  if (hostname.includes('caa.go.jp') || hostname.includes('fld.caa.go.jp')) return 'CAA';
  if (hostname.includes('ffcr.or.jp')) return 'FFCR';
  if (hostname.includes('jcia.org')) return 'JCIA';
  if (hostname.includes('nite.go.jp')) return 'NITE';
  if (hostname.includes('fsc.go.jp')) return 'FSCJ';
  return 'OTHER';
}
