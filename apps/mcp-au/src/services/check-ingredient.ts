import { z } from 'zod';
import { createServiceClient } from '@sieve/db';
import { ServiceError } from './errors';

export const checkIngredientSchema = z.object({
  ingredient: z.string().describe('Ingredient name, INCI name, or CAS number'),
  cas_number: z.string().optional().describe('CAS registry number'),
  product_category: z
    .string()
    .optional()
    .describe('Product category (e.g. food, cosmetics, supplements, beverages)'),
  concentration_pct: z
    .number()
    .optional()
    .describe('Concentration percentage in formulation'),
});

export type CheckIngredientArgs = z.infer<typeof checkIngredientSchema>;

export async function checkIngredient(args: CheckIngredientArgs) {
  const { ingredient, cas_number, product_category, concentration_pct } = args;
  const supabase = createServiceClient();
  const normalizedName = ingredient.trim().toLowerCase();

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
    const { data: nameMatches } = await supabase
      .from('ingredients')
      .select('id')
      .or(`canonical_name.ilike.${normalizedName},inci_name.ilike.${normalizedName}`)
      .limit(5);
    if (nameMatches && nameMatches.length === 1) {
      ingredientId = nameMatches[0].id;
    } else if (nameMatches && nameMatches.length > 1) {
      for (const match of nameMatches) {
        const { data: regs } = await supabase
          .from('ingredient_regulations')
          .select('id')
          .eq('ingredient_id', match.id)
          .in('jurisdiction', ['AU', 'NZ', 'AU_NZ'])
          .limit(1);
        if (regs && regs.length > 0) {
          ingredientId = match.id;
          break;
        }
      }
      if (!ingredientId) ingredientId = nameMatches[0].id;
    }
  }

  // If exact match found but no AU_NZ regulations, try partial match
  // This handles cases like "Tartrazine" vs "Tartrazine (Food Yellow No. 4)"
  if (ingredientId) {
    const { data: regCheck } = await supabase
      .from('ingredient_regulations')
      .select('id')
      .eq('ingredient_id', ingredientId)
      .in('jurisdiction', ['AU', 'NZ', 'AU_NZ'])
      .limit(1);
    if (!regCheck || regCheck.length === 0) {
      // Try partial name match for a different ingredient entry with AU_NZ regs
      const { data: partialMatches } = await supabase
        .from('ingredients')
        .select('id')
        .or(`canonical_name.ilike.%${normalizedName}%,inci_name.ilike.%${normalizedName}%`)
        .neq('id', ingredientId)
        .limit(5);
      if (partialMatches) {
        for (const match of partialMatches) {
          const { data: hasRegs } = await supabase
            .from('ingredient_regulations')
            .select('id')
            .eq('ingredient_id', match.id)
            .in('jurisdiction', ['AU', 'NZ', 'AU_NZ'])
            .limit(1);
          if (hasRegs && hasRegs.length > 0) {
            ingredientId = match.id;
            break;
          }
        }
      }
    }
  }

  if (!ingredientId) {
    const { data: synonymMatches } = await supabase.rpc(
      'find_ingredient_by_synonym',
      { search_term: normalizedName }
    );
    ingredientId = synonymMatches?.[0]?.id ?? null;
  }

  if (!ingredientId) {
    const { data: fuzzyMatches } = await supabase.rpc(
      'fuzzy_match_ingredient',
      { search_term: normalizedName, similarity_threshold: 0.2, result_limit: 1 }
    );
    ingredientId = fuzzyMatches?.[0]?.id ?? null;
  }

  if (!ingredientId) {
    return {
      ingredient,
      jurisdiction: 'AU_NZ',
      status: 'unknown',
      message: 'Ingredient not found in database',
    };
  }

  const query = supabase
    .from('ingredient_regulations')
    .select('*')
    .eq('ingredient_id', ingredientId)
    .in('jurisdiction', ['AU', 'NZ', 'AU_NZ']);

  const { data: allRegulations, error } = await query;

  if (error) {
    throw new ServiceError(error.message);
  }

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

  if (!regulations || regulations.length === 0) {
    return {
      ingredient,
      jurisdiction: 'AU_NZ',
      status: 'unknown',
      message: 'No regulatory data available for this ingredient in Australia and New Zealand. This does not mean the ingredient is permitted — consult the relevant regulatory authority.',
    };
  }

  const statusPriority = ['banned', 'restricted', 'permitted_with_limits', 'permitted'];
  const sorted = regulations.sort(
    (a, b) => statusPriority.indexOf(a.status) - statusPriority.indexOf(b.status)
  );
  const reg = sorted[0];

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
    ingredient,
    jurisdiction: 'AU_NZ',
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
  };
}
