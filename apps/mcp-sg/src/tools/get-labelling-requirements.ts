import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@sieve/db';

export function registerGetLabellingRequirements(server: McpServer) {
  server.tool(
    'get_labelling_requirements',
    'Get mandatory and optional labelling requirements for products in Singapore',
    {
      product_category: z
        .string()
        .describe('Product category (e.g. food, cosmetic, supplement, beverages)'),
    },
    async ({ product_category }) => {
      const supabase = createServiceClient();

      // Use ilike with wildcards for flexible matching against free-text categories
      const query = supabase
        .from('labelling_requirements')
        .select('*')
        .eq('jurisdiction', 'SG')
        .ilike('product_category', `%${product_category}%`)
        .order('mandatory', { ascending: false });

      const { data: requirements, error } = await query;

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
                elements: (requirements ?? []).map((r) => ({
                  element: r.element,
                  mandatory: r.mandatory,
                  description: r.description,
                  format_rules: r.format_rules,
                  language_requirements: r.language_requirements,
                  exemptions: r.exemptions,
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
