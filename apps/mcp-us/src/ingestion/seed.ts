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

const US_SEED_SOURCES: SeedSource[] = [
  // ===== FDA — Food Additives & GRAS =====
  {
    url: 'https://www.fda.gov/food/food-ingredients-packaging/food-additive-status-list',
    title: 'FDA Food Additive Status List',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fda.gov/food/food-ingredients-packaging/generally-recognized-safe-gras',
    title: 'GRAS Substances Overview',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fda.gov/food/food-ingredients-packaging/gras-notice-inventory',
    title: 'GRAS Notice Inventory',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fda.gov/industry/color-additives/color-additive-status-list',
    title: 'Color Additive Status List',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== FDA — Food Labelling =====
  {
    url: 'https://www.fda.gov/food/food-labeling-nutrition/food-labeling-guide',
    title: 'FDA Food Labeling Guide',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fda.gov/food/food-labeling-nutrition/nutrition-facts-label',
    title: 'Nutrition Facts Label Requirements',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fda.gov/food/food-allergensgluten-free-guidance-documents-regulatory-information/food-allergen-labeling-and-consumer-protection-act-2004-falcpa',
    title: 'FALCPA Allergen Labelling',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fda.gov/food/food-labeling-nutrition/label-claims-conventional-foods-and-dietary-supplements',
    title: 'Label Claims for Foods and Supplements',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== FDA — Import =====
  {
    url: 'https://www.fda.gov/food/importing-food-products-united-states',
    title: 'FDA Food Import Requirements',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fda.gov/food/importing-food-products-united-states/prior-notice-imported-foods',
    title: 'Prior Notice for Imported Foods',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fda.gov/food/importing-food-products-united-states/foreign-supplier-verification-programs-fsvp-importers-food-humans-and-animals',
    title: 'Foreign Supplier Verification Program (FSVP)',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== FDA — Dietary Supplements =====
  {
    url: 'https://www.fda.gov/food/dietary-supplements',
    title: 'Dietary Supplements Overview',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fda.gov/food/dietary-supplements/new-dietary-ingredient-ndi-notification-process',
    title: 'NDI Notification Process',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== FDA — Cosmetics =====
  {
    url: 'https://www.fda.gov/cosmetics',
    title: 'FDA Cosmetics Overview',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fda.gov/cosmetics/cosmetics-laws-regulations/modernization-cosmetics-regulation-act-2022-mocra',
    title: 'MoCRA 2022 — Cosmetics Modernization',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fda.gov/cosmetics/cosmetics-guidance-documents/prohibited-restricted-ingredients-cosmetics',
    title: 'Prohibited & Restricted Cosmetic Ingredients',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== eCFR — Title 21 (Browser Use required) =====
  {
    url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101',
    title: '21 CFR Part 101 — Food Labeling',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to 21 CFR Part 101 (Food Labeling) on eCFR. Wait for the page to fully render. Extract the complete regulatory text including all subparts, sections, and tables.',
    frequency: 'monthly',
  },
  {
    url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-170',
    title: '21 CFR Part 170 — Food Additives General Provisions',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to 21 CFR Part 170 (Food Additives) on eCFR. Wait for the page to fully render. Extract the complete regulatory text including all sections on GRAS and food additive petition procedures.',
    frequency: 'monthly',
  },
  {
    url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-G',
    title: '21 CFR Subchapter G — Cosmetics',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to 21 CFR Subchapter G (Cosmetics) on eCFR. Wait for the page to fully render. Extract the complete regulatory text covering Parts 700-740 including prohibited ingredients and labelling.',
    frequency: 'monthly',
  },

  // ===== FTC — Claims & Advertising =====
  {
    url: 'https://www.ftc.gov/legal-library/browse/rules/health-claims',
    title: 'FTC Health Claims Rules',
    regulatory_body: 'FTC',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.ftc.gov/reports/dietary-supplements-advertising-guide-industry',
    title: 'FTC Dietary Supplement Advertising Guide',
    regulatory_body: 'FTC',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },

  // ===== CIR — Cosmetic Ingredient Review =====
  {
    url: 'https://www.cir-safety.org/ingredients',
    title: 'CIR Reviewed Cosmetic Ingredients',
    regulatory_body: 'CIR',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },

  // ===== FDA — Recent Updates (daily) =====
  {
    url: 'https://www.fda.gov/food/cfsan-constituent-updates',
    title: 'CFSAN Constituent Updates',
    regulatory_body: 'FDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'daily',
  },
];

export async function seedUSSources() {
  const supabase = createServiceClient();

  for (const source of US_SEED_SOURCES) {
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
        jurisdiction: 'US',
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

  return { seeded: US_SEED_SOURCES.length };
}
