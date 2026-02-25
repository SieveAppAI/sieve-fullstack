export type MatchMethod =
  | 'cas_exact'
  | 'inci_exact'
  | 'name_exact'
  | 'synonym'
  | 'fuzzy';

export interface ResolvedIngredient {
  input_name: string;
  canonical_name: string;
  inci_name: string | null;
  cas_number: string | null;
  match_confidence: number;
  match_method: MatchMethod;
  synonyms: string[];
}

export interface UnresolvedIngredient {
  input_name: string;
  best_guess: string | null;
  confidence: number;
  requires_review: boolean;
}

export interface ResolveIngredientsResult {
  resolved: ResolvedIngredient[];
  unresolved: UnresolvedIngredient[];
}

export interface IngredientSearchResult {
  id: string;
  canonical_name: string;
  inci_name: string | null;
  cas_number: string | null;
  category: string | null;
  synonyms: string[];
  common_names: string[];
  relevance: number;
}

export interface IngredientsMCPServer {
  resolve_ingredients(input: {
    ingredients: { name: string; cas_number?: string }[];
  }): Promise<ResolveIngredientsResult>;

  add_synonym(input: {
    canonical_name: string;
    new_synonym: string;
  }): Promise<void>;

  search_ingredient(input: {
    query: string;
    limit?: number;
  }): Promise<IngredientSearchResult[]>;
}
