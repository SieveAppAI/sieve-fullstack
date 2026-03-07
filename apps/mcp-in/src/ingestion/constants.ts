export const IN_REGULATORY_DOMAINS = [
  'fssai.gov.in',
  'cdsco.gov.in',
  'bis.gov.in',
  'main.ayush.gov.in',
  'indiacode.nic.in',
  'egazette.gov.in',
];

export const DISCOVERY_QUERIES = [
  // FSSAI — Food Safety
  'FSSAI food safety standards regulations India',
  'FSSAI permitted food additives limits India',
  'FSSAI food labelling packaging regulations India',
  'FSSAI nutrition labelling requirements India',
  'India food allergen declaration requirements FSSAI',
  'FSSAI health supplements nutraceuticals regulations India',
  'FSSAI food fortification standards India',
  'FSSAI organic food regulations India',
  'FSSAI food import clearance requirements India',
  'FSSAI advertising claims food products India',
  'FSSAI contaminants toxins limits food India',
  'FSSAI novel food approval proprietary food India',
  'FSSAI vegan vegetarian non-vegetarian symbol regulations',
  'FSS Act 2006 food safety standards India',
  // CDSCO — Cosmetics
  'CDSCO cosmetics rules 2020 India',
  'India cosmetic ingredients prohibited restricted schedule',
  'CDSCO cosmetic registration import licence India',
  'India cosmetic labelling requirements BIS',
  'CDSCO cosmetic product claims guidelines India',
  // BIS — Standards
  'BIS Indian standards food products specifications',
  'BIS cosmetic standards IS specifications India',
  // AYUSH — Traditional Medicine
  'AYUSH regulations Ayurveda Unani Siddha India',
];

export const ROOT_URLS = [
  'https://www.fssai.gov.in/cms/food-safety-and-standards-regulations.php',
  'https://www.fssai.gov.in/cms/directions-under-fss-act.php',
  'https://cdsco.gov.in/opencms/opencms/en/Cosmetics/cosmetics/',
  'https://www.bis.gov.in/product-certification/products-under-compulsory-certification/',
  'https://main.ayush.gov.in/acts-rules/',
];

// Domains that require Browser Use (JS-rendered or interactive portals)
export const BROWSER_USE_DOMAINS = [
  'egazette.gov.in',
  'foscos.fssai.gov.in',
  'sugam.cdsco.gov.in',
];

export function classifyRegulatoryBody(
  url: string
): 'FSSAI' | 'CDSCO' | 'BIS' | 'AYUSH' | 'OTHER' {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('fssai.gov.in')) return 'FSSAI';
  if (hostname.includes('cdsco.gov.in')) return 'CDSCO';
  if (hostname.includes('bis.gov.in')) return 'BIS';
  if (hostname.includes('ayush.gov.in')) return 'AYUSH';
  if (hostname.includes('indiacode.nic.in')) return 'FSSAI';
  if (hostname.includes('egazette.gov.in')) return 'FSSAI';
  return 'OTHER';
}
