import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@sieve/db';
import type { ResolvedIngredient, UnresolvedIngredient } from '@sieve/shared';

const FUZZY_THRESHOLD = 0.3;

interface IngredientRow {
  id: string;
  canonical_name: string;
  inci_name: string | null;
  cas_number: string | null;
  synonyms: string[];
  common_names: string[];
  category: string | null;
}

async function resolveOne(
  supabase: ReturnType<typeof createServiceClient>,
  input: { name: string; cas_number?: string }
): Promise<ResolvedIngredient | UnresolvedIngredient> {
  const normalizedName = input.name.trim().toLowerCase();

  // Layer 1: CAS exact match (highest confidence)
  if (input.cas_number) {
    const { data } = await supabase
      .from('ingredients')
      .select('*')
      .eq('cas_number', input.cas_number.trim())
      .limit(1)
      .single();

    if (data) {
      return toResolved(input.name, data as IngredientRow, 1.0, 'cas_exact');
    }
  }

  // Layer 2: INCI exact match
  const { data: inciMatch } = await supabase
    .from('ingredients')
    .select('*')
    .ilike('inci_name', normalizedName)
    .limit(1)
    .single();

  if (inciMatch) {
    return toResolved(input.name, inciMatch as IngredientRow, 0.95, 'inci_exact');
  }

  // Layer 3: Canonical name exact match
  const { data: nameMatch } = await supabase
    .from('ingredients')
    .select('*')
    .ilike('canonical_name', normalizedName)
    .limit(1)
    .single();

  if (nameMatch) {
    return toResolved(input.name, nameMatch as IngredientRow, 0.95, 'name_exact');
  }

  // Layer 4: Synonym / common name match (case-insensitive via SQL function)
  const { data: synonymMatches } = await supabase.rpc(
    'find_ingredient_by_synonym',
    { search_term: normalizedName }
  );

  if (synonymMatches && synonymMatches.length > 0) {
    return toResolved(
      input.name,
      synonymMatches[0] as IngredientRow,
      0.85,
      'synonym'
    );
  }

  // Layer 5: Fuzzy match via pg_trgm
  const { data: fuzzyMatches } = await supabase.rpc('fuzzy_match_ingredient', {
    search_term: normalizedName,
    similarity_threshold: FUZZY_THRESHOLD,
    result_limit: 1,
  });

  if (fuzzyMatches && fuzzyMatches.length > 0) {
    const match = fuzzyMatches[0];
    return toResolved(
      input.name,
      match as IngredientRow,
      match.similarity ?? 0.5,
      'fuzzy'
    );
  }

  // Unresolved — try to find a best guess with lower threshold
  const { data: guessMatches } = await supabase.rpc('fuzzy_match_ingredient', {
    search_term: normalizedName,
    similarity_threshold: 0.15,
    result_limit: 1,
  });

  return {
    input_name: input.name,
    best_guess: guessMatches?.[0]?.canonical_name ?? null,
    confidence: guessMatches?.[0]?.similarity ?? 0,
    requires_review: true,
  };
}

function toResolved(
  inputName: string,
  row: IngredientRow,
  confidence: number,
  method: ResolvedIngredient['match_method']
): ResolvedIngredient {
  return {
    input_name: inputName,
    canonical_name: row.canonical_name,
    inci_name: row.inci_name,
    cas_number: row.cas_number,
    match_confidence: confidence,
    match_method: method,
    synonyms: row.synonyms ?? [],
  };
}

export function registerResolveIngredients(server: McpServer) {
  server.tool(
    'resolve_ingredients',
    'Resolve ingredient names to canonical entries via multi-layer matching (CAS, INCI, name, synonym, fuzzy)',
    {
      ingredients: z
        .array(
          z.object({
            name: z.string(),
            cas_number: z.string().optional(),
          })
        )
        .describe('Array of ingredients to resolve'),
    },
    async ({ ingredients }) => {
      const supabase = createServiceClient();
      const resolved: ResolvedIngredient[] = [];
      const unresolved: UnresolvedIngredient[] = [];

      for (const input of ingredients) {
        const result = await resolveOne(supabase, input);
        if ('match_method' in result) {
          resolved.push(result);
        } else {
          unresolved.push(result);
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ resolved, unresolved }, null, 2),
          },
        ],
      };
    }
  );
}
