import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@sieve/db';
import { embedQuery } from '@/src/ingestion/embed-query';

function textSearchFallback(supabase: ReturnType<typeof createServiceClient>, query: string, limit: number) {
  return supabase
    .from('regulatory_sources')
    .select('url, title, content_text, regulatory_body')
    .eq('jurisdiction', 'SG')
    .textSearch('content_tsv', query, { type: 'websearch' })
    .limit(limit);
}

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

      // Try vector search first
      try {
        const vector = await embedQuery(query);

        const { data, error } = await supabase.rpc('search_regulatory_content', {
          query_embedding: `[${vector.join(',')}]`,
          jurisdiction_filter: 'SG',
          result_limit: limit,
        });

        if (!error && data && data.length > 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { jurisdiction: 'SG', query, results: data },
                  null,
                  2
                ),
              },
            ],
          };
        }
      } catch {
        // fall through to text search
      }

      // Fallback to text search (empty vector results, missing API key, no embeddings, etc.)
      try {
        const { data: textResults, error: textError } = await textSearchFallback(supabase, query, limit);

        if (!textError && textResults && textResults.length > 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    jurisdiction: 'SG',
                    query,
                    fallback: 'text_search',
                    results: textResults.map((r) => ({
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
      } catch {
        // text search also failed — return empty
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              { jurisdiction: 'SG', query, results: [] },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
