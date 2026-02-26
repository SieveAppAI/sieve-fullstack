import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@sieve/db';

export function registerCheckIngredient(server: McpServer) {
  server.tool(
    'check_ingredient',
    'Check if an ingredient is permitted, restricted, or banned in Singapore for a given product category',
    {
      ingredient: z.string().describe('Ingredient name, INCI name, or CAS number'),
      cas_number: z.string().optional().describe('CAS registry number'),
      product_category: z
        .string()
        .optional()
        .describe('Product category (e.g. food, cosmetics, health_supplements, beverages)'),
      concentration_pct: z
        .number()
        .optional()
        .describe('Concentration percentage in formulation'),
    },
    async ({ ingredient, cas_number, product_category, concentration_pct }) => {
      const supabase = createServiceClient();
      const normalizedName = ingredient.trim().toLowerCase();

      // Find the ingredient in the database
      let ingredientId: string | null = null;

      if (cas_number) {
        const { data } = await supabase
          .from('ingredients')
          .select('id')
          .eq('cas_number', cas_number.trim())
          .limit(1)
          .single();
        ingredientId = data?.id ?? null;
      }

      if (!ingredientId) {
        const { data } = await supabase
          .from('ingredients')
          .select('id')
          .or(`canonical_name.ilike.${normalizedName},inci_name.ilike.${normalizedName}`)
          .limit(1)
          .single();
        ingredientId = data?.id ?? null;
      }

      // Try synonym/common name match
      if (!ingredientId) {
        const { data: synonymMatches } = await supabase.rpc(
          'find_ingredient_by_synonym',
          { search_term: normalizedName }
        );
        ingredientId = synonymMatches?.[0]?.id ?? null;
      }

      if (!ingredientId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                ingredient,
                jurisdiction: 'SG',
                status: 'unknown',
                message: 'Ingredient not found in database',
              }),
            },
          ],
        };
      }

      // Query regulations
      let query = supabase
        .from('ingredient_regulations')
        .select('*')
        .eq('ingredient_id', ingredientId)
        .eq('jurisdiction', 'SG');

      const { data: allRegulations, error } = await query;

      // Filter by product_category client-side for flexible matching
      let regulations = allRegulations;
      if (product_category && regulations) {
        const cat = product_category.toLowerCase();
        const filtered = regulations.filter((r) =>
          (r.product_categories as string[])?.some(
            (pc) => pc.toLowerCase() === cat || pc.toLowerCase().startsWith(cat) || cat.startsWith(pc.toLowerCase())
          )
        );
        if (filtered.length > 0) {
          regulations = filtered;
        }
      }

      if (error) {
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ error: error.message }) },
          ],
          isError: true,
        };
      }

      if (!regulations || regulations.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                ingredient,
                jurisdiction: 'SG',
                status: 'permitted',
                message: 'No restrictions found for this ingredient in Singapore',
              }),
            },
          ],
        };
      }

      // Pick the most restrictive regulation
      const statusPriority = ['banned', 'restricted', 'permitted_with_limits', 'permitted'];
      const sorted = regulations.sort(
        (a, b) => statusPriority.indexOf(a.status) - statusPriority.indexOf(b.status)
      );
      const reg = sorted[0];

      // Check concentration if provided and limits exist
      const warnings: string[] = [...(reg.required_warnings ?? [])];
      if (
        concentration_pct !== undefined &&
        reg.max_concentration_pct !== null &&
        concentration_pct > Number(reg.max_concentration_pct)
      ) {
        warnings.push(
          `Concentration ${concentration_pct}% exceeds maximum allowed ${reg.max_concentration_pct}%`
        );
      }

      const conditions = reg.conditions as Record<string, unknown> | null;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              ingredient,
              jurisdiction: 'SG',
              status: reg.status,
              max_concentration_pct: reg.max_concentration_pct
                ? Number(reg.max_concentration_pct)
                : null,
              max_daily_dose_mg: reg.max_daily_dose_mg
                ? Number(reg.max_daily_dose_mg)
                : null,
              conditions: conditions?.conditions_of_use ?? [],
              required_warnings: warnings,
              regulation_reference: reg.regulation_reference,
              annex_reference: reg.annex_reference,
              product_categories: reg.product_categories,
            }),
          },
        ],
      };
    }
  );
}
