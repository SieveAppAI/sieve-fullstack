import { z } from 'zod';
import { createServiceClient } from '@sieve/db';
import { ServiceError } from './errors';

export const labellingRequirementsSchema = z.object({
  product_category: z
    .string()
    .describe('Product category (e.g. food, cosmetic, supplement, beverages)'),
});

export type LabellingRequirementsArgs = z.infer<typeof labellingRequirementsSchema>;

export async function getLabellingRequirements(args: LabellingRequirementsArgs) {
  const { product_category } = args;
  const supabase = createServiceClient();

  const { data: requirements, error } = await supabase
    .from('labelling_requirements')
    .select('*')
    .eq('jurisdiction', 'US')
    .ilike('product_category', `%${product_category}%`)
    .order('mandatory', { ascending: false });

  if (error) {
    throw new ServiceError(error.message);
  }

  return {
    jurisdiction: 'US',
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
  };
}
