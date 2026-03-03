import { createHash } from 'crypto';
import type { RegulatoryPage } from '@sieve/shared';
import { classifyRegulatoryBody } from './constants';

const BROWSER_USE_API = 'https://api.browser-use.com/api/v2';

/**
 * Browser Use Cloud (v2 API) integration for JS-rendered pages and interactive portals.
 *
 * Known Browser Use-only targets:
 * - eCFR (ecfr.gov) — JS-rendered content
 * - FDA AccessData (accessdata.fda.gov) — interactive search/database portals
 */
export async function extractWithBrowserUse(
  urls: string[]
): Promise<RegulatoryPage[]> {
  const browserUseApiKey = process.env.BROWSER_USE_API_KEY?.trim();
  if (!browserUseApiKey) {
    console.warn('BROWSER_USE_API_KEY not set, skipping Browser Use extraction');
    return [];
  }

  const pages: RegulatoryPage[] = [];

  for (const url of urls) {
    try {
      const task = buildTaskForUrl(url);

      const response = await fetch(`${BROWSER_USE_API}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Browser-Use-API-Key': browserUseApiKey,
        },
        body: JSON.stringify({
          task,
          startUrl: url,
          maxSteps: 150,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`Browser Use failed for ${url}: ${response.status} ${body}`);
        continue;
      }

      const result = await response.json();
      const taskId = result.id;

      if (!taskId) {
        console.error(`Browser Use returned no task ID for ${url}:`, result);
        continue;
      }

      console.log(`Browser Use task ${taskId} started for ${url}`);

      // Poll for completion
      const content = await pollForResult(taskId, browserUseApiKey);
      if (!content) continue;

      console.log(`Browser Use extracted ${content.length} chars from ${url}`);

      pages.push({
        url,
        title: '',
        content_text: content,
        published_date: null,
        domain: new URL(url).hostname,
        regulatory_body: classifyRegulatoryBody(url),
        content_type: 'html',
        scraped_at: new Date().toISOString(),
        content_hash: createHash('sha256').update(content).digest('hex'),
      });
    } catch (err) {
      console.error(`Browser Use extraction failed for ${url}:`, err);
    }

    // Rate limit between tasks
    await new Promise((r) => setTimeout(r, 2000));
  }

  return pages;
}

function buildTaskForUrl(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes('ecfr.gov')) {
    return `This is an eCFR (Electronic Code of Federal Regulations) page. Wait for the JavaScript-rendered content to fully load. Extract the complete regulatory text from the main content area, including: the part/subpart title, all section numbers and their text, all tables with data values and limits, and any cross-references. If there are multiple sections or subparts, extract them all. Return the full text content. Do not truncate.`;
  }

  if (hostname.includes('accessdata.fda.gov')) {
    return `This is an FDA AccessData page. Wait for the page to fully load. If there is a search form or database interface, extract available data from the default view. Extract all text content from tables, listings, and regulatory information. Return the complete text.`;
  }

  return `Wait for the page to fully load. Extract all text content from the main content area, including tables, lists, and any regulatory information. Return the complete text.`;
}

async function pollForResult(
  taskId: string,
  apiKey: string
): Promise<string | null> {
  const maxAttempts = 40; // 40 * 5s = 200s max wait

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    try {
      const response = await fetch(
        `${BROWSER_USE_API}/tasks/${taskId}`,
        {
          headers: { 'X-Browser-Use-API-Key': apiKey },
        }
      );

      if (!response.ok) {
        console.warn(`Browser Use poll ${i + 1}: HTTP ${response.status}`);
        continue;
      }

      const result = await response.json();

      if (result.status === 'finished') {
        return result.output ?? null;
      }

      if (result.status === 'stopped') {
        console.error(`Browser Use task ${taskId} was stopped`);
        return null;
      }

      // 'created' or 'started' — keep polling
    } catch (err) {
      console.warn(`Browser Use poll ${i + 1} error:`, err);
    }
  }

  console.error(`Browser Use task ${taskId} timed out after ${maxAttempts * 5}s`);
  return null;
}
