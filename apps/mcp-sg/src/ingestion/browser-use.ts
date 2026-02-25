import { createHash } from 'crypto';
import type { RegulatoryPage } from '@sieve/shared';
import { classifyRegulatoryBody } from './constants';

/**
 * Browser Use integration for JS-rendered pages and interactive portals.
 * Uses the Vercel Marketplace Browser Use integration.
 *
 * Known Browser Use-only targets:
 * - SSO legislation (sso.agc.gov.sg) — JS-rendered content
 * - HSA VNS positive ingredient list — interactive search form
 * - HSA PRISM — notification portal
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

      const response = await fetch('https://api.browser-use.com/api/v1/run-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${browserUseApiKey}`,
        },
        body: JSON.stringify({
          task,
          save_browser_data: false,
        }),
      });

      if (!response.ok) {
        console.error(`Browser Use failed for ${url}: ${response.status}`);
        continue;
      }

      const result = await response.json();
      const taskId = result.id;

      // Poll for completion
      const content = await pollForResult(taskId, browserUseApiKey);
      if (!content) continue;

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

    await new Promise((r) => setTimeout(r, 2000));
  }

  return pages;
}

function buildTaskForUrl(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes('sso.agc.gov.sg')) {
    return `Navigate to ${url}. Wait for the page to fully load (it uses JavaScript rendering). Extract the complete legislative text including all sections, schedules, and amendments. Return the full text content.`;
  }

  if (hostname.includes('hsa.gov.sg') && url.includes('vns')) {
    return `Navigate to ${url}. This is the HSA Voluntary Notification Scheme page. Find the search/listing functionality for approved health supplement ingredients. Iterate through categories or use the A-Z listing to extract all approved ingredients with their conditions of use. Return structured data.`;
  }

  return `Navigate to ${url}. Wait for the page to fully load. Extract all text content from the main content area, including tables, lists, and linked documents. Return the complete text.`;
}

async function pollForResult(
  taskId: string,
  apiKey: string
): Promise<string | null> {
  const maxAttempts = 30;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const response = await fetch(
      `https://api.browser-use.com/api/v1/task/${taskId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    if (!response.ok) continue;

    const result = await response.json();

    if (result.status === 'completed') {
      return result.output ?? null;
    }

    if (result.status === 'failed') {
      console.error(`Browser Use task ${taskId} failed:`, result.error);
      return null;
    }
  }

  console.error(`Browser Use task ${taskId} timed out`);
  return null;
}
