import { z } from 'zod';
import { createServiceClient } from '@sieve/db';
import type { RegulatoryPage } from '@sieve/shared';
import { runFullIngestion } from '../ingestion/pipeline';
import { runChangeDetection } from '../ingestion/change-detection';
import { runBulkDownload } from '../ingestion/ingest-bulk';
import { ingestEurLexLegislation } from '../ingestion/eurlex';
import { seedEUSources } from '../ingestion/seed';
import { structureHtmlContent } from '../ingestion/structure';
import { storeStructuredData } from '../ingestion/store';

export const triggerScrapeSchema = z.object({
  mode: z
    .enum(['full', 'change_detection', 'specific_urls', 'bulk_download', 'eurlex', 'seed', 'structure_remaining'])
    .describe('Scrape mode'),
  urls: z
    .array(z.string())
    .optional()
    .describe('Specific URLs to scrape (for specific_urls mode)'),
});

export type TriggerScrapeArgs = z.infer<typeof triggerScrapeSchema>;

async function structureRemaining() {
  const supabase = createServiceClient();
  let structured = 0;
  let errors = 0;
  let cursor: string | null = null;
  const batchSize = 50;

  // Process in batches to avoid timeout
  while (true) {
    let query = supabase
      .from('regulatory_sources')
      .select('url, title, content_text, domain, regulatory_body, content_type')
      .eq('jurisdiction', 'EU')
      .eq('scrape_status', 'scraped')
      .order('last_scraped_at', { ascending: true })
      .limit(batchSize);

    if (cursor) {
      query = query.gt('url', cursor);
    }

    const { data: sources } = await query;
    if (!sources || sources.length === 0) break;

    for (const source of sources) {
      cursor = source.url;
      if (!source.content_text || source.content_text.length < 100) {
        // Skip empty/tiny content
        continue;
      }

      const page: RegulatoryPage = {
        url: source.url,
        title: source.title ?? '',
        content_text: source.content_text,
        published_date: null,
        domain: source.domain ?? '',
        regulatory_body: source.regulatory_body ?? 'EC',
        content_type: (source.content_type as 'html' | 'pdf') ?? 'html',
        scraped_at: new Date().toISOString(),
        content_hash: '',
      };

      try {
        const result = await structureHtmlContent(page);
        if (result) {
          await storeStructuredData(source.url, result);
          structured++;
        }
      } catch (e) {
        errors++;
        console.error(`Structure failed for ${source.url}: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Rate limit for Claude API
      await new Promise((r) => setTimeout(r, 1000));
    }

    // If we got fewer than batchSize, we're done
    if (sources.length < batchSize) break;
  }

  return { mode: 'structure_remaining', structured, errors };
}

export async function triggerScrape(args: TriggerScrapeArgs) {
  const { mode, urls } = args;

  switch (mode) {
    case 'full':
      return await runFullIngestion();
    case 'change_detection':
      return await runChangeDetection();
    case 'specific_urls':
      if (!urls || urls.length === 0) {
        return { error: 'urls required for specific_urls mode' };
      }
      return await runFullIngestion(urls);
    case 'bulk_download':
      return { results: await runBulkDownload() };
    case 'eurlex':
      return await ingestEurLexLegislation();
    case 'seed':
      return await seedEUSources();
    case 'structure_remaining':
      return await structureRemaining();
  }
}
