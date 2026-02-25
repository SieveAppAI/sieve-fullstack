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

const SG_SEED_SOURCES: SeedSource[] = [
  // ===== SFA — Food =====
  {
    url: 'https://www.sfa.gov.sg/legislation/food-safety-and-security-act',
    title: 'Food Safety and Security Act',
    regulatory_body: 'SFA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.sfa.gov.sg/legislation',
    title: 'SFA Legislation Overview',
    regulatory_body: 'SFA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.sfa.gov.sg/regulatory-standards-frameworks-guidelines/food-safety-regulatory-limits/overview-on-food-safety-regulatory-limits',
    title: 'Food Safety Regulatory Limits Overview',
    regulatory_body: 'SFA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.sfa.gov.sg/food-information/nutrition-labelling',
    title: 'Nutrition Labelling Guidelines',
    regulatory_body: 'SFA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.sfa.gov.sg/food-information/nutrition-health-claims',
    title: 'Health & Nutrition Claims',
    regulatory_body: 'SFA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.sfa.gov.sg/nutri-grade',
    title: 'Nutri-Grade Labelling',
    regulatory_body: 'SFA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.sfa.gov.sg/food-information/food-allergy-and-intolerance',
    title: 'Allergen Requirements',
    regulatory_body: 'SFA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.sfa.gov.sg/food-businesses/imports',
    title: 'Import Requirements',
    regulatory_body: 'SFA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.sfa.gov.sg/food-businesses/novel-food',
    title: 'Novel Foods',
    regulatory_body: 'SFA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.sfa.gov.sg/public-consultation',
    title: 'Public Consultations',
    regulatory_body: 'SFA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'daily',
  },
  {
    url: 'https://www.sfa.gov.sg/bringing-food-for-private-consumption-from-overseas/list-of-food---food-products-allowed',
    title: 'Allowed Food & Food Products',
    regulatory_body: 'SFA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== HSA — Cosmetics =====
  {
    url: 'https://www.hsa.gov.sg/cosmetic-products/overview',
    title: 'Cosmetic Products Overview',
    regulatory_body: 'HSA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.hsa.gov.sg/cosmetic-products/asean-cosmetic-directive',
    title: 'ASEAN Cosmetic Directive',
    regulatory_body: 'HSA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.hsa.gov.sg/cosmetic-products/notification',
    title: 'Cosmetic Notification',
    regulatory_body: 'HSA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.hsa.gov.sg/cosmetic-products/gmp',
    title: 'GMP Certification',
    regulatory_body: 'HSA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },

  // ===== HSA — Health Supplements =====
  {
    url: 'https://www.hsa.gov.sg/health-supplements',
    title: 'Health Supplements Overview',
    regulatory_body: 'HSA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.hsa.gov.sg/vns',
    title: 'Voluntary Notification Scheme',
    regulatory_body: 'HSA',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to the HSA VNS page. Find the positive ingredient list or search tool. Iterate through categories A-Z to extract all approved health supplement ingredients with their conditions of use.',
    frequency: 'monthly',
  },
  {
    url: 'https://www.hsa.gov.sg/health-supplements/claims',
    title: 'Health Supplement Claims',
    regulatory_body: 'HSA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.hsa.gov.sg/health-supplements/list-of-notified-hs-and-tm',
    title: 'List of Notified HS and TM',
    regulatory_body: 'HSA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== SSO — Legislation (Browser Use required) =====
  {
    url: 'https://sso.agc.gov.sg/Act/SFA1973',
    title: 'Sale of Food Act (Cap 283)',
    regulatory_body: 'SSO',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to the Sale of Food Act page. Wait for JavaScript to render the full legislative text. Extract the complete text including all sections and schedules.',
    frequency: 'monthly',
  },
  {
    url: 'https://sso.agc.gov.sg/SL/SFA1973-RG1',
    title: 'Food Regulations',
    regulatory_body: 'SSO',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to the Food Regulations page. Wait for JavaScript to render. Extract the complete regulatory text including all schedules with permitted food additives, limits, and conditions.',
    frequency: 'monthly',
  },
  {
    url: 'https://sso.agc.gov.sg/Acts-Supp/27-2024',
    title: 'Food Safety and Security Act 2024',
    regulatory_body: 'SSO',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to the FSSA 2024 page. Wait for JavaScript to render. Extract the complete act text.',
    frequency: 'monthly',
  },
  {
    url: 'https://sso.agc.gov.sg/Act/HPA2007',
    title: 'Health Products Act',
    regulatory_body: 'SSO',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to the Health Products Act page. Wait for JavaScript to render. Extract the complete text.',
    frequency: 'monthly',
  },
  {
    url: 'https://sso.agc.gov.sg/SL/HPA2007-S321-2007',
    title: 'Cosmetic Product Regulations',
    regulatory_body: 'SSO',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to the cosmetic product regulations page. Wait for JavaScript to render. Extract the complete regulatory text.',
    frequency: 'monthly',
  },
];

export async function seedSGSources() {
  const supabase = createServiceClient();

  for (const source of SG_SEED_SOURCES) {
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
        jurisdiction: 'SG',
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

  return { seeded: SG_SEED_SOURCES.length };
}
