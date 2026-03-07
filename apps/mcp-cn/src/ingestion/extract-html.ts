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
    // english.nmpa.gov.cn is regular HTML, only Chinese nmpa.gov.cn needs Browser Use
    if (hostname.startsWith('english.')) return false;
    return BROWSER_USE_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return false;
  }
}

function toPage(url: string, title: string, text: string, publishedDate: string | null): RegulatoryPage {
  return {
    url,
    title,
    content_text: text,
    published_date: publishedDate,
    domain: new URL(url).hostname,
    regulatory_body: classifyRegulatoryBody(url),
    content_type: 'html',
    scraped_at: new Date().toISOString(),
    content_hash: createHash('sha256').update(text).digest('hex'),
  };
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

    // Try getContents first (works for URLs Exa has already crawled)
    const fetchedUrls = new Set<string>();
    try {
      const results = await exa.getContents(exaUrls, {
        text: true,
        livecrawl: 'always',
      });

      for (const result of results.results) {
        const text = result.text ?? '';
        fetchedUrls.add(result.url);

        if (
          text.length < 100 ||
          text.includes('Please enable JavaScript')
        ) {
          browserUseUrls.push(result.url);
          continue;
        }

        pages.push(toPage(result.url, result.title ?? '', text, result.publishedDate ?? null));
      }
    } catch (err) {
      console.error('Exa getContents failed, falling back to search', err);
    }

    // For URLs that getContents missed, try searchAndContents per-domain
    const missedUrls = exaUrls.filter((u) => !fetchedUrls.has(u));
    if (missedUrls.length > 0) {
      for (const url of missedUrls) {
        try {
          const domain = new URL(url).hostname;
          const results = await exa.searchAndContents(url, {
            includeDomains: [domain],
            numResults: 1,
            text: true,
          });

          if (results.results.length > 0) {
            const r = results.results[0];
            const text = r.text ?? '';
            if (text.length >= 100) {
              pages.push(toPage(r.url, r.title ?? '', text, r.publishedDate ?? null));
              continue;
            }
          }
          browserUseUrls.push(url);
        } catch {
          browserUseUrls.push(url);
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { pages, browserUseUrls };
}
