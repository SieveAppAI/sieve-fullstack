import { createHash } from 'crypto';
import Exa from 'exa-js';
import { createServiceClient } from '@sieve/db';
import type { IngestionResult } from './pipeline';
import { structureHtmlContent } from './structure';
import { storeStructuredData } from './store';
import type { RegulatoryPage } from '@sieve/shared';
import { classifyRegulatoryBody } from './constants';

function getExaClient() {
  const apiKey = process.env.EXA_API_KEY?.trim();
  if (!apiKey) throw new Error('Missing EXA_API_KEY');
  return new Exa(apiKey);
}

export async function runChangeDetection(): Promise<IngestionResult> {
  const supabase = createServiceClient();
  const exa = getExaClient();
  const errors: { url: string; error: string }[] = [];
  let changesDetected = 0;

  // Get all SG sources with their current hashes
  const { data: sources } = await supabase
    .from('regulatory_sources')
    .select('id, url, content_hash, content_type')
    .eq('jurisdiction', 'SG')
    .eq('scrape_status', 'structured');

  if (!sources || sources.length === 0) {
    return {
      mode: 'change_detection',
      urls_discovered: 0,
      urls_processed: 0,
      pages_structured: 0,
      changes_detected: 0,
      errors: [],
    };
  }

  // Check HTML sources for changes
  const htmlSources = sources.filter((s) => s.content_type === 'html');
  const urlBatches: string[][] = [];
  for (let i = 0; i < htmlSources.length; i += 10) {
    urlBatches.push(htmlSources.slice(i, i + 10).map((s) => s.url));
  }

  for (const batch of urlBatches) {
    try {
      const results = await exa.getContents(batch, {
        text: true,
        livecrawl: 'always',
      });

      for (const result of results.results) {
        const text = result.text ?? '';
        const newHash = createHash('sha256').update(text).digest('hex');
        const source = htmlSources.find((s) => s.url === result.url);

        if (source && newHash !== source.content_hash) {
          changesDetected++;

          // Record the change
          await supabase.from('regulatory_source_changes').insert({
            source_id: source.id,
            old_content_hash: source.content_hash,
            new_content_hash: newHash,
            change_summary: 'Content change detected — pending re-structuring',
          });

          // Update the source
          await supabase
            .from('regulatory_sources')
            .update({
              content_text: text,
              content_hash: newHash,
              last_scraped_at: new Date().toISOString(),
              last_changed_at: new Date().toISOString(),
              scrape_status: 'scraped',
              updated_at: new Date().toISOString(),
            })
            .eq('id', source.id);

          // Re-structure the updated content
          const page: RegulatoryPage = {
            url: result.url,
            title: result.title ?? '',
            content_text: text,
            published_date: null,
            domain: new URL(result.url).hostname,
            regulatory_body: classifyRegulatoryBody(result.url),
            content_type: 'html',
            scraped_at: new Date().toISOString(),
            content_hash: newHash,
          };

          try {
            const structured = await structureHtmlContent(page);
            if (structured) {
              await storeStructuredData(result.url, structured);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push({
              url: result.url,
              error: `Re-structuring failed: ${msg}`,
            });
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ url: batch[0], error: `Batch check failed: ${msg}` });
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  return {
    mode: 'change_detection',
    urls_discovered: sources.length,
    urls_processed: htmlSources.length,
    pages_structured: changesDetected,
    changes_detected: changesDetected,
    errors,
  };
}
