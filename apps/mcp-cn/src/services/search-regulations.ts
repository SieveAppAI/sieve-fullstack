import { z } from 'zod';
import { createServiceClient } from '@sieve/db';
import { embedQuery } from '@/src/ingestion/embed-query';

export const searchRegulationsSchema = z.object({
  query: z.string().describe('Search query (Chinese or English)'),
  limit: z.number().optional().default(10).describe('Max results to return'),
});

export type SearchRegulationsArgs = z.infer<typeof searchRegulationsSchema>;

function textSearchFallback(supabase: ReturnType<typeof createServiceClient>, query: string, limit: number) {
  return supabase
    .from('regulatory_sources')
    .select('url, title, content_text, regulatory_body')
    .eq('jurisdiction', 'CN')
    .textSearch('content_tsv', query, { type: 'websearch' })
    .limit(limit);
}

export async function searchRegulations(args: SearchRegulationsArgs) {
  const { query, limit } = args;
  const supabase = createServiceClient();

  // Try vector search first
  try {
    const vector = await embedQuery(query);

    const { data, error } = await supabase.rpc('search_regulatory_content', {
      query_embedding: `[${vector.join(',')}]`,
      jurisdiction_filter: 'CN',
      result_limit: limit,
    });

    if (!error && data && data.length > 0) {
      return { jurisdiction: 'CN', query, results: data };
    }
  } catch {
    // fall through to text search
  }

  // Fallback to text search
  try {
    const { data: textResults, error: textError } = await textSearchFallback(supabase, query, limit);

    if (!textError && textResults && textResults.length > 0) {
      return {
        jurisdiction: 'CN',
        query,
        fallback: 'text_search',
        results: textResults.map((r) => ({
          chunk_text: r.content_text?.slice(0, 500) ?? '',
          source_url: r.url,
          regulatory_body: r.regulatory_body,
          similarity: 0,
        })),
      };
    }
  } catch {
    // text search also failed — return empty
  }

  return { jurisdiction: 'CN', query, results: [] };
}
