import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@sieve/db';

export function registerGetRegulationUpdate(server: McpServer) {
  server.tool(
    'get_regulation_update',
    'Get recent regulatory changes detected in Singapore',
    {
      since: z.string().optional().describe('ISO date to get changes since'),
    },
    async ({ since }) => {
      const supabase = createServiceClient();

      let query = supabase
        .from('regulatory_source_changes')
        .select(
          `
          *,
          regulatory_sources!inner(url, regulatory_body, jurisdiction)
        `
        )
        .eq('regulatory_sources.jurisdiction', 'SG')
        .order('detected_at', { ascending: false })
        .limit(50);

      if (since) {
        query = query.gte('detected_at', since);
      }

      const { data: changes, error } = await query;

      if (error) {
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ error: error.message }) },
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
                since: since ?? null,
                changes: (changes ?? []).map((c) => {
                  const source = c.regulatory_sources as Record<string, unknown>;
                  return {
                    source_url: source?.url ?? null,
                    change_summary: c.change_summary,
                    detected_at: c.detected_at,
                    affected_categories: [],
                  };
                }),
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
