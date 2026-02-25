import { createHash } from 'crypto';
import Exa from 'exa-js';
import type { RegulatoryPage } from '@sieve/shared';
import { classifyRegulatoryBody, BROWSER_USE_DOMAINS } from './constants';

function getExaClient() {
  const apiKey = process.env.EXA_API_KEY?.trim();
  if (!apiKey) throw new Error('Missing EXA_API_KEY');
  return new Exa(apiKey);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function needsBrowserUse(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BROWSER_USE_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return false;
  }
}

export async function extractHtmlContent(
  urls: string[]
): Promise<{
  pages: RegulatoryPage[];
  browserUseUrls: string[];
}> {
  const exa = getExaClient();
  const batches = chunk(urls, 10);
  const pages: RegulatoryPage[] = [];
  const browserUseUrls: string[] = [];

  for (const batch of batches) {
    // Separate URLs that need Browser Use
    const exaUrls = batch.filter((u) => !needsBrowserUse(u));
    const buUrls = batch.filter((u) => needsBrowserUse(u));
    browserUseUrls.push(...buUrls);

    if (exaUrls.length === 0) continue;

    try {
      const results = await exa.getContents(exaUrls, {
        text: true,
        livecrawl: 'always',
      });

      for (const result of results.results) {
        const text = result.text ?? '';

        // Check if content is too short or JS-dependent
        if (
          text.length < 100 ||
          text.includes('Please enable JavaScript')
        ) {
          browserUseUrls.push(result.url);
          continue;
        }

        pages.push({
          url: result.url,
          title: result.title ?? '',
          content_text: text,
          published_date: result.publishedDate ?? null,
          domain: new URL(result.url).hostname,
          regulatory_body: classifyRegulatoryBody(result.url),
          content_type: 'html',
          scraped_at: new Date().toISOString(),
          content_hash: createHash('sha256').update(text).digest('hex'),
        });
      }
    } catch (err) {
      console.error(`Exa batch extraction failed`, err);
      // On failure, try Browser Use for all URLs in the batch
      browserUseUrls.push(...exaUrls);
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { pages, browserUseUrls };
}
