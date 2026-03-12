import { createHash } from 'crypto';
import type { RegulatoryPage, RegulatoryBody } from '../types/ingestion';

const CRAWL4AI_API = 'https://api.crawl4ai.com/crawl';

interface Crawl4aiResult {
  task_id: string;
  status: string;
  result?: {
    markdown?: string;
    cleaned_html?: string;
    metadata?: {
      title?: string;
    };
  };
}

export async function extractWithCrawl4ai(
  urls: string[],
  classifyBody: (url: string) => RegulatoryBody
): Promise<RegulatoryPage[]> {
  const apiKey = process.env.CRAWL4AI_API_KEY?.trim();
  if (!apiKey) {
    console.warn('CRAWL4AI_API_KEY not set, skipping crawl4ai extraction');
    return [];
  }

  const pages: RegulatoryPage[] = [];
  let consecutiveErrors = 0;

  for (const url of urls) {
    if (consecutiveErrors >= 5) {
      console.warn(`crawl4ai: ${consecutiveErrors} consecutive errors, skipping remaining ${urls.length - pages.length} URLs`);
      break;
    }

    try {
      // Submit crawl task
      const submitResponse = await fetch(CRAWL4AI_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          urls: url,
          priority: 8,
          screenshot: false,
          magic: true,
          cache_mode: 'bypass',
          remove_overlay_elements: true,
          word_count_threshold: 10,
        }),
      });

      if (!submitResponse.ok) {
        const body = await submitResponse.text();
        console.error(`crawl4ai submit failed for ${url}: ${submitResponse.status} ${body}`);
        consecutiveErrors++;
        continue;
      }

      const submitResult: Crawl4aiResult = await submitResponse.json();
      const taskId = submitResult.task_id;

      if (!taskId) {
        console.error(`crawl4ai returned no task_id for ${url}`);
        consecutiveErrors++;
        continue;
      }

      // Poll for result
      const content = await pollCrawl4ai(taskId, apiKey);
      if (!content || content.length < 50) {
        console.warn(`crawl4ai returned insufficient content for ${url}: ${content?.length ?? 0} chars`);
        consecutiveErrors++;
        continue;
      }

      consecutiveErrors = 0;
      console.log(`crawl4ai extracted ${content.length} chars from ${url}`);

      pages.push({
        url,
        title: '',
        content_text: content,
        published_date: null,
        domain: new URL(url).hostname,
        regulatory_body: classifyBody(url),
        content_type: 'html',
        scraped_at: new Date().toISOString(),
        content_hash: createHash('sha256').update(content).digest('hex'),
      });
    } catch (err) {
      console.error(`crawl4ai extraction failed for ${url}:`, err);
      consecutiveErrors++;
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 1500));
  }

  return pages;
}

async function pollCrawl4ai(
  taskId: string,
  apiKey: string
): Promise<string | null> {
  const maxAttempts = 30; // 30 * 5s = 150s max

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    try {
      const response = await fetch(`${CRAWL4AI_API}/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        console.warn(`crawl4ai poll ${i + 1}: HTTP ${response.status}`);
        continue;
      }

      const result: Crawl4aiResult = await response.json();

      if (result.status === 'completed' || result.status === 'finished') {
        return result.result?.markdown ?? result.result?.cleaned_html ?? null;
      }

      if (result.status === 'failed' || result.status === 'error') {
        console.error(`crawl4ai task ${taskId} failed`);
        return null;
      }
    } catch (err) {
      console.warn(`crawl4ai poll ${i + 1} error:`, err);
    }
  }

  console.error(`crawl4ai task ${taskId} timed out after ${maxAttempts * 5}s`);
  return null;
}
