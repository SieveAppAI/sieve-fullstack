import { z } from 'zod';
import { createServiceClient } from '@sieve/db';

export const validateClaimsSchema = z.object({
  claims: z.array(z.string()).describe('Array of claims to validate'),
  product_category: z
    .string()
    .describe('Product category (e.g. food, health_food, cosmetics)'),
  nutrition_info: z
    .record(z.number())
    .optional()
    .describe('Nutrition info (e.g., fat_g, sugar_g, sodium_mg)'),
});

export type ValidateClaimsArgs = z.infer<typeof validateClaimsSchema>;

export async function validateClaims(args: ValidateClaimsArgs) {
  const { claims, product_category, nutrition_info } = args;
  const supabase = createServiceClient();

  const results = await Promise.all(
    claims.map(async (claim) => {
      const normalizedClaim = claim.trim().toLowerCase();

      // Search claims_rules for matching rules
      const { data: allRules } = await supabase
        .from('claims_rules')
        .select('*')
        .eq('jurisdiction', 'CN')
        .ilike('claim_text', `%${normalizedClaim}%`);

      // Filter by product_category client-side for flexible matching
      const cat = product_category.toLowerCase();
      const rules = allRules?.filter((r) => {
        const cats = r.product_categories as string[] | null;
        if (!cats || cats.length === 0) return true;
        return cats.some(
          (pc) => pc.toLowerCase().includes(cat) || cat.includes(pc.toLowerCase())
        );
      }) ?? null;

      if (!rules || rules.length === 0) {
        return {
          claim,
          status: 'unknown' as const,
          conditions: null,
          regulation_reference: null,
          reason: 'No matching rule found in China regulations database',
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
    jurisdiction: 'CN',
    product_category,
    results,
  };
}
