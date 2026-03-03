import { createServiceClient } from '@sieve/db';
import { ServiceError } from './errors';

export async function getIngestionStatus() {
  const supabase = createServiceClient();

  const { data: sources, error } = await supabase
    .from('regulatory_sources')
    .select('scrape_status, last_scraped_at, error_message, url')
    .eq('jurisdiction', 'US');

  if (error) {
    throw new ServiceError(error.message);
  }

  const allSources = sources ?? [];
  const statusCounts: Record<string, number> = {};
  let lastFullScrape: string | null = null;
  const recentErrors: { url: string; error: string; at: string }[] = [];

  for (const s of allSources) {
    const status = s.scrape_status ?? 'unknown';
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;

    if (s.last_scraped_at) {
      if (!lastFullScrape || s.last_scraped_at > lastFullScrape) {
        lastFullScrape = s.last_scraped_at;
      }
    }

    if (s.scrape_status === 'error' && s.error_message) {
      recentErrors.push({
        url: s.url,
        error: s.error_message,
        at: s.last_scraped_at ?? '',
      });
    }
  }

  return {
    jurisdiction: 'US',
    total_sources: allSources.length,
    last_full_scrape: lastFullScrape,
    last_change_check: null,
    sources_by_status: statusCounts,
    recent_errors: recentErrors.slice(0, 10),
  };
}
