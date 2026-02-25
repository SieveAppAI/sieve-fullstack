import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@sieve/db';

export function registerSearchIngredient(server: McpServer) {
  server.tool(
    'search_ingredient',
    'Search ingredients by name, INCI, or synonym with relevance ranking',
    {
      query: z.string().describe('Search query'),
      limit: z.number().optional().default(10).describe('Max results'),
    },
    async ({ query, limit }) => {
      const supabase = createServiceClient();
      const normalizedQuery = query.trim().toLowerCase();

      const { data, error } = await supabase.rpc('search_ingredients', {
        search_term: normalizedQuery,
        result_limit: limit,
      });

      if (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: error.message }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(data ?? [], null, 2),
          },
        ],
      };
    }
  );
}
