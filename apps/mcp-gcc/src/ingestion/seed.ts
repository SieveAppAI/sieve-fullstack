import { createServiceClient } from '@sieve/db';

interface SeedSource {
  url: string;
  title: string;
  regulatory_body: string;
  content_type: 'html' | 'pdf';
  ingestion_tier: 'exa' | 'browser_use' | 'manual';
  browser_use_task?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
}

const GCC_SEED_SOURCES: SeedSource[] = [
  // ===== SFDA — Food (P0) =====
  {
    url: 'https://sfda.gov.sa/en/regulations?tags=1',
    title: 'SFDA Food Regulations',
    regulatory_body: 'SFDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://sfda.gov.sa/en/regulations',
    title: 'SFDA Regulations Overview',
    regulatory_body: 'SFDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://sfda.gov.sa/en/food',
    title: 'SFDA Food Safety Portal',
    regulatory_body: 'SFDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://sfda.gov.sa/en/food/import',
    title: 'SFDA Food Import Requirements',
    regulatory_body: 'SFDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://sfda.gov.sa/en/warnings',
    title: 'SFDA Warnings & Alerts',
    regulatory_body: 'SFDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'daily',
  },

  // ===== SFDA — Cosmetics (P0) =====
  {
    url: 'https://sfda.gov.sa/en/regulations?tags=47',
    title: 'SFDA Cosmetics Regulations',
    regulatory_body: 'SFDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== SFDA — Halal (P0) =====
  {
    url: 'https://sfda.gov.sa/en/regulations?tags=50',
    title: 'SFDA Halal Regulations',
    regulatory_body: 'SFDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== SFDA — Nutrition & Supplements (P0) =====
  {
    url: 'https://sfda.gov.sa/en/regulations?tags=69',
    title: 'SFDA Nutrition Regulations',
    regulatory_body: 'SFDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://sfda.gov.sa/en/regulations?tags=48',
    title: 'SFDA Supplements Regulations',
    regulatory_body: 'SFDA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== GSO Standards (P1) =====
  {
    url: 'https://www.gso.org.sa/en/',
    title: 'GSO Standards Portal',
    regulatory_body: 'GSO',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },
  {
    url: 'https://store.gso.org.sa/',
    title: 'GSO Standards Store',
    regulatory_body: 'GSO',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to the GSO standards store. Search for food-related standards (GSO 9, GSO 2055, GSO 1943, GSO 2500, GSO 2148). Extract standard titles, numbers, scope, and status for each result.',
    frequency: 'monthly',
  },

  // ===== UAE — MoIAT (P1) =====
  {
    url: 'https://moiat.gov.ae/en/about-us/laws-and-legislation',
    title: 'UAE MoIAT Laws & Legislation',
    regulatory_body: 'MOIAT',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== UAE — Dubai Municipality (P1) =====
  {
    url: 'https://www.dm.gov.ae/municipality-business/food-traders-establishments/',
    title: 'Dubai Municipality Food Traders',
    regulatory_body: 'DM',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== Bahrain — NHRA (P1) =====
  {
    url: 'https://www.nhra.bh/',
    title: 'NHRA Bahrain Portal',
    regulatory_body: 'NHRA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== SFDA — PDF Sources (manual tier) =====
  {
    url: 'https://sfda.gov.sa/sites/default/files/2021-04/Registration%20Guide%20of%20Food%20Supplements%20and%20Energy%20Drinks.pdf',
    title: 'SFDA Supplement & Energy Drinks Registration Guide',
    regulatory_body: 'SFDA',
    content_type: 'pdf',
    ingestion_tier: 'manual',
    frequency: 'monthly',
  },
  {
    url: 'https://www.sfda.gov.sa/sites/default/files/2025-04/ConditionsRequirementsFoodClearanceE.pdf',
    title: 'SFDA Food Clearance Conditions & Requirements',
    regulatory_body: 'SFDA',
    content_type: 'pdf',
    ingestion_tier: 'manual',
    frequency: 'monthly',
  },
  {
    url: 'https://sfda.gov.sa/sites/default/files/2021-05/GuidanceRequirementsCosmeticProductNotification.pdf',
    title: 'SFDA Cosmetic Product Notification Requirements',
    regulatory_body: 'SFDA',
    content_type: 'pdf',
    ingestion_tier: 'manual',
    frequency: 'monthly',
  },
];

// GSO standard PDFs (GSO 9, GSO 2055, GSO 1943, GSO 2148) — purchased separately, not publicly available

export async function seedGCCSources() {
  const supabase = createServiceClient();

  for (const source of GCC_SEED_SOURCES) {
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
        jurisdiction: 'GCC',
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

  return { seeded: GCC_SEED_SOURCES.length };
}
