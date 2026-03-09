import { createServiceClient } from '@sieve/db';
import { discoverPages } from './discover';
import { extractHtmlContent } from './extract-html';
import { extractWithBrowserUse } from './browser-use';
import { extractPdfWithClaudeVision } from './extract-pdf';
import { structureHtmlContent } from './structure';
import { storeRegulatoryPage, storeStructuredData } from './store';
import type { RegulatoryPage } from '@sieve/shared';

export interface IngestionResult {
  mode: 'full' | 'change_detection' | 'specific_urls';
  urls_discovered: number;
  urls_processed: number;
  pages_structured: number;
  pdfs_processed: number;
  changes_detected: number;
  errors: { url: string; error: string }[];
}

export async function runFullIngestion(
  specificUrls?: string[]
): Promise<IngestionResult> {
  const errors: { url: string; error: string }[] = [];

  // Step 1: Discover URLs (or use specific list)
  let urls: string[];
  if (specificUrls) {
    urls = specificUrls;
  } else {
    urls = await discoverPages();
  }

  // Step 2: Extract HTML content (Tier 1 — Exa)
  const { pages, browserUseUrls } = await extractHtmlContent(urls);

  // Step 3: Extract with Browser Use (Tier 2 — fallback)
  let browserUsePages: RegulatoryPage[] = [];
  if (browserUseUrls.length > 0) {
    browserUsePages = await extractWithBrowserUse(browserUseUrls);
  }

  const allPages = [...pages, ...browserUsePages];

  // Step 4: Store raw pages
  for (const page of allPages) {
    const stored = await storeRegulatoryPage(page);
    if (!stored) {
      errors.push({ url: page.url, error: 'Failed to store page' });
    }
  }

  // Step 5: Structure content using Claude
  let pagesStructured = 0;
  for (const page of allPages) {
    try {
      const structuredData = await structureHtmlContent(page);
      if (structuredData) {
        await storeStructuredData(page.url, structuredData);
        pagesStructured++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ url: page.url, error: `Structuring failed: ${message}` });
    }

    // Rate limit for Claude API
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Step 6: Process pending PDF sources from DB
  const pdfsProcessed = await processPendingPdfs(errors);

  return {
    mode: specificUrls ? 'specific_urls' : 'full',
    urls_discovered: urls.length,
    urls_processed: allPages.length,
    pages_structured: pagesStructured,
    pdfs_processed: pdfsProcessed,
    changes_detected: 0,
    errors,
  };
}

async function processPendingPdfs(
  errors: { url: string; error: string }[]
): Promise<number> {
  const supabase = createServiceClient();

  // Find PDF sources that haven't been processed yet
  const { data: pdfSources } = await supabase
    .from('regulatory_sources')
    .select('*')
    .eq('jurisdiction', 'GCC')
    .eq('content_type', 'pdf')
    .eq('ingestion_tier', 'manual')
    .in('scrape_status', ['pending', 'pending_upload']);

  if (!pdfSources || pdfSources.length === 0) return 0;

  let processed = 0;

  for (const source of pdfSources) {
    try {
      console.log(`Processing PDF: ${source.url}`);

      const result = await extractPdfWithClaudeVision(
        source.url,
        source.regulatory_body ?? 'SFDA',
        'mixed',
        source.title ?? source.url
      );

      // Update the source record
      await supabase
        .from('regulatory_sources')
        .update({
          content_hash: result.content_hash,
          structured_data: result.structured_data as any,
          scrape_status: 'structured',
          last_scraped_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', source.id);

      // Store structured data to typed tables
      await storeStructuredData(source.url, result.structured_data);

      processed++;
      console.log(`PDF processed successfully: ${source.url}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ url: source.url, error: `PDF extraction failed: ${message}` });

      await supabase
        .from('regulatory_sources')
        .update({ scrape_status: 'error', updated_at: new Date().toISOString() })
        .eq('id', source.id);
    }

    // Rate limit for Claude API
    await new Promise((r) => setTimeout(r, 2000));
  }

  return processed;
}
