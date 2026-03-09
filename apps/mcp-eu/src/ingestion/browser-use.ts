import { createHash } from 'crypto';
import type { RegulatoryPage } from '@sieve/shared';
import { classifyRegulatoryBody } from './constants';

const BROWSER_USE_API = 'https://api.browser-use.com/api/v2';

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
  const fullUrl = url.toLowerCase();

  if (fullUrl.includes('rasff-window')) {
    return `This is the RASFF (Rapid Alert System for Food and Feed) portal — an Angular SPA. Wait for the page to fully render. Extract the list of recent notifications including: notification type, date, product, hazard category, notifying country, and outcome. Navigate through pagination if available. Return as much structured data as possible.`;
  }

  if (fullUrl.includes('food-feed-portal') && fullUrl.includes('food-additives')) {
    return `This is the EU Food Additives Database — an Angular SPA. Wait for the page to fully render. Search or browse the list of food additives. Extract E-number, additive name, category, and conditions of use. Navigate through pagination to extract as many entries as possible.`;
  }

  if (fullUrl.includes('food-feed-portal') && fullUrl.includes('novel-food')) {
    return `This is the EU Novel Food Catalogue — an Angular SPA. Wait for the page to fully render. Browse or search the catalogue. Extract ingredient names, their novel food status (novel / not novel / traditional third country), and any conditions. Extract as many entries as possible.`;
  }

  if (fullUrl.includes('food-feed-portal') && fullUrl.includes('health-claims')) {
    return `This is the EU Health Claims Register — an Angular SPA. Wait for the page to fully render. Extract claims including: claim text, type (Article 13.1 or 14), status (authorised/non-authorised), conditions of use, and food/constituent. Navigate through pagination.`;
  }

  return `Wait for the page to fully load. This is an EU regulatory website. Extract all text content from the main content area, including tables, lists, regulation annexes, and any structured regulatory data. Return the complete text.`;
}

async function pollForResult(
  taskId: string,
  apiKey: string
): Promise<string | null> {
  const maxAttempts = 40;

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
    } catch (err) {
      console.warn(`Browser Use poll ${i + 1} error:`, err);
    }
  }

  console.error(`Browser Use task ${taskId} timed out after ${maxAttempts * 5}s`);
  return null;
}
