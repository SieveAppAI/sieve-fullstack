import { discoverPages } from './discover';
import { extractHtmlContent } from './extract-html';
import { extractWithBrowserUse } from './browser-use';
import { structureHtmlContent } from './structure';
import { storeRegulatoryPage, storeStructuredData } from './store';
import type { RegulatoryPage } from '@sieve/shared';

export interface IngestionResult {
  mode: 'full' | 'change_detection' | 'specific_urls';
  urls_discovered: number;
  urls_processed: number;
  pages_structured: number;
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

  return {
    mode: specificUrls ? 'specific_urls' : 'full',
    urls_discovered: urls.length,
    urls_processed: allPages.length,
    pages_structured: pagesStructured,
    changes_detected: 0,
    errors,
  };
}
