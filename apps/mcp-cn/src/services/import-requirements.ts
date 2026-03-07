import { z } from 'zod';
import { createServiceClient } from '@sieve/db';
import { ServiceError } from './errors';

export const importRequirementsSchema = z.object({
  product_category: z
    .string()
    .describe('Product category (e.g. food, health_food, cosmetics, beverages)'),
});

export type ImportRequirementsArgs = z.infer<typeof importRequirementsSchema>;

export async function getImportRequirements(args: ImportRequirementsArgs) {
  const { product_category } = args;
  const supabase = createServiceClient();

  const { data: requirements, error } = await supabase
    .from('import_requirements')
    .select('*')
    .eq('jurisdiction', 'CN')
    .ilike('product_category', `%${product_category}%`);

  if (error) {
    throw new ServiceError(error.message);
  }

  return {
    jurisdiction: 'CN',
    product_category,
    requirements: (requirements ?? []).map((r) => ({
      requirement: r.requirement,
      requirement_type: r.requirement_type,
      regulatory_body: r.regulatory_body,
      documents_required: r.documents_required,
      special_conditions: r.special_conditions,
      regulation_reference: r.regulation_reference,
    })),
  };
}
