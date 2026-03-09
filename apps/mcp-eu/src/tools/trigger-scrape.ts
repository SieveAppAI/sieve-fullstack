import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { triggerScrapeSchema, triggerScrape } from '../services/trigger-scrape';

export function registerTriggerScrape(server: McpServer) {
  server.tool(
    'trigger_scrape',
    'Trigger a scrape of EU regulatory sources — supports full, change_detection, specific_urls, bulk_download (CosIng/Claims/OpenFoodTox), and eurlex modes (admin only)',
    triggerScrapeSchema.shape,
    async (args) => {
      const result = await triggerScrape(args);

      if (result && 'error' in result && typeof result.error === 'string') {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
