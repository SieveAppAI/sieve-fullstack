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

const IN_SEED_SOURCES: SeedSource[] = [
  // ===== FSSAI — Food Safety (HTML / Exa) =====
  {
    url: 'https://www.fssai.gov.in/cms/food-safety-and-standards-regulations.php',
    title: 'FSSAI Regulations Index',
    regulatory_body: 'FSSAI',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fssai.gov.in/cms/gazette-notification.php',
    title: 'FSSAI Gazette Notifications',
    regulatory_body: 'FSSAI',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'daily',
  },
  {
    url: 'https://www.fssai.gov.in/cms/directions-under-fss-act.php',
    title: 'FSSAI Directions under FSS Act',
    regulatory_body: 'FSSAI',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.fssai.gov.in/cms/public-comments.php',
    title: 'FSSAI Public Consultations',
    regulatory_body: 'FSSAI',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'daily',
  },
  {
    url: 'https://www.indiacode.nic.in/handle/123456789/1567',
    title: 'Food Safety and Standards Act 2006',
    regulatory_body: 'FSSAI',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },
  {
    url: 'https://www.indiacode.nic.in/handle/123456789/1764',
    title: 'Drugs and Cosmetics Act 1940',
    regulatory_body: 'CDSCO',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },

  // ===== CDSCO — Cosmetics (HTML / Exa) =====
  {
    url: 'https://cdsco.gov.in/opencms/opencms/en/Cosmetics/cosmetics/',
    title: 'CDSCO Cosmetics Overview',
    regulatory_body: 'CDSCO',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== BIS — Standards (HTML / Exa) =====
  {
    url: 'https://www.bis.gov.in/product-certification/products-under-compulsory-certification/',
    title: 'BIS Compulsory Certification Products',
    regulatory_body: 'BIS',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== AYUSH — Traditional Medicine (HTML / Exa) =====
  {
    url: 'https://main.ayush.gov.in/acts-rules/',
    title: 'AYUSH Acts & Rules',
    regulatory_body: 'AYUSH',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },

  // ===== FSSAI — PDF Sources (Manual tier) =====
  {
    url: 'https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Food_Additives_Regulations_08_09_2020.pdf',
    title: 'FSSAI Food Additives Compendium',
    regulatory_body: 'FSSAI',
    content_type: 'pdf',
    ingestion_tier: 'manual',
    frequency: 'monthly',
  },
  {
    url: 'https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Labelling_Display_29_03_2022.pdf',
    title: 'FSSAI Labelling & Display Compendium',
    regulatory_body: 'FSSAI',
    content_type: 'pdf',
    ingestion_tier: 'manual',
    frequency: 'monthly',
  },
  {
    url: 'https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Nutraceuticals_23_05_2022.pdf',
    title: 'FSSAI Nutraceuticals Compendium',
    regulatory_body: 'FSSAI',
    content_type: 'pdf',
    ingestion_tier: 'manual',
    frequency: 'monthly',
  },
  {
    url: 'https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Advertising_Claims_04_01_2019.pdf',
    title: 'FSSAI Advertising & Claims Regulations',
    regulatory_body: 'FSSAI',
    content_type: 'pdf',
    ingestion_tier: 'manual',
    frequency: 'monthly',
  },
  {
    url: 'https://cdsco.gov.in/opencms/export/sites/CDSCO_WEB/Pdf-documents/cosmetics/CosmeticRules2020.pdf',
    title: 'Cosmetics Rules 2020 (Gazette)',
    regulatory_body: 'CDSCO',
    content_type: 'pdf',
    ingestion_tier: 'manual',
    frequency: 'monthly',
  },

  // ===== eGazette — Browser Use =====
  {
    url: 'https://egazette.gov.in/',
    title: 'eGazette India (FSSAI Notifications)',
    regulatory_body: 'FSSAI',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task:
      'Navigate to the eGazette search page. Search for "FSSAI" or "Food Safety and Standards" in recent extraordinary gazette notifications. Extract the full text of the most recent 10 FSSAI-related gazette notifications.',
    frequency: 'weekly',
  },
];

export async function seedINSources() {
  const supabase = createServiceClient();

  for (const source of IN_SEED_SOURCES) {
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
        jurisdiction: 'IN',
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

  return { seeded: IN_SEED_SOURCES.length };
}
