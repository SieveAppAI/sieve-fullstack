import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runFullIngestion } from '../ingestion/pipeline';
import { runChangeDetection } from '../ingestion/change-detection';

export function registerTriggerScrape(server: McpServer) {
  server.tool(
    'trigger_scrape',
    'Trigger a scrape of Singapore regulatory sources (admin only)',
    {
      mode: z
        .enum(['full', 'change_detection', 'specific_urls'])
        .describe('Scrape mode'),
      urls: z
        .array(z.string())
        .optional()
        .describe('Specific URLs to scrape (for specific_urls mode)'),
    },
    async ({ mode, urls }) => {
      let result;

      switch (mode) {
        case 'full':
          result = await runFullIngestion();
          break;
        case 'change_detection':
          result = await runChangeDetection();
          break;
        case 'specific_urls':
          if (!urls || urls.length === 0) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: 'urls required for specific_urls mode',
                  }),
                },
              ],
              isError: true,
            };
          }
          result = await runFullIngestion(urls);
          break;
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
