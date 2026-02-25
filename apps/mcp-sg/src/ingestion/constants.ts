export const SG_REGULATORY_DOMAINS = [
  'sfa.gov.sg',
  'hsa.gov.sg',
  'sso.agc.gov.sg',
  'nea.gov.sg',
];

export const DISCOVERY_QUERIES = [
  // SFA - Food
  'Singapore food regulations permitted additives limits',
  'Singapore food labelling requirements nutrition panel',
  'Singapore food import requirements licence permit',
  'Singapore allergen declaration requirements food',
  'Singapore nutri-grade labelling beverages',
  'Singapore health claims nutrition claims food',
  'Singapore novel food approval requirements',
  'Singapore food contaminants limits heavy metals pesticides',
  // HSA - Cosmetics
  'Singapore cosmetic products regulation ASEAN directive',
  'ASEAN cosmetic directive annex prohibited restricted ingredients',
  'Singapore cosmetic product notification PRISM',
  'Singapore cosmetic labelling requirements INCI',
  'Singapore cosmetic claims guidelines',
  // HSA - Health Supplements
  'Singapore health supplements regulation HSA',
  'Singapore health supplement permitted ingredients positive list',
  'Singapore health supplement claims permitted',
  'Singapore health supplement voluntary notification',
  // Legislation
  'Singapore Sale of Food Act food regulations',
  'Singapore Health Products Act cosmetic regulations',
  'Singapore Food Safety Security Act 2024',
];

export const ROOT_URLS = [
  'https://www.sfa.gov.sg/regulatory-standards-frameworks-guidelines',
  'https://www.sfa.gov.sg/legislation',
  'https://www.hsa.gov.sg/cosmetic-products',
  'https://www.hsa.gov.sg/health-supplements',
];

// Domains that require Browser Use (JS-rendered or interactive portals)
export const BROWSER_USE_DOMAINS = [
  'sso.agc.gov.sg',
  'prism.hsa.gov.sg',
  'eservice.hsa.gov.sg',
];

export function classifyRegulatoryBody(
  url: string
): 'SFA' | 'HSA' | 'NEA' | 'SSO' | 'OTHER' {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('sfa.gov.sg')) return 'SFA';
  if (hostname.includes('hsa.gov.sg')) return 'HSA';
  if (hostname.includes('nea.gov.sg')) return 'NEA';
  if (hostname.includes('sso.agc.gov.sg')) return 'SSO';
  return 'OTHER';
}
