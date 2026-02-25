import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@sieve/db';

export function registerSearchRegulations(server: McpServer) {
  server.tool(
    'search_regulations',
    'Semantic search over Singapore regulatory content using vector similarity',
    {
      query: z.string().describe('Search query'),
      limit: z.number().optional().default(10).describe('Max results to return'),
    },
    async ({ query, limit }) => {
      const supabase = createServiceClient();

      // Use RPC for vector similarity search
      const { data, error } = await supabase.rpc('search_regulatory_content', {
        query_text: query,
        jurisdiction_filter: 'SG',
        result_limit: limit,
      });

      if (error) {
        // Fallback to text search if vector search not available
        const { data: textResults, error: textError } = await supabase
          .from('regulatory_sources')
          .select('url, title, content_text, regulatory_body')
          .eq('jurisdiction', 'SG')
          .textSearch('content_text', query)
          .limit(limit);

        if (textError) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ error: textError.message }),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  jurisdiction: 'SG',
                  query,
                  results: (textResults ?? []).map((r) => ({
                    chunk_text: r.content_text?.slice(0, 500) ?? '',
                    source_url: r.url,
                    regulatory_body: r.regulatory_body,
                    similarity: 0,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                jurisdiction: 'SG',
                query,
                results: data ?? [],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
