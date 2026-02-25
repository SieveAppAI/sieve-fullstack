import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@sieve/db';

export function registerGetImportRequirements(server: McpServer) {
  server.tool(
    'get_import_requirements',
    'Get import requirements for products entering Singapore',
    {
      product_category: z
        .enum(['food', 'supplement', 'cosmetic'])
        .describe('Product category'),
      origin_country: z.string().optional().describe('Country of origin'),
    },
    async ({ product_category, origin_country }) => {
      const supabase = createServiceClient();

      const { data: requirements, error } = await supabase
        .from('import_requirements')
        .select('*')
        .eq('jurisdiction', 'SG')
        .eq('product_category', product_category);

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
                product_category,
                origin_country: origin_country ?? null,
                requirements: (requirements ?? []).map((r) => ({
                  requirement: r.requirement,
                  requirement_type: r.requirement_type,
                  regulatory_body: r.regulatory_body,
                  documents_required: r.documents_required,
                  special_conditions: r.special_conditions,
                  regulation_reference: r.regulation_reference,
                })),
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
