import { z } from 'zod';
import { createServiceClient } from '@sieve/db';
import type { RegulatoryPage } from '@sieve/shared';
import { extractWithCrawl4ai } from '@sieve/shared';
import { runFullIngestion } from '../ingestion/pipeline';
import { runChangeDetection } from '../ingestion/change-detection';
import { classifyRegulatoryBody, BROWSER_USE_DOMAINS } from '../ingestion/constants';
import { structureHtmlContent } from '../ingestion/structure';
import { storeRegulatoryPage, storeStructuredData } from '../ingestion/store';
import { extractPdfWithClaudeVision } from '../ingestion/extract-pdf';
import { extractWithBrowserUse } from '../ingestion/browser-use';

export const triggerScrapeSchema = z.object({
  mode: z
    .enum(['full', 'change_detection', 'specific_urls', 'structure_remaining', 're_structure', 're_scrape_short_content', 'scrape_pending'])
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
      .eq('jurisdiction', 'IN')
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
        regulatory_body: (source.regulatory_body ?? 'FSSAI') as RegulatoryPage['regulatory_body'],
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
      .eq('jurisdiction', 'IN')
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
        regulatory_body: (source.regulatory_body ?? 'FSSAI') as RegulatoryPage['regulatory_body'],
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

async function reScrapeShortContent() {
  const supabase = createServiceClient();
  let reSscraped = 0;
  let structured = 0;
  let errors = 0;

  const { data: sources } = await supabase
    .from('regulatory_sources')
    .select('url, content_text')
    .eq('jurisdiction', 'IN')
    .eq('scrape_status', 'scraped')
    .order('last_scraped_at', { ascending: true });

  if (!sources || sources.length === 0) {
    return { mode: 're_scrape_short_content', re_scraped: 0, structured: 0, errors: 0 };
  }

  const shortContentUrls = sources
    .filter((s) => !s.content_text || s.content_text.length < 100)
    .map((s) => s.url);

  if (shortContentUrls.length === 0) {
    return { mode: 're_scrape_short_content', re_scraped: 0, structured: 0, errors: 0, message: 'No short-content sources found' };
  }

  console.log(`Found ${shortContentUrls.length} sources with short content, re-scraping with crawl4ai...`);

  const pages = await extractWithCrawl4ai(shortContentUrls, classifyRegulatoryBody);

  for (const page of pages) {
    const stored = await storeRegulatoryPage(page, 'crawl4ai');
    if (stored) {
      reSscraped++;

      try {
        const result = await structureHtmlContent(page);
        if (result) {
          await storeStructuredData(page.url, result);
          structured++;
        }
      } catch (e) {
        errors++;
        console.error(`Structure after re-scrape failed for ${page.url}: ${e instanceof Error ? e.message : String(e)}`);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return { mode: 're_scrape_short_content', re_scraped: reSscraped, structured, errors, total_short: shortContentUrls.length };
}

async function scrapePending() {
  const supabase = createServiceClient();
  let scraped = 0;
  let structured = 0;
  let errors = 0;

  const { data: sources } = await supabase
    .from('regulatory_sources')
    .select('url')
    .eq('jurisdiction', 'IN')
    .eq('scrape_status', 'pending')
    .order('created_at', { ascending: true });

  if (!sources || sources.length === 0) {
    return { mode: 'scrape_pending', scraped: 0, structured: 0, errors: 0, message: 'No pending sources' };
  }

  const urls = sources.map((s) => s.url);
  console.log(`Found ${urls.length} pending sources, scraping with direct fetch...`);

  const pages = await extractWithCrawl4ai(urls, classifyRegulatoryBody);

  // Browser Use fallback for URLs that failed direct fetch and are in browser-use domains
  const scrapedUrls = new Set(pages.map((p) => p.url));
  const browserUseUrls = urls
    .filter((u) => !scrapedUrls.has(u))
    .filter((u) => BROWSER_USE_DOMAINS.some((d) => u.includes(d)));

  if (browserUseUrls.length > 0) {
    console.log(`Trying Browser Use for ${browserUseUrls.length} URLs...`);
    const browserPages = await extractWithBrowserUse(browserUseUrls);
    pages.push(...browserPages);
  }

  for (const page of pages) {
    // Route PDFs through Claude Vision extraction
    if (page.content_type === 'pdf') {
      try {
        const pdfResult = await extractPdfWithClaudeVision(
          page.url,
          page.regulatory_body,
          'mixed',
          page.title
        );
        await storeRegulatoryPage(page, 'crawl4ai');
        await storeStructuredData(page.url, pdfResult.structured_data);
        scraped++;
        structured++;
      } catch (e) {
        errors++;
        console.error(`PDF extraction failed for ${page.url}: ${e instanceof Error ? e.message : String(e)}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    const stored = await storeRegulatoryPage(page, 'crawl4ai');
    if (stored) {
      scraped++;

      try {
        const result = await structureHtmlContent(page);
        if (result) {
          await storeStructuredData(page.url, result);
          structured++;
        }
      } catch (e) {
        errors++;
        console.error(`Structure after scrape failed for ${page.url}: ${e instanceof Error ? e.message : String(e)}`);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return { mode: 'scrape_pending', scraped, structured, errors, total_pending: urls.length };
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
    case 're_scrape_short_content':
      return await reScrapeShortContent();
    case 'scrape_pending':
      return await scrapePending();
  }
}
