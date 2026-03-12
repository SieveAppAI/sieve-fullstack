import { createServiceClient } from '@sieve/db';
import type { Json } from '@sieve/db';
import type { RegulatoryPage, StructuredData, IngestionTier } from '@sieve/shared';

const JURISDICTION = 'EU';

export async function storeRegulatoryPage(page: RegulatoryPage, tier: IngestionTier = 'exa') {
  const supabase = createServiceClient();

  const { error } = await supabase.from('regulatory_sources').upsert(
    {
      url: page.url,
      title: page.title,
      domain: page.domain,
      regulatory_body: page.regulatory_body,
      jurisdiction: JURISDICTION,
      content_type: page.content_type,
      ingestion_tier: tier,
      content_text: page.content_text,
      content_hash: page.content_hash,
      last_scraped_at: page.scraped_at,
      scrape_status: 'scraped',
    },
    { onConflict: 'url' }
  );

  if (error) {
    console.error(`Failed to store page ${page.url}:`, error);
  }

  return !error;
}

export async function storeStructuredData(
  sourceUrl: string,
  structuredData: StructuredData
) {
  const supabase = createServiceClient();

  // Update source with structured data
  await supabase
    .from('regulatory_sources')
    .update({
      structured_data: structuredData as unknown as Json,
      scrape_status: 'structured',
      updated_at: new Date().toISOString(),
    })
    .eq('url', sourceUrl);

  // Get source ID
  const { data: source } = await supabase
    .from('regulatory_sources')
    .select('id')
    .eq('url', sourceUrl)
    .single();

  if (!source) return;

  type Entry = Record<string, unknown>;

  const entries = (structuredData.entries ??
    structuredData.ingredient_regulations ??
    []) as unknown as Entry[];

  if (
    structuredData.type === 'ingredient_regulation' ||
    structuredData.ingredient_regulations
  ) {
    await storeIngredientRegulations(entries, source.id);
  }

  if (
    structuredData.type === 'labelling_requirement' ||
    structuredData.labelling_requirements
  ) {
    const labellingEntries = (structuredData.labelling_requirements ??
      structuredData.entries ??
      []) as unknown as Entry[];
    await storeLabellingRequirements(labellingEntries, source.id);
  }

  if (
    structuredData.type === 'claims_rule' ||
    structuredData.claims_rules
  ) {
    const claimsEntries = (structuredData.claims_rules ??
      structuredData.entries ??
      []) as unknown as Entry[];
    await storeClaimsRules(claimsEntries, source.id);
  }

  if (
    structuredData.type === 'import_requirement' ||
    structuredData.import_requirements
  ) {
    const importEntries = (structuredData.import_requirements ??
      structuredData.entries ??
      []) as unknown as Entry[];
    await storeImportRequirements(importEntries, source.id);
  }
}

async function storeIngredientRegulations(
  entries: Record<string, unknown>[],
  sourceId: string
) {
  const supabase = createServiceClient();

  for (const entry of entries) {
    const { data: ingredient } = await supabase
      .from('ingredients')
      .upsert(
        {
          canonical_name: entry.ingredient_name as string,
          inci_name: (entry.inci_name as string) ?? null,
          cas_number: (entry.cas_number as string) ?? null,
          category: (entry.category as string) ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'canonical_name' }
      )
      .select('id')
      .single();

    if (!ingredient) continue;

    await supabase.from('ingredient_regulations').upsert(
      {
        ingredient_id: ingredient.id,
        jurisdiction: JURISDICTION,
        regulatory_body: (entry.regulatory_body as string) ?? 'EC',
        status: entry.status as string,
        product_categories: (entry.product_categories as string[]) ?? [],
        max_concentration_pct: entry.max_concentration_pct as number | null,
        max_daily_dose_mg: entry.max_daily_dose_mg as number | null,
        conditions: {
          conditions_of_use: entry.conditions ?? [],
          other_limitations: entry.other_limitations ?? [],
        } as unknown as Json,
        required_warnings: (entry.required_warnings as string[]) ?? [],
        regulation_reference: (entry.regulation_reference as string) ?? null,
        annex_reference: (entry.annex_reference as string) ?? null,
        source_id: sourceId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'ingredient_id,jurisdiction,regulatory_body',
      }
    );
  }
}

async function storeLabellingRequirements(
  entries: Record<string, unknown>[],
  sourceId: string
) {
  const supabase = createServiceClient();

  for (const entry of entries) {
    await supabase.from('labelling_requirements').upsert(
      {
        jurisdiction: JURISDICTION,
        regulatory_body: (entry.regulatory_body as string) ?? 'EC',
        product_category: ((entry.product_categories as string[]) ?? ['food'])[0],
        element: entry.element as string,
        mandatory: (entry.mandatory as boolean) ?? true,
        description: (entry.description as string) ?? null,
        format_rules: (entry.format_rules as Json) ?? null,
        regulation_reference: (entry.regulation_reference as string) ?? null,
        source_id: sourceId,
      },
      { onConflict: 'jurisdiction,product_category,element' }
    );
  }
}

async function storeClaimsRules(
  entries: Record<string, unknown>[],
  sourceId: string
) {
  const supabase = createServiceClient();

  for (const entry of entries) {
    await supabase.from('claims_rules').upsert(
      {
        jurisdiction: JURISDICTION,
        regulatory_body: (entry.regulatory_body as string) ?? 'EC',
        claim_text: entry.claim_text as string,
        claim_type: entry.claim_type as string,
        status: entry.status as string,
        product_categories: (entry.product_categories as string[]) ?? [],
        conditions: (entry.conditions as Json) ?? null,
        regulation_reference: (entry.regulation_reference as string) ?? null,
        source_id: sourceId,
      },
      { onConflict: 'jurisdiction,claim_text,claim_type' }
    );
  }
}

async function storeImportRequirements(
  entries: Record<string, unknown>[],
  sourceId: string
) {
  const supabase = createServiceClient();

  for (const entry of entries) {
    await supabase.from('import_requirements').upsert(
      {
        jurisdiction: JURISDICTION,
        product_category: ((entry.product_categories as string[]) ?? ['food'])[0],
        requirement: entry.requirement as string,
        requirement_type: (entry.requirement_type as string) ?? null,
        regulatory_body: (entry.licensing_body as string) ?? 'EC',
        documents_required: (entry.documents_required as string[]) ?? [],
        regulation_reference: (entry.regulation_reference as string) ?? null,
        source_id: sourceId,
      },
      { onConflict: 'jurisdiction,product_category,requirement' }
    );
  }
}
