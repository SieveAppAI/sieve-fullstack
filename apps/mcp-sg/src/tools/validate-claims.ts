import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@sieve/db';

export function registerValidateClaims(server: McpServer) {
  server.tool(
    'validate_claims',
    'Validate product claims against Singapore regulations',
    {
      claims: z.array(z.string()).describe('Array of claims to validate'),
      product_category: z
        .enum(['food', 'supplement', 'cosmetic'])
        .describe('Product category'),
      nutrition_info: z
        .record(z.number())
        .optional()
        .describe('Nutrition info (e.g., fat_g, sugar_g, sodium_mg)'),
    },
    async ({ claims, product_category, nutrition_info }) => {
      const supabase = createServiceClient();

      const results = await Promise.all(
        claims.map(async (claim) => {
          const normalizedClaim = claim.trim().toLowerCase();

          // Search claims_rules for matching rules
          const { data: rules } = await supabase
            .from('claims_rules')
            .select('*')
            .eq('jurisdiction', 'SG')
            .contains('product_categories', [product_category])
            .ilike('claim_text', `%${normalizedClaim}%`);

          if (!rules || rules.length === 0) {
            return {
              claim,
              status: 'unknown' as const,
              conditions: null,
              regulation_reference: null,
              reason: 'No matching rule found in Singapore regulations database',
            };
          }

          const rule = rules[0];

          // For conditional claims with nutrition thresholds, validate
          if (
            rule.status === 'conditional' &&
            rule.conditions &&
            nutrition_info
          ) {
            const conditions = rule.conditions as Record<string, unknown>;
            const nutrient = conditions.nutrient as string | undefined;
            const operator = conditions.operator as string | undefined;
            const value = conditions.value as number | undefined;

            if (nutrient && operator && value !== undefined) {
              const actualValue = nutrition_info[`${nutrient}_g`] ?? nutrition_info[`${nutrient}_mg`];
              if (actualValue !== undefined) {
                let passes = false;
                switch (operator) {
                  case '<=':
                    passes = actualValue <= value;
                    break;
                  case '>=':
                    passes = actualValue >= value;
                    break;
                  case '<':
                    passes = actualValue < value;
                    break;
                  case '>':
                    passes = actualValue > value;
                    break;
                }

                return {
                  claim,
                  status: passes ? ('permitted' as const) : ('prohibited' as const),
                  conditions: rule.conditions,
                  regulation_reference: rule.regulation_reference,
                  reason: passes
                    ? `Meets threshold: ${nutrient} ${actualValue} ${operator} ${value}`
                    : `Does not meet threshold: ${nutrient} ${actualValue} should be ${operator} ${value}`,
                };
              }
            }
          }

          return {
            claim,
            status: rule.status as 'permitted' | 'prohibited' | 'conditional',
            conditions: rule.conditions,
            regulation_reference: rule.regulation_reference,
            reason: null,
          };
        })
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                jurisdiction: 'SG',
                product_category,
                results,
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
