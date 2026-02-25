import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@sieve/db';

export function registerGetLabellingRequirements(server: McpServer) {
  server.tool(
    'get_labelling_requirements',
    'Get mandatory and optional labelling requirements for products in Singapore',
    {
      product_category: z
        .enum(['food', 'supplement', 'cosmetic'])
        .describe('Product category'),
      subcategory: z.string().optional().describe('Product subcategory'),
    },
    async ({ product_category, subcategory }) => {
      const supabase = createServiceClient();

      let query = supabase
        .from('labelling_requirements')
        .select('*')
        .eq('jurisdiction', 'SG')
        .eq('product_category', product_category)
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
                subcategory: subcategory ?? null,
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
