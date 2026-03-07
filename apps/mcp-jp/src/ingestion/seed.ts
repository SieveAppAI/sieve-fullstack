import { createServiceClient } from '@sieve/db';

interface SeedSource {
  url: string;
  title: string;
  regulatory_body: string;
  content_type: 'html' | 'pdf';
  ingestion_tier: 'exa' | 'browser_use';
  browser_use_task?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
}

const JP_SEED_SOURCES: SeedSource[] = [
  // ===== FFCR — Food Additives =====
  {
    url: 'https://www.ffcr.or.jp/en/tenka/list-of-designated-additives/list-of-designated-additives.html',
    title: 'Designated Additives List (476+ government-approved)',
    regulatory_body: 'FFCR',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.ffcr.or.jp/en/tenka/index.html',
    title: 'Existing Food Additives Index (365 natural-origin)',
    regulatory_body: 'FFCR',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.ffcr.or.jp/en/tenka/specifications-and-standards-for-food-additives/specifications-and-standards-for-food-additives-8th-edition.html',
    title: 'Food Additive Specifications & Standards (8th Edition)',
    regulatory_body: 'FFCR',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },
  {
    url: 'https://www.ffcr.or.jp/en/zanryu/index.html',
    title: 'Maximum Residue Limits (Pesticides & Veterinary Drugs)',
    regulatory_body: 'FFCR',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== MHLW — Food Safety & Cosmetics =====
  {
    url: 'https://www.mhlw.go.jp/english/topics/foodsafety/index.html',
    title: 'MHLW Food Safety Topics',
    regulatory_body: 'MHLW',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.mhlw.go.jp/english/topics/importedfoods/index.html',
    title: 'Imported Foods Safety (Import Notification System)',
    regulatory_body: 'MHLW',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iyakuhin/keshouhin/index.html',
    title: 'MHLW Cosmetics Standards Overview',
    regulatory_body: 'MHLW',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== CAA — Food Labelling & Claims =====
  {
    url: 'https://www.caa.go.jp/en/policy/food_labeling/',
    title: 'CAA Food Labelling Policy (English)',
    regulatory_body: 'CAA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fld.caa.go.jp/caaks/cssc01/',
    title: 'FFC Notification Database (Foods with Function Claims)',
    regulatory_body: 'CAA',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to the FFC notification database. This is a Japanese-only JS-rendered portal. Search for recent notifications. Extract product names, functional claims, responsible ingredients, and notification numbers. Iterate through pages to capture as many entries as possible.',
    frequency: 'weekly',
  },
  {
    url: 'https://www.caa.go.jp/en/policy/standards_evaluation/food_additives_en',
    title: 'CAA Food Additives Portal (English)',
    regulatory_body: 'CAA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== JCIA — Cosmetics Industry Self-Regulation =====
  {
    url: 'https://www.jcia.org/en/approach/compliance/general',
    title: 'JCIA Compliance Overview (Positive/Negative Lists)',
    regulatory_body: 'JCIA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },

  // ===== NITE — Chemical Database =====
  {
    url: 'https://www.nite.go.jp/en/chem/chrip/chrip_search/systemTop',
    title: 'NITE-CHRIP Chemical Database (250K+ chemicals incl. JCIA cosmetics data)',
    regulatory_body: 'NITE',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to the NITE-CHRIP database. Search for cosmetics-related chemical entries. The database includes JCIA positive/negative list data since January 2025. Export or extract ingredient names, CAS numbers, regulatory status, and any restriction details.',
    frequency: 'monthly',
  },

  // ===== FSCJ — Food Safety Commission =====
  {
    url: 'https://www.fsc.go.jp/english/evaluationreports/additives_e3.html',
    title: 'FSCJ Risk Assessment Reports (Food Additives)',
    regulatory_body: 'FSCJ',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },

  // ===== Legislation — Japanese Law Translation =====
  {
    url: 'https://www.japaneselawtranslation.go.jp/en/laws/view/3687/en',
    title: 'Food Sanitation Act (English Translation)',
    regulatory_body: 'MHLW',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },
  {
    url: 'https://www.japaneselawtranslation.go.jp/en/laws/view/3849/en',
    title: 'Food Labelling Act (English Translation)',
    regulatory_body: 'CAA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },
  {
    url: 'https://www.japaneselawtranslation.go.jp/en/laws/view/3213/en',
    title: 'Pharmaceutical & Medical Devices Act (English Translation)',
    regulatory_body: 'MHLW',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },

  // ===== NIHS — Additive Specifications Database =====
  {
    url: 'https://dfa25.nihs.go.jp/jssfa/index.php',
    title: 'JSSFA 9th Edition Specifications Database',
    regulatory_body: 'MHLW',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to the NIHS JSSFA database. This portal may require JavaScript. Search for food additive specifications. Extract additive names, specifications, purity criteria, and test methods.',
    frequency: 'monthly',
  },
];

export async function seedJPSources() {
  const supabase = createServiceClient();

  for (const source of JP_SEED_SOURCES) {
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
        jurisdiction: 'JP',
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

  return { seeded: JP_SEED_SOURCES.length };
}
