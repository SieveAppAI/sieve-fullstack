import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@sieve/db';

export function registerGetImportRequirements(server: McpServer) {
  server.tool(
    'get_import_requirements',
    'Get import requirements for products entering Singapore',
    {
      product_category: z
        .string()
        .describe('Product category (e.g. food, cosmetic, supplement, beverages)'),
    },
    async ({ product_category }) => {
      const supabase = createServiceClient();

      const { data: requirements, error } = await supabase
        .from('import_requirements')
        .select('*')
        .eq('jurisdiction', 'SG')
        .ilike('product_category', `%${product_category}%`);

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
