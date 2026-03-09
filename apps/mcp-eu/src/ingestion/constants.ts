export const EU_REGULATORY_DOMAINS = [
  'eur-lex.europa.eu',
  'ec.europa.eu',
  'efsa.europa.eu',
  'echa.europa.eu',
  'data.europa.eu',
  'webgate.ec.europa.eu',
];

export const DISCOVERY_QUERIES = [
  // Cosmetics Regulation (EC) 1223/2009
  'EU cosmetics regulation 1223/2009 prohibited restricted substances annex',
  'EU cosmetics regulation annex II banned substances list',
  'EU cosmetics regulation annex III restricted ingredients conditions',
  'EU cosmetics regulation annex IV permitted colorants',
  'EU cosmetics regulation annex V permitted preservatives',
  'EU cosmetics regulation annex VI permitted UV filters',
  'CosIng cosmetic ingredient database INCI names regulatory status',
  // Food Additives (EC) 1333/2008
  'EU food additives regulation 1333/2008 union list E-numbers',
  'EU food additives permitted list conditions of use food categories',
  'EU food additives E-numbers maximum levels restrictions',
  // Food Information to Consumers (EU) 1169/2011
  'EU food labelling regulation 1169/2011 FIC requirements',
  'EU allergen declaration 14 mandatory allergens annex II',
  'EU nutrition declaration labelling requirements',
  'EU food information consumers mandatory particulars',
  // Nutrition & Health Claims (EC) 1924/2006
  'EU nutrition health claims regulation 1924/2006 authorised list',
  'EU health claims register authorised rejected article 13 14',
  'EU nutrition claims conditions annex',
  // Food Supplements Directive 2002/46/EC
  'EU food supplements directive 2002/46 vitamins minerals permitted forms',
  'EU food supplements labelling requirements',
  // Novel Foods (EU) 2015/2283
  'EU novel food regulation 2015/2283 union list authorised',
  'EU novel food catalogue traditional third country',
  // EFSA Scientific Opinions
  'EFSA scientific opinion food safety risk assessment',
  'EFSA tolerable upper intake levels vitamins minerals',
  'EFSA OpenFoodTox chemical hazard database',
  // ECHA / Chemical Safety
  'ECHA SVHC candidate list substances very high concern',
  'REACH regulation restricted substances cosmetics',
];

export const ROOT_URLS = [
  'https://ec.europa.eu/growth/sectors/cosmetics_en',
  'https://ec.europa.eu/food/safety/labelling-and-nutrition_en',
  'https://ec.europa.eu/food/safety/food-improvement-agents/additives_en',
  'https://www.efsa.europa.eu/en/topics/topic/food-additives',
  'https://www.efsa.europa.eu/en/topics/topic/food-supplements',
  'https://echa.europa.eu/candidate-list-table',
];

// Domains that require Browser Use (JS-rendered Angular SPAs)
export const BROWSER_USE_DOMAINS = [
  'webgate.ec.europa.eu',
  'ec.europa.eu/food/food-feed-portal',
];

// Bulk download sources — XLS/XLSX/CSV files available for direct download
export const BULK_DOWNLOAD_SOURCES = [
  {
    id: 'cosing_ingredients',
    name: 'CosIng Ingredients Inventory',
    url: 'https://data.europa.eu/data/datasets/cosmetic-ingredient-database-ingredients-and-fragrance-inventory',
    format: 'xls' as const,
    regulatory_body: 'EC' as const,
    description: '15,000+ cosmetic ingredients with INCI, CAS, functions, restrictions',
  },
  {
    id: 'health_claims_register',
    name: 'EU Health Claims Register',
    url: 'https://ec.europa.eu/food/food-feed-portal/screen/health-claims/eu-register',
    format: 'xlsx' as const,
    regulatory_body: 'EC' as const,
    description: '2,200+ authorised and rejected health claims with conditions',
  },
  {
    id: 'openfoodtox',
    name: 'EFSA OpenFoodTox 2.0',
    url: 'https://zenodo.org/records/8120114',
    format: 'xlsx' as const,
    regulatory_body: 'EFSA' as const,
    description: '5,700+ substances with ADI, TDI, ARfD, toxicological endpoints',
  },
] as const;

// EUR-Lex CELEX IDs for P0 regulations (consolidated versions)
export const EUR_LEX_CELEX_IDS = [
  {
    celex: '02009R1223',
    title: 'Cosmetics Regulation (EC) 1223/2009',
    regulatory_body: 'EC' as const,
  },
  {
    celex: '02008R1333',
    title: 'Food Additives Regulation (EC) 1333/2008',
    regulatory_body: 'EC' as const,
  },
  {
    celex: '02011R1169',
    title: 'Food Information to Consumers Regulation (EU) 1169/2011',
    regulatory_body: 'EC' as const,
  },
  {
    celex: '02006R1924',
    title: 'Nutrition and Health Claims Regulation (EC) 1924/2006',
    regulatory_body: 'EC' as const,
  },
  {
    celex: '02002L0046',
    title: 'Food Supplements Directive 2002/46/EC',
    regulatory_body: 'EC' as const,
  },
  {
    celex: '32015R2283',
    title: 'Novel Food Regulation (EU) 2015/2283',
    regulatory_body: 'EC' as const,
  },
] as const;

export function classifyRegulatoryBody(
  url: string
): 'EC' | 'EFSA' | 'ECHA' | 'OTHER' {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('efsa.europa.eu')) return 'EFSA';
  if (hostname.includes('echa.europa.eu')) return 'ECHA';
  if (hostname.includes('ec.europa.eu')) return 'EC';
  if (hostname.includes('eur-lex.europa.eu')) return 'EC';
  if (hostname.includes('data.europa.eu')) return 'EC';
  return 'OTHER';
}
