import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import type { RegulatoryPage, RegulatoryBody } from '../types/ingestion';

const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'svg',
  'nav', 'footer', 'header',
  '.cookie-banner', '.cookie-consent', '.modal',
  '.sidebar', '.nav', '.menu', '.breadcrumb',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '.social-share', '.share-buttons',
  '.comments', '#comments',
  '.advertisement', '.ad-container',
];

function htmlToText(html: string): { title: string; content: string } {
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim() ||
    $('h1').first().text().trim() ||
    '';

  // Remove noise elements
  for (const sel of NOISE_SELECTORS) {
    $(sel).remove();
  }

  // Target main content area if it exists
  const mainContent = $('main, article, [role="main"], .content, #content, .main-content').first();
  const root = mainContent.length ? mainContent : $('body');

  // Extract text, preserving some structure
  const blocks: string[] = [];

  root.find('h1, h2, h3, h4, h5, h6, p, li, td, th, dd, dt, blockquote, pre, figcaption').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 0) {
      const tag = ('tagName' in el ? (el.tagName as string) : '').toLowerCase();
      if (tag.startsWith('h')) {
        blocks.push(`\n## ${text}\n`);
      } else {
        blocks.push(text);
      }
    }
  });

  // If block extraction got nothing, fall back to full text
  let content = blocks.join('\n');
  if (content.length < 50) {
    content = root.text().replace(/\s+/g, ' ').trim();
  }

  return { title, content };
}

export async function extractWithCrawl4ai(
  urls: string[],
  classifyBody: (url: string) => RegulatoryBody
): Promise<RegulatoryPage[]> {
  const pages: RegulatoryPage[] = [];
  let consecutiveErrors = 0;

  for (const url of urls) {
    if (consecutiveErrors >= 5) {
      console.warn(`scraper: ${consecutiveErrors} consecutive errors, skipping remaining ${urls.length - pages.length} URLs`);
      break;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SieveBot/1.0; +https://sieveapp.com)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.error(`scraper: HTTP ${response.status} for ${url}`);
        consecutiveErrors++;
        continue;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('html') && !contentType.includes('xml')) {
        console.warn(`scraper: non-HTML content-type (${contentType}) for ${url}, skipping`);
        consecutiveErrors++;
        continue;
      }

      const html = await response.text();
      const { title, content } = htmlToText(html);

      if (content.length < 50) {
        console.warn(`scraper: insufficient content for ${url}: ${content.length} chars`);
        consecutiveErrors++;
        continue;
      }

      consecutiveErrors = 0;
      console.log(`scraper: extracted ${content.length} chars from ${url}`);

      pages.push({
        url,
        title,
        content_text: content,
        published_date: null,
        domain: new URL(url).hostname,
        regulatory_body: classifyBody(url),
        content_type: 'html',
        scraped_at: new Date().toISOString(),
        content_hash: createHash('sha256').update(content).digest('hex'),
      });
    } catch (err) {
      console.error(`scraper: failed for ${url}:`, err instanceof Error ? err.message : String(err));
      consecutiveErrors++;
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  return pages;
}
