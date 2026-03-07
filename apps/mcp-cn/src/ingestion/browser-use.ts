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
  let consecutiveCreditsErrors = 0;

  for (const url of urls) {
    // Circuit breaker: stop if we've hit 3 consecutive 402s (no credits)
    if (consecutiveCreditsErrors >= 3) {
      console.warn(`Browser Use: no credits, skipping remaining ${urls.length} URLs`);
      break;
    }

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
        if (response.status === 402) consecutiveCreditsErrors++;
        continue;
      }
      consecutiveCreditsErrors = 0;

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

  if (hostname.includes('sppt.cfsa.net.cn')) {
    return `This is the CFSA (China Food Safety Assessment) standards platform. The content is in Chinese (simplified). The site runs on non-standard port 8086 and is JS-rendered. Wait for the page to fully load. Navigate the standards database to find food safety GB standards. Extract all standard listings visible, including standard number (e.g., GB 2760-2024), title in Chinese, status (current/replaced), and effective date. If there is a search function, search for "食品添加剂" (food additives), "标签" (labelling), and "营养标签" (nutrition labelling). Return all extracted text.`;
  }

  if (hostname.includes('openstd.samr.gov.cn')) {
    return `This is China's national standards full-text system (openstd). The content is in Chinese (simplified) and JS-rendered. Wait for the page to fully load. Search for food safety GB standards using the search function. Look for GB 2760, GB 7718, GB 28050, GB 14880. For each standard found, extract the full text if available, or extract the standard number, Chinese title, ICS classification code, status, and implementation date. Return all extracted text.`;
  }

  if (hostname.includes('nmpa.gov.cn') && !hostname.includes('english')) {
    return `This is the NMPA (National Medical Products Administration) website. The content is in Chinese (simplified). Wait for the page to fully load. Extract all text content from the main content area, including regulatory announcements, cosmetics ingredient regulations, registration requirements, and any tables or lists. Focus on cosmetics-related content (化妆品). Return the complete text.`;
  }

  if (hostname.includes('flk.npc.gov.cn')) {
    return `This is China's NPC (National People's Congress) legislation database. The content is in Chinese (simplified) and is JS-rendered. Wait for the page to fully load. Search for "食品安全法" (Food Safety Law) and "化妆品监督管理条例" (Cosmetics Supervision and Administration Regulation). Extract the full text of each law/regulation found. Return the complete text.`;
  }

  return `Wait for the page to fully load. The content may be in Chinese (simplified). Extract all text content from the main content area, including tables, lists, and any regulatory information. Return the complete text.`;
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
