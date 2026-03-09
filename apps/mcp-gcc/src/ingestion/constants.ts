export const GCC_REGULATORY_DOMAINS = [
  'sfda.gov.sa',
  'old.sfda.gov.sa',
  'gso.org.sa',
  'store.gso.org.sa',
  'moiat.gov.ae',
  'dm.gov.ae',
  'adafsa.gov.ae',
  'nhra.bh',
  'pafn.gov.kw',
  'moph.gov.qa',
];

export const DISCOVERY_QUERIES = [
  // SFDA - Food (P0)
  'SFDA Saudi Arabia food regulations permitted additives',
  'SFDA food labelling requirements Arabic language',
  'SFDA food import registration requirements Saudi Arabia',
  'SFDA food safety standards contaminants limits',
  'SFDA nutrition labelling requirements',
  'SFDA food health claims regulations',
  'SFDA novel food regulations Saudi Arabia',
  'SFDA food warnings recalls alerts',
  // SFDA - Cosmetics (P0)
  'SFDA cosmetic products regulation Saudi Arabia',
  'SFDA cosmetic ingredients prohibited restricted list',
  'SFDA cosmetic labelling requirements',
  // SFDA - Supplements (P0)
  'SFDA health supplements registration Saudi Arabia',
  'SFDA dietary supplement permitted ingredients',
  'SFDA supplement claims regulations',
  // SFDA - Halal (P0)
  'SFDA halal food certification requirements Saudi Arabia',
  'SFDA halal slaughter requirements food',
  'GSO halal food standard requirements GCC',
  // GSO Standards (P1)
  'GSO standards food safety GCC countries',
  'GSO 9 labelling prepackaged food products',
  'GSO 2055 halal food requirements',
  'GSO 1943 food additives permitted',
  'GSO 2500 nutrition labelling',
  'GSO 2148 cosmetic products requirements',
  // UAE (P1)
  'UAE MoIAT food regulations laws',
  'Dubai Municipality food safety regulations',
  'ADAFSA Abu Dhabi food registration requirements',
  // Bahrain (P1)
  'NHRA Bahrain food health products regulation',
  // Cross-GCC
  'GCC food import requirements documentation',
  'Arabic labelling requirements food products GCC',
  'GCC cosmetic product registration requirements',
];

export const ROOT_URLS = [
  'https://sfda.gov.sa/en/regulations',
  'https://sfda.gov.sa/en/regulations?tags=1',
  'https://sfda.gov.sa/en/regulations?tags=47',
  'https://sfda.gov.sa/en/regulations?tags=50',
  'https://sfda.gov.sa/en/regulations?tags=69',
  'https://sfda.gov.sa/en/regulations?tags=48',
  'https://moiat.gov.ae/en/about-us/laws-and-legislation',
  'https://www.dm.gov.ae/municipality-business/food-traders-establishments/',
  'https://www.nhra.bh/',
];

// Domains that require Browser Use (JS-rendered or interactive portals)
export const BROWSER_USE_DOMAINS = [
  'old.sfda.gov.sa',
  'store.gso.org.sa',
];

export function classifyRegulatoryBody(
  url: string
): 'GSO' | 'SFDA' | 'MOIAT' | 'DM' | 'ADAFSA' | 'NHRA' | 'PAFN' | 'MOPH' | 'FSQC' | 'OTHER' {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('gso.org.sa')) return 'GSO';
  if (hostname.includes('sfda.gov.sa')) return 'SFDA';
  if (hostname.includes('moiat.gov.ae')) return 'MOIAT';
  if (hostname.includes('dm.gov.ae')) return 'DM';
  if (hostname.includes('adafsa.gov.ae')) return 'ADAFSA';
  if (hostname.includes('nhra.bh')) return 'NHRA';
  if (hostname.includes('pafn.gov.kw')) return 'PAFN';
  if (hostname.includes('moph.gov.qa')) return 'MOPH';
  return 'OTHER';
}
