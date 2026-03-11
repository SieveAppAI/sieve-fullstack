import { z } from 'zod';
import { runFullIngestion } from '../ingestion/pipeline';
import { runChangeDetection } from '../ingestion/change-detection';
import { seedAUNZSources } from '../ingestion/seed';

export const triggerScrapeSchema = z.object({
  mode: z
    .enum(['full', 'change_detection', 'specific_urls', 'seed'])
    .describe('Scrape mode'),
  urls: z
    .array(z.string())
    .optional()
    .describe('Specific URLs to scrape (for specific_urls mode)'),
});

export type TriggerScrapeArgs = z.infer<typeof triggerScrapeSchema>;

export async function triggerScrape(args: TriggerScrapeArgs) {
  const { mode, urls } = args;

  switch (mode) {
    case 'full':
      return await runFullIngestion();
    case 'change_detection':
      return await runChangeDetection();
    case 'specific_urls':
      if (!urls || urls.length === 0) {
        return { error: 'urls required for specific_urls mode' };
      }
      return await runFullIngestion(urls);
    case 'seed':
      return await seedAUNZSources();
  }
}
