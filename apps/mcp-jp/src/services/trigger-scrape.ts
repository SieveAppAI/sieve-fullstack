import { z } from 'zod';
import { createServiceClient } from '@sieve/db';
import type { RegulatoryPage } from '@sieve/shared';
import { runFullIngestion } from '../ingestion/pipeline';
import { runChangeDetection } from '../ingestion/change-detection';
import { structureHtmlContent } from '../ingestion/structure';
import { storeStructuredData } from '../ingestion/store';

export const triggerScrapeSchema = z.object({
  mode: z
    .enum(['full', 'change_detection', 'specific_urls', 'structure_remaining', 're_structure'])
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

  while (true) {
    let query = supabase
      .from('regulatory_sources')
      .select('url, title, content_text, domain, regulatory_body, content_type')
      .eq('jurisdiction', 'JP')
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
      if (!source.content_text || source.content_text.length < 100) continue;

      const page: RegulatoryPage = {
        url: source.url,
        title: source.title ?? '',
        content_text: source.content_text,
        published_date: null,
        domain: source.domain ?? '',
        regulatory_body: (source.regulatory_body ?? 'MHLW') as RegulatoryPage['regulatory_body'],
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

      await new Promise((r) => setTimeout(r, 1000));
    }

    if (sources.length < batchSize) break;
  }

  return { mode: 'structure_remaining', structured, errors };
}

async function reStructureAll() {
  const supabase = createServiceClient();
  let structured = 0;
  let errors = 0;
  let cursor: string | null = null;
  const batchSize = 50;

  while (true) {
    let query = supabase
      .from('regulatory_sources')
      .select('url, title, content_text, domain, regulatory_body, content_type')
      .eq('jurisdiction', 'JP')
      .eq('scrape_status', 'structured')
      .order('last_scraped_at', { ascending: true })
      .limit(batchSize);

    if (cursor) {
      query = query.gt('url', cursor);
    }

    const { data: sources } = await query;
    if (!sources || sources.length === 0) break;

    for (const source of sources) {
      cursor = source.url;
      if (!source.content_text || source.content_text.length < 100) continue;

      const page: RegulatoryPage = {
        url: source.url,
        title: source.title ?? '',
        content_text: source.content_text,
        published_date: null,
        domain: source.domain ?? '',
        regulatory_body: (source.regulatory_body ?? 'MHLW') as RegulatoryPage['regulatory_body'],
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
        console.error(`Re-structure failed for ${source.url}: ${e instanceof Error ? e.message : String(e)}`);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    if (sources.length < batchSize) break;
  }

  return { mode: 're_structure', structured, errors };
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
    case 'structure_remaining':
      return await structureRemaining();
    case 're_structure':
      return await reStructureAll();
  }
}
