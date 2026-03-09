import { z } from 'zod';
import { createServiceClient } from '@sieve/db';
import { ServiceError } from './errors';

const TARGET_COUNTRY_TO_BODY: Record<string, string[]> = {
  SA: ['SFDA'],
  AE: ['MOIAT', 'DM', 'ADAFSA'],
  BH: ['NHRA'],
  KW: ['PAFN'],
  QA: ['MOPH'],
  OM: ['FSQC'],
};

export const importRequirementsSchema = z.object({
  product_category: z
    .string()
    .describe('Product category (e.g. food, cosmetic, supplement, beverages)'),
  target_country: z
    .string()
    .optional()
    .describe(
      'Specific GCC country code (SA, AE, BH, KW, QA, OM). Omit for shared GSO requirements.'
    ),
});

export type ImportRequirementsArgs = z.infer<typeof importRequirementsSchema>;

export async function getImportRequirements(args: ImportRequirementsArgs) {
  const { product_category, target_country } = args;
  const supabase = createServiceClient();

  let query = supabase
    .from('import_requirements')
    .select('*')
    .eq('jurisdiction', 'GCC')
    .ilike('product_category', `%${product_category}%`);

  if (target_country) {
    const bodies = TARGET_COUNTRY_TO_BODY[target_country.toUpperCase()];
    if (bodies && bodies.length > 0) {
      query = query.in('regulatory_body', bodies);
    }
  }

  const { data: requirements, error } = await query;

  if (error) {
    throw new ServiceError(error.message);
  }

  return {
    jurisdiction: 'GCC',
    product_category,
    target_country: target_country ?? null,
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
