export const VALID_STATUSES = [
  'permitted',
  'restricted',
  'banned',
  'permitted_with_limits',
  'unknown',
] as const;

export type IngredientStatus = (typeof VALID_STATUSES)[number];

export interface IngredientAssertion {
  ingredient: string;
  category: string;
  expectedStatuses: IngredientStatus[];
}

export const INGREDIENT_ASSERTIONS: Record<string, IngredientAssertion[]> = {
  eu: [
    { ingredient: 'Hydroquinone', category: 'cosmetics', expectedStatuses: ['banned'] },
    {
      ingredient: 'Retinol',
      category: 'cosmetics',
      expectedStatuses: ['restricted', 'permitted', 'permitted_with_limits'],
    },
  ],
  sg: [
    { ingredient: 'Hydroquinone', category: 'cosmetics', expectedStatuses: ['banned'] },
    { ingredient: 'Melatonin', category: 'health_supplements', expectedStatuses: ['restricted'] },
    {
      ingredient: 'Retinol',
      category: 'cosmetics',
      expectedStatuses: ['permitted_with_limits'],
    },
  ],
  us: [
    {
      ingredient: 'Red 40',
      category: 'food',
      expectedStatuses: ['restricted', 'permitted', 'permitted_with_limits'],
    },
  ],
  jp: [
    { ingredient: 'Hydroquinone', category: 'cosmetics', expectedStatuses: ['unknown'] },
  ],
  in: [
    { ingredient: 'Hydroquinone', category: 'cosmetics', expectedStatuses: ['unknown'] },
  ],
  cn: [
    { ingredient: 'Hydroquinone', category: 'cosmetics', expectedStatuses: ['unknown'] },
  ],
  gcc: [
    { ingredient: 'Hydroquinone', category: 'cosmetics', expectedStatuses: ['unknown'] },
  ],
  au: [],
};

export const CLAIMS_BY_CATEGORY: Record<string, string[]> = {
  food: ['sugar free', 'organic', 'natural'],
  cosmetics: ['anti-aging', 'whitening', 'dermatologically tested'],
  supplements: ['boosts immunity', 'supports bone health'],
};

export function getClaimsForCategory(category: string): string[] {
  if (category.includes('supplement') || category === 'health_food') {
    return CLAIMS_BY_CATEGORY.supplements;
  }
  if (category === 'cosmetics') return CLAIMS_BY_CATEGORY.cosmetics;
  return CLAIMS_BY_CATEGORY.food;
}
