import { createServiceClient } from '@sieve/db';

interface SeedSource {
  url: string;
  title: string;
  regulatory_body: string;
  content_type: 'html' | 'pdf';
  ingestion_tier: 'exa' | 'browser_use' | 'manual_upload';
  browser_use_task?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  jurisdiction_tag: 'AU' | 'NZ' | 'AU_NZ';
  notes?: string;
}

const AU_NZ_SEED_SOURCES: SeedSource[] = [
  // ===== FSANZ — Food Standards Code (legislation.gov.au) =====
  {
    url: 'https://www.legislation.gov.au/F2015L00439/latest/text',
    title: 'Schedule 15 — Permitted Food Additives',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
    jurisdiction_tag: 'AU_NZ',
  },
  {
    url: 'https://www.legislation.gov.au/F2015L00432/latest/text',
    title: 'Schedule 8 — Food Additive Names and Codes',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
    jurisdiction_tag: 'AU_NZ',
  },
  {
    url: 'https://www.legislation.gov.au/F2015L00392/latest/text',
    title: 'Standard 1.2.1 — Labelling Requirements',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
    jurisdiction_tag: 'AU_NZ',
  },
  {
    url: 'https://www.legislation.gov.au/F2015L00395/latest/text',
    title: 'Standard 1.2.3 — Warning and Advisory Statements',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
    jurisdiction_tag: 'AU_NZ',
  },
  {
    url: 'https://www.legislation.gov.au/F2015L00396/latest/text',
    title: 'Standard 1.2.4 — Labelling of Ingredients',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
    jurisdiction_tag: 'AU_NZ',
  },
  {
    url: 'https://www.legislation.gov.au/F2015L00394/latest/text',
    title: 'Standard 1.2.7 — Nutrition, Health and Related Claims',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
    jurisdiction_tag: 'AU_NZ',
  },
  {
    url: 'https://www.legislation.gov.au/F2015L00474/latest/text',
    title: 'Schedule 4 — Permitted Health Claims',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
    jurisdiction_tag: 'AU_NZ',
  },
  {
    url: 'https://www.legislation.gov.au/F2015L00397/latest/text',
    title: 'Standard 1.2.8 — Nutrition Information Panel',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
    jurisdiction_tag: 'AU_NZ',
  },

  // ===== P1 FSANZ Sources =====
  {
    url: 'https://www.legislation.gov.au/F2015L00463/latest/text',
    title: 'Schedule 25 — Permitted Novel Foods',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
    jurisdiction_tag: 'AU_NZ',
  },
  {
    url: 'https://www.legislation.gov.au/F2015L00402/latest/text',
    title: 'Standard 1.4.1 — Contaminants and Natural Toxicants',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
    jurisdiction_tag: 'AU_NZ',
  },
  {
    url: 'https://www.legislation.gov.au/F2015L00447/latest/text',
    title: 'Schedule 19 — Maximum Levels of Contaminants',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
    jurisdiction_tag: 'AU_NZ',
  },

  // ===== TGA — Therapeutic Goods (AU only) =====
  {
    url: 'https://www.tga.gov.au/resources/resource/guidance/permissible-ingredients-determination',
    title: 'TGA Permissible Ingredients Determination',
    regulatory_body: 'TGA',
    content_type: 'pdf',
    ingestion_tier: 'manual_upload',
    frequency: 'monthly',
    jurisdiction_tag: 'AU',
    notes: 'Multi-volume PDF (~1500 pages). Download from TGA website and upload manually.',
  },
  {
    url: 'https://www.tga.gov.au/how-we-regulate/manufacturing/manufacturing-listed-medicines/permitted-indications-listed-medicines',
    title: 'TGA Permitted Indications for Listed Medicines',
    regulatory_body: 'TGA',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task: 'Navigate to the TGA permitted indications page. Wait for JavaScript to render. Extract the complete list of permitted indications for listed medicines including conditions and limitations.',
    frequency: 'monthly',
    jurisdiction_tag: 'AU',
  },

  // ===== AICIS — Industrial Chemicals (AU only) =====
  {
    url: 'https://www.industrialchemicals.gov.au/consumers-and-community/australian-inventory-industrial-chemicals-aiic',
    title: 'Australian Inventory of Industrial Chemicals (AIIC)',
    regulatory_body: 'AICIS',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
    jurisdiction_tag: 'AU',
  },

  // ===== Medsafe — Dietary Supplements (NZ only) =====
  {
    url: 'https://www.medsafe.govt.nz/regulatory/dietary-supplements.asp',
    title: 'Medsafe Dietary Supplement Regulations',
    regulatory_body: 'MEDSAFE',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
    jurisdiction_tag: 'NZ',
  },
  {
    url: 'https://www.legislation.govt.nz/regulation/public/1985/0208/latest/whole.html',
    title: 'NZ Dietary Supplements Regulations 1985',
    regulatory_body: 'MEDSAFE',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
    jurisdiction_tag: 'NZ',
  },

  // ===== NZ EPA — Hazardous Substances (NZ only) =====
  {
    url: 'https://www.epa.govt.nz/industry-areas/hazardous-substances/new-zealand-inventory-of-chemicals-nzioc',
    title: 'New Zealand Inventory of Chemicals (NZIoC)',
    regulatory_body: 'NZ_EPA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
    jurisdiction_tag: 'NZ',
  },

  // ===== FSANZ Website (Browser Use) =====
  {
    url: 'https://www.foodstandards.gov.au/food-standards-code',
    title: 'FSANZ Food Standards Code Overview',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task: 'Navigate to the FSANZ Food Standards Code page. This is a Drupal-based site. Wait for JavaScript to render. Extract the complete page content including all links to individual standards and schedules.',
    frequency: 'monthly',
    jurisdiction_tag: 'AU_NZ',
  },
  {
    url: 'https://www.foodstandards.gov.au/consumer-information/food-labelling',
    title: 'FSANZ Food Labelling Information',
    regulatory_body: 'FSANZ',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task: 'Navigate to the FSANZ food labelling page. Wait for content to render. Extract all labelling guidance including allergen, country of origin, and nutrition labelling requirements.',
    frequency: 'monthly',
    jurisdiction_tag: 'AU_NZ',
  },
];

export async function seedAUNZSources() {
  const supabase = createServiceClient();

  for (const source of AU_NZ_SEED_SOURCES) {
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
        jurisdiction: source.jurisdiction_tag,
        content_type: source.content_type,
        ingestion_tier: source.ingestion_tier,
        browser_use_task: source.browser_use_task ?? null,
        scrape_status: source.ingestion_tier === 'manual_upload' ? 'pending_upload' : 'pending',
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

  return { seeded: AU_NZ_SEED_SOURCES.length };
}
