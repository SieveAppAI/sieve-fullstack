import { createServiceClient } from '@sieve/db';

interface SeedSource {
  url: string;
  title: string;
  regulatory_body: string;
  content_type: 'html' | 'pdf';
  ingestion_tier: 'exa' | 'browser_use' | 'eurlex' | 'bulk_download';
  browser_use_task?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
}

const EU_SEED_SOURCES: SeedSource[] = [
  // ===== EUR-Lex — Core Legislation =====
  {
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02009R1223',
    title: 'Cosmetics Regulation (EC) 1223/2009',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'eurlex',
    frequency: 'monthly',
  },
  {
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02008R1333',
    title: 'Food Additives Regulation (EC) 1333/2008',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'eurlex',
    frequency: 'monthly',
  },
  {
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02011R1169',
    title: 'Food Information to Consumers Regulation (EU) 1169/2011',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'eurlex',
    frequency: 'monthly',
  },
  {
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02006R1924',
    title: 'Nutrition and Health Claims Regulation (EC) 1924/2006',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'eurlex',
    frequency: 'monthly',
  },
  {
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02002L0046',
    title: 'Food Supplements Directive 2002/46/EC',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'eurlex',
    frequency: 'monthly',
  },
  {
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32015R2283',
    title: 'Novel Food Regulation (EU) 2015/2283',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'eurlex',
    frequency: 'monthly',
  },

  // ===== EUR-Lex — Additional Legislation =====
  {
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02002R0178',
    title: 'General Food Law Regulation (EC) 178/2002',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'eurlex',
    frequency: 'monthly',
  },
  {
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32012R1047',
    title: 'Amendment to Health Claims Regulation (EU) 1047/2012',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'eurlex',
    frequency: 'monthly',
  },
  {
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02006R1925',
    title: 'Food Fortification Regulation (EC) 1925/2006',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'eurlex',
    frequency: 'monthly',
  },
  {
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02011R1129',
    title: 'Union List of Food Additives Regulation (EU) 1129/2011',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'eurlex',
    frequency: 'monthly',
  },
  {
    url: 'https://eur-lex.europa.eu/EN/legal-content/summary/nutrition-and-health-claims-made-on-foods.html',
    title: 'Health Claims Summary Page',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== EC — Food Safety Portal =====
  {
    url: 'https://ec.europa.eu/food/safety/food-improvement-agents/additives_en',
    title: 'EU Food Additives Overview',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://food.ec.europa.eu/food-safety/labelling-and-nutrition_en',
    title: 'EC Food Safety — Labelling and Nutrition',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://ec.europa.eu/food/safety/labelling-and-nutrition_en',
    title: 'EU Labelling and Nutrition',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://ec.europa.eu/growth/sectors/cosmetics_en',
    title: 'EU Cosmetics Sector Overview',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== EFSA =====
  {
    url: 'https://www.efsa.europa.eu/en/topics/topic/food-additives',
    title: 'EFSA — Food Additives',
    regulatory_body: 'EFSA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.efsa.europa.eu/en/topics/topic/food-supplements',
    title: 'EFSA — Food Supplements',
    regulatory_body: 'EFSA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values',
    title: 'EFSA — Dietary Reference Values',
    regulatory_body: 'EFSA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },

  // ===== ECHA =====
  {
    url: 'https://echa.europa.eu/candidate-list-table',
    title: 'ECHA SVHC Candidate List',
    regulatory_body: 'ECHA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },
  {
    url: 'https://echa.europa.eu/substances-restricted-under-reach',
    title: 'ECHA — Restricted Substances (REACH Annex XVII)',
    regulatory_body: 'ECHA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },

  // ===== Browser Use — Angular SPAs =====
  {
    url: 'https://ec.europa.eu/food/food-feed-portal/screen/food-additives',
    title: 'EU Food Additives Database (FIP)',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'This is the EU Food Additives Database — an Angular SPA. Wait for the page to fully render. Browse the list of food additives. Extract E-number, name, category, and conditions of use.',
    frequency: 'monthly',
  },
  {
    url: 'https://ec.europa.eu/food/food-feed-portal/screen/novel-food-catalogue/search',
    title: 'EU Novel Food Catalogue (FIP)',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'This is the EU Novel Food Catalogue — an Angular SPA. Wait for the page to render. Browse or search the catalogue. Extract ingredient names and their novel food status.',
    frequency: 'monthly',
  },
  {
    url: 'https://webgate.ec.europa.eu/rasff-window/screen/list',
    title: 'RASFF Window (Safety Notifications)',
    regulatory_body: 'EC',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'This is the RASFF portal — an Angular SPA. Extract recent food safety notifications including type, date, product, hazard, and notifying country.',
    frequency: 'weekly',
  },
];

export async function seedEUSources() {
  const supabase = createServiceClient();

  for (const source of EU_SEED_SOURCES) {
    const { data: existing } = await supabase
      .from('regulatory_sources')
      .select('id')
      .eq('url', source.url)
      .single();

    if (existing) continue;

    const { data: inserted, error } = await supabase
      .from('regulatory_sources')
      .insert({
        url: source.url,
        title: source.title,
        domain: new URL(source.url).hostname,
        regulatory_body: source.regulatory_body,
        jurisdiction: 'EU',
        content_type: source.content_type,
        ingestion_tier: source.ingestion_tier,
        browser_use_task: source.browser_use_task ?? null,
        scrape_status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Failed to seed ${source.url}:`, error);
      continue;
    }

    if (inserted) {
      await supabase.from('scrape_schedule').insert({
        source_id: inserted.id,
        frequency: source.frequency,
        enabled: true,
      });
    }
  }

  return { seeded: EU_SEED_SOURCES.length };
}
