import { createServiceClient } from '@sieve/db';
import type { Json } from '@sieve/db';

const JURISDICTION = 'US';

interface ParseResult {
  rows_parsed: number;
  ingredients_upserted: number;
  regulations_upserted: number;
  errors: string[];
}

type SourceType = 'eafus' | 'gras_notices' | 'ndi_notifications' | 'prop65_chemicals';

interface ColumnMapping {
  name_col: string;
  cas_col?: string;
  status_col?: string;
  category_col?: string;
  conditions_col?: string;
  reference_col?: string;
}

const COLUMN_MAPPINGS: Record<SourceType, ColumnMapping> = {
  eafus: {
    name_col: 'Substance',
    cas_col: 'CAS Reg No',
    status_col: 'Doc/Reg',
    reference_col: 'CFR Reference',
  },
  gras_notices: {
    name_col: 'Notified Substance',
    cas_col: 'CAS Number',
    status_col: 'FDA Response',
    category_col: 'Intended Use',
    reference_col: 'GRN No.',
  },
  ndi_notifications: {
    name_col: 'New Dietary Ingredient',
    cas_col: 'CAS Number',
    status_col: 'FDA Response',
    conditions_col: 'Conditions of Use',
    reference_col: 'NDI No.',
  },
  prop65_chemicals: {
    name_col: 'Chemical',
    cas_col: 'CAS No.',
    status_col: 'Type of Toxicity',
    category_col: 'Listing Mechanism',
    reference_col: 'Date Listed',
  },
};

function resolveStatus(sourceType: SourceType, rawStatus: string | undefined): string {
  if (!rawStatus) return 'permitted';

  const s = rawStatus.toLowerCase();

  switch (sourceType) {
    case 'eafus':
      return 'permitted';
    case 'gras_notices':
      if (s.includes('no questions')) return 'permitted';
      if (s.includes('cease') || s.includes('withdrawn')) return 'restricted';
      return 'permitted';
    case 'ndi_notifications':
      if (s.includes('no objection')) return 'permitted';
      if (s.includes('objection') || s.includes('inadequate')) return 'restricted';
      return 'permitted';
    case 'prop65_chemicals':
      return 'restricted';
    default:
      return 'permitted';
  }
}

function resolveRegulatoryBody(sourceType: SourceType): string {
  if (sourceType === 'prop65_chemicals') return 'OEHHA';
  return 'FDA';
}

function resolveCategories(sourceType: SourceType, rawCategory?: string): string[] {
  if (sourceType === 'prop65_chemicals') return ['food', 'cosmetics', 'supplements'];
  if (sourceType === 'ndi_notifications') return ['supplements'];
  if (rawCategory) return [rawCategory.toLowerCase()];
  return ['food'];
}

export async function parseExcelData(
  rows: Record<string, unknown>[],
  sourceType: SourceType,
  regulatoryBody?: string
): Promise<ParseResult> {
  const result: ParseResult = {
    rows_parsed: 0,
    ingredients_upserted: 0,
    regulations_upserted: 0,
    errors: [],
  };

  const supabase = createServiceClient();
  const mapping = COLUMN_MAPPINGS[sourceType];
  const regBody = regulatoryBody ?? resolveRegulatoryBody(sourceType);

  for (const row of rows) {
    result.rows_parsed++;

    const name = row[mapping.name_col] as string | undefined;
    if (!name || typeof name !== 'string' || name.trim() === '') continue;

    const casNumber = mapping.cas_col ? (row[mapping.cas_col] as string | undefined) : undefined;
    const rawStatus = mapping.status_col ? (row[mapping.status_col] as string | undefined) : undefined;
    const rawCategory = mapping.category_col ? (row[mapping.category_col] as string | undefined) : undefined;
    const conditions = mapping.conditions_col ? (row[mapping.conditions_col] as string | undefined) : undefined;
    const reference = mapping.reference_col ? (row[mapping.reference_col] as string | undefined) : undefined;

    try {
      const { data: ingredient } = await supabase
        .from('ingredients')
        .upsert(
          {
            canonical_name: name.trim(),
            cas_number: casNumber?.trim() ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'canonical_name' }
        )
        .select('id')
        .single();

      if (!ingredient) {
        result.errors.push(`Row ${result.rows_parsed}: failed to upsert ingredient "${name}"`);
        continue;
      }
      result.ingredients_upserted++;

      await supabase.from('ingredient_regulations').upsert(
        {
          ingredient_id: ingredient.id,
          jurisdiction: JURISDICTION,
          regulatory_body: regBody,
          status: resolveStatus(sourceType, rawStatus),
          product_categories: resolveCategories(sourceType, rawCategory),
          regulation_reference: reference?.trim() ?? null,
          conditions: conditions
            ? ({ conditions_of_use: [conditions.trim()] } as unknown as Json)
            : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'ingredient_id,jurisdiction,regulatory_body' }
      );
      result.regulations_upserted++;
    } catch (e) {
      result.errors.push(`Row ${result.rows_parsed}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}
