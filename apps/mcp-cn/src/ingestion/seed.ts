import { createServiceClient } from '@sieve/db';

interface SeedSource {
  url: string;
  title: string;
  regulatory_body: string;
  content_type: 'html' | 'pdf';
  ingestion_tier: 'exa' | 'browser_use' | 'manual_upload';
  browser_use_task?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
}

const CN_SEED_SOURCES: SeedSource[] = [
  // ===== CFSA — Food Safety Standards =====
  {
    url: 'https://sppt.cfsa.net.cn:8086/',
    title: 'CFSA Food Safety Standards Database',
    regulatory_body: 'CFSA',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task: 'Navigate the CFSA food safety standards platform. This is a Chinese-language JS-rendered portal on non-standard port 8086. Search for and extract GB food safety standards listings, including GB 2760 (food additives), GB 7718 (food labelling), GB 28050 (nutrition labelling). Extract standard numbers, titles, status, and effective dates.',
    frequency: 'monthly',
  },
  {
    url: 'https://www.nhc.gov.cn/sps/spjk/',
    title: 'NHC Food Safety Standards Hub',
    regulatory_body: 'NHC',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== SAMR — Health Food (Supplements) =====
  {
    url: 'https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/spcjs/',
    title: 'SAMR Food Safety Supervision (Health Food)',
    regulatory_body: 'SAMR',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/tscps/',
    title: 'SAMR Special Food Products (Health Food, Infant Formula)',
    regulatory_body: 'SAMR',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== NMPA — Cosmetics =====
  {
    url: 'https://english.nmpa.gov.cn/',
    title: 'NMPA English Portal',
    regulatory_body: 'NMPA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://www.nmpa.gov.cn/hzhp/',
    title: 'NMPA Cosmetics Section',
    regulatory_body: 'NMPA',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task: 'Navigate the NMPA cosmetics section (Chinese). Extract regulatory announcements, cosmetics registration requirements, ingredient regulations, and enforcement actions. Get the list of recent announcements with titles and dates.',
    frequency: 'weekly',
  },

  // ===== SAC / SAMR — GB Standards =====
  {
    url: 'https://openstd.samr.gov.cn/',
    title: 'National Standards Full-Text System (openstd)',
    regulatory_body: 'SAC',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task: 'Navigate the China national standards full-text system (openstd.samr.gov.cn). This is a JS-rendered portal. Search for food safety GB standards (GB 2760, GB 7718, GB 28050, GB 14880, GB 2761, GB 2762). Extract the full text of each standard if available, or extract the standard metadata (number, title, status, effective date, ICS code).',
    frequency: 'monthly',
  },

  // ===== GACC — Import/Export =====
  {
    url: 'https://english.customs.gov.cn/',
    title: 'GACC English Portal (Customs)',
    regulatory_body: 'GACC',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
  {
    url: 'https://english.customs.gov.cn/Statics/2ea54ab8-3024-49b6-954d-ccc5b0475db6.html',
    title: 'GACC Decrees 248 & 249 — Imported Food Registration',
    regulatory_body: 'GACC',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'monthly',
  },

  // ===== NPC — Legislation =====
  {
    url: 'https://flk.npc.gov.cn/',
    title: 'NPC Legislation Database',
    regulatory_body: 'OTHER',
    content_type: 'html',
    ingestion_tier: 'browser_use',
    browser_use_task: 'Navigate the NPC legislation database (flk.npc.gov.cn). Search for "食品安全法" (Food Safety Law) and "化妆品监督管理条例" (Cosmetics Supervision Regulation). Extract the full text of each law/regulation.',
    frequency: 'monthly',
  },

  // ===== NHC — Novel Food & Food-Drug Homology =====
  {
    url: 'https://www.nhc.gov.cn/sps/s7891/spaq.shtml',
    title: 'NHC Novel Food (New Food Raw Material) Approvals',
    regulatory_body: 'NHC',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== Manual Upload Sources (PDF/DOCX — not scraped) =====
  {
    url: 'https://www.nmpa.gov.cn/xxgk/ggtg/qtggtg/content.html',
    title: 'NMPA IECIC — Inventory of Existing Cosmetic Ingredients in China (8,972 ingredients)',
    regulatory_body: 'NMPA',
    content_type: 'pdf',
    ingestion_tier: 'manual_upload',
    frequency: 'monthly',
  },
  {
    url: 'https://www.nmpa.gov.cn/hzhp/hzhpfgwj/',
    title: 'Cosmetics Safety Technical Specification (2015 edition) — banned/restricted substances, preservatives, UV filters, colorants',
    regulatory_body: 'NMPA',
    content_type: 'pdf',
    ingestion_tier: 'manual_upload',
    frequency: 'monthly',
  },
  {
    url: 'https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/tscps/',
    title: 'SAMR Health Food Raw Material Inventories (multiple announcements, DOCX/PDF attachments)',
    regulatory_body: 'SAMR',
    content_type: 'pdf',
    ingestion_tier: 'manual_upload',
    frequency: 'monthly',
  },
  {
    url: 'https://www.customs.gov.cn/customs/302249/zfxxgk/2799825/302274/',
    title: 'CBEC Positive List (Cross-Border E-Commerce, 1,476 HS code categories)',
    regulatory_body: 'GACC',
    content_type: 'pdf',
    ingestion_tier: 'manual_upload',
    frequency: 'monthly',
  },

  // ===== GACC — Non-Compliant Food Reports =====
  {
    url: 'https://english.customs.gov.cn/Statics/4ae9e253-62d2-4696-8382-de5e1c8e51af.html',
    title: 'GACC Non-Compliant Imported Food Reports',
    regulatory_body: 'GACC',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },

  // ===== NMPA English — Regulatory Updates =====
  {
    url: 'https://english.nmpa.gov.cn/news.html',
    title: 'NMPA English News & Updates',
    regulatory_body: 'NMPA',
    content_type: 'html',
    ingestion_tier: 'exa',
    frequency: 'weekly',
  },
];

export async function seedCNSources() {
  const supabase = createServiceClient();

  for (const source of CN_SEED_SOURCES) {
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
        jurisdiction: 'CN',
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
        enabled: source.ingestion_tier !== 'manual_upload',
      });
    }
  }

  return { seeded: CN_SEED_SOURCES.length };
}
