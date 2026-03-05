import { createServiceClient } from '@sieve/db';
import { createHash } from 'crypto';
import { structureHtmlContent } from './structure';
import type { RegulatoryPage } from '@sieve/shared';
import { ECFR_PARTS } from './constants';

const BASE_URL = 'https://www.ecfr.gov/api/versioner/v1/full';
const JURISDICTION = 'US';
const DELAY_MS = 250;

export interface EcfrIngestionResult {
  source: 'ecfr';
  total_parts: number;
  parts_upserted: number;
  parts_structured: number;
  errors: string[];
}

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ingestEcfrPart(
  title: number,
  part: number
): Promise<{ upserted: boolean; structured: boolean; error?: string }> {
  const supabase = createServiceClient();
  const date = new Date().toISOString().slice(0, 10);
  const url = `${BASE_URL}/${date}/title-${title}.xml?part=${part}`;
  const canonicalUrl = `https://www.ecfr.gov/current/title-${title}/part-${part}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { upserted: false, structured: false, error: `HTTP ${res.status} for title ${title} part ${part}` };
    }

    const xml = await res.text();
    const plainText = stripXmlTags(xml);
    const contentHash = sha256(plainText);

    // Check if content has changed
    const { data: existing } = await supabase
      .from('regulatory_sources')
      .select('content_hash')
      .eq('url', canonicalUrl)
      .single();

    if (existing?.content_hash === contentHash) {
      return { upserted: false, structured: false };
    }

    const regulatoryBody = title === 21 ? 'FDA' : title === 7 ? 'USDA' : 'FDA';

    const { error } = await supabase.from('regulatory_sources').upsert(
      {
        url: canonicalUrl,
        title: `${title} CFR Part ${part}`,
        domain: 'ecfr.gov',
        regulatory_body: regulatoryBody,
        jurisdiction: JURISDICTION,
        content_type: 'html' as const,
        ingestion_tier: 'ecfr_api',
        content_text: plainText,
        content_hash: contentHash,
        last_scraped_at: new Date().toISOString(),
        scrape_status: 'scraped',
      },
      { onConflict: 'url' }
    );

    if (error) {
      return { upserted: false, structured: false, error: error.message };
    }

    // Structure via Claude
    const page: RegulatoryPage = {
      url: canonicalUrl,
      title: `${title} CFR Part ${part}`,
      content_text: plainText,
      published_date: null,
      domain: 'ecfr.gov',
      regulatory_body: regulatoryBody,
      content_type: 'html',
      scraped_at: new Date().toISOString(),
      content_hash: contentHash,
    };

    const structured = await structureHtmlContent(page);
    if (structured) {
      const { storeStructuredData } = await import('./store');
      await storeStructuredData(canonicalUrl, structured);
      return { upserted: true, structured: true };
    }

    return { upserted: true, structured: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { upserted: false, structured: false, error: msg };
  }
}

export async function ingestAllEcfrParts(): Promise<EcfrIngestionResult> {
  const result: EcfrIngestionResult = {
    source: 'ecfr',
    total_parts: ECFR_PARTS.length,
    parts_upserted: 0,
    parts_structured: 0,
    errors: [],
  };

  for (const { title, part } of ECFR_PARTS) {
    const partResult = await ingestEcfrPart(title, part);

    if (partResult.upserted) result.parts_upserted++;
    if (partResult.structured) result.parts_structured++;
    if (partResult.error) result.errors.push(`Title ${title} Part ${part}: ${partResult.error}`);

    await delay(DELAY_MS);
  }

  console.log(
    `eCFR: ${result.parts_upserted}/${result.total_parts} parts upserted, ${result.parts_structured} structured`
  );
  return result;
}
