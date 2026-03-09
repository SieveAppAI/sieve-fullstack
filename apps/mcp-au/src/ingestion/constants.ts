export const AU_NZ_REGULATORY_DOMAINS = [
  'legislation.gov.au',
  'foodstandards.gov.au',
  'tga.gov.au',
  'industrialchemicals.gov.au',
  'medsafe.govt.nz',
  'epa.govt.nz',
  'legislation.govt.nz',
];

export const DISCOVERY_QUERIES = [
  'FSANZ Food Standards Code Schedule 15 permitted food additives maximum levels',
  'FSANZ Standard 1.2.1 labelling requirements food Australia New Zealand',
  'FSANZ Standard 1.2.3 mandatory warning advisory statements food',
  'FSANZ Standard 1.2.4 labelling of ingredients compound ingredients',
  'FSANZ Standard 1.2.7 nutrition health related claims',
  'FSANZ Schedule 4 permitted health claims qualifying criteria',
  'FSANZ Standard 1.2.8 nutrition information panel requirements',
  'FSANZ Schedule 25 permitted novel foods conditions',
  'FSANZ Schedule 19 maximum levels contaminants',
  'Australia New Zealand food allergen declaration requirements',
  'FSANZ food additive names codes INS Schedule 8',
  'TGA permissible ingredients determination listed medicines',
  'TGA permitted indications listed medicines Australia',
  'TGA complementary medicines regulation',
  'TGA listed medicines evidence guidelines',
  'AICIS Australian Inventory Industrial Chemicals AIIC',
  'AICIS cosmetics standard industrial chemicals restrictions',
  'Australia cosmetics ingredient regulation industrial chemicals',
  'Medsafe dietary supplement regulations New Zealand',
  'New Zealand Dietary Supplements Regulations 1985',
  'Medsafe medicine classification database',
  'NZ EPA New Zealand Inventory of Chemicals NZIoC',
  'NZ EPA hazardous substances cosmetics group standard',
  'Australia food import requirements biosecurity DAFF',
  'New Zealand food import requirements MPI',
];

export const ROOT_URLS = [
  'https://www.foodstandards.gov.au/food-standards-code',
  'https://www.tga.gov.au/resources/resource/guidance/permissible-ingredients-determination',
  'https://www.industrialchemicals.gov.au/consumers-and-community/australian-inventory-industrial-chemicals-aiic',
  'https://www.medsafe.govt.nz/regulatory/dietary-supplements.asp',
  'https://www.epa.govt.nz/industry-areas/hazardous-substances',
];

export const BROWSER_USE_DOMAINS = [
  'tga.gov.au',
  'foodstandards.gov.au',
];

export function classifyRegulatoryBody(
  url: string
): 'FSANZ' | 'TGA' | 'AICIS' | 'MEDSAFE' | 'NZ_EPA' | 'OTHER' {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('foodstandards.gov.au')) return 'FSANZ';
  if (hostname.includes('legislation.gov.au')) return 'FSANZ';
  if (hostname.includes('tga.gov.au')) return 'TGA';
  if (hostname.includes('industrialchemicals.gov.au')) return 'AICIS';
  if (hostname.includes('medsafe.govt.nz')) return 'MEDSAFE';
  if (hostname.includes('epa.govt.nz')) return 'NZ_EPA';
  if (hostname.includes('legislation.govt.nz')) return 'MEDSAFE';
  return 'OTHER';
}

export function classifyJurisdiction(url: string): 'AU' | 'NZ' | 'AU_NZ' {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.endsWith('.govt.nz')) return 'NZ';
  if (hostname.includes('foodstandards.gov.au') || hostname.includes('legislation.gov.au')) return 'AU_NZ';
  return 'AU';
}
