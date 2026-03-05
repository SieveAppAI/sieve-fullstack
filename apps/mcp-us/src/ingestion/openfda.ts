import { createServiceClient } from '@sieve/db';
import type { Json } from '@sieve/db';

const JURISDICTION = 'US';
const BASE_URL = 'https://api.fda.gov';
const PAGE_SIZE = 1000;
const PAGE_DELAY_MS = 250;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OpenFdaIngestionResult {
  source: 'openfda_substance' | 'openfda_enforcement' | 'openfda_caers';
  total_fetched: number;
  ingredients_upserted: number;
  regulations_upserted: number;
  sources_upserted: number;
  errors: string[];
}

interface OpenFdaSubstance {
  uuid: string;
  unii?: string;
  substance_class: string;
  names: Array<{
    name: string;
    stdName: string;
    type: string;
    preferred: boolean;
    display_name: boolean;
  }>;
  codes: Array<{
    code: string;
    code_system: string;
    type: string;
    comments?: string;
  }>;
}

interface OpenFdaEnforcementResult {
  recall_number: string;
  reason_for_recall: string;
  status: string;
  distribution_pattern: string;
  product_description: string;
  code_info: string;
  recalling_firm: string;
  classification: string;
  report_date: string;
  recall_initiation_date: string;
  city?: string;
  state?: string;
  country?: string;
  voluntary_mandated?: string;
  product_type?: string;
}

interface OpenFdaResponse<T> {
  meta: {
    results: { skip: number; limit: number; total: number };
  };
  results: T[];
}

// ---------------------------------------------------------------------------
// CFR Mapping
// ---------------------------------------------------------------------------

type RegStatus = 'banned' | 'restricted' | 'permitted' | 'permitted_with_limits';

const CFR_PART_STATUS: Record<number, RegStatus> = {
  172: 'permitted',
  173: 'permitted',
  182: 'permitted',
  184: 'permitted',
  186: 'permitted',
  73: 'permitted_with_limits',
  74: 'permitted_with_limits',
  81: 'permitted_with_limits',
  82: 'permitted_with_limits',
  189: 'banned',
  700: 'banned',
};

const CFR_PART_CATEGORIES: Record<number, string[]> = {
  172: ['food'],
  173: ['food'],
  182: ['food'],
  184: ['food'],
  186: ['food'],
  73: ['food', 'cosmetics'],
  74: ['food', 'cosmetics'],
  81: ['food'],
  82: ['food'],
  189: ['food'],
  700: ['cosmetics'],
};

const STATUS_PRIORITY: Record<RegStatus, number> = {
  banned: 4,
  restricted: 3,
  permitted_with_limits: 2,
  permitted: 1,
};

function cfrPartToStatus(cfrCode: string): RegStatus | null {
  const match = cfrCode.match(/21\s*CFR\s*(\d+)/);
  if (!match) return null;
  const part = parseInt(match[1], 10);
  return CFR_PART_STATUS[part] ?? null;
}

function cfrPartToProductCategories(cfrCode: string): string[] {
  const match = cfrCode.match(/21\s*CFR\s*(\d+)/);
  if (!match) return [];
  const part = parseInt(match[1], 10);
  return CFR_PART_CATEGORIES[part] ?? [];
}

// ---------------------------------------------------------------------------
// Fetch Helpers
// ---------------------------------------------------------------------------

function getApiKey(): string | undefined {
  return process.env.OPENFDA_API_KEY?.trim().replace(/\\n$/, '');
}

async function fetchOpenFda<T>(
  endpoint: string,
  params: Record<string, string | number>
): Promise<OpenFdaResponse<T>> {
  // Build URL manually — OpenFDA's Elasticsearch search syntax
  // requires unencoded brackets and plus signs
  const base = new URL(endpoint, BASE_URL);
  const parts: string[] = [];
  const apiKey = getApiKey();
  if (apiKey) {
    parts.push(`api_key=${encodeURIComponent(apiKey)}`);
  }
  for (const [key, value] of Object.entries(params)) {
    if (key === 'search') {
      // Don't encode search — it contains Elasticsearch query syntax
      parts.push(`search=${String(value)}`);
    } else {
      parts.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  }
  const fullUrl = `${base.origin}${base.pathname}${parts.length ? '?' + parts.join('&') : ''}`;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(fullUrl);

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('retry-after') ?? '5', 10);
      console.warn(`OpenFDA rate limited, waiting ${retryAfter}s...`);
      await delay(retryAfter * 1000);
      continue;
    }

    if (res.status === 404) {
      // No matches found — return empty result
      return { meta: { results: { skip: 0, limit: 0, total: 0 } }, results: [] };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenFDA ${endpoint} returned ${res.status}: ${body}`);
    }

    return (await res.json()) as OpenFdaResponse<T>;
  }

  throw new Error(`OpenFDA ${endpoint} failed after ${maxRetries} retries`);
}

async function* fetchAllPages<T>(
  endpoint: string,
  baseParams: Record<string, string | number>,
  maxRecords?: number
): AsyncGenerator<T[], void, unknown> {
  let skip = 0;
  let totalFetched = 0;

  while (true) {
    const params = { ...baseParams, limit: PAGE_SIZE, skip };
    const response = await fetchOpenFda<T>(endpoint, params);
    const { results } = response;

    if (!results || results.length === 0) break;

    yield results;
    totalFetched += results.length;
    skip += results.length;

    if (maxRecords && totalFetched >= maxRecords) break;
    if (skip >= response.meta.results.total) break;

    await delay(PAGE_DELAY_MS);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Substance Ingestion
// ---------------------------------------------------------------------------

export async function ingestOpenFdaSubstances(options?: {
  maxRecords?: number;
}): Promise<OpenFdaIngestionResult> {
  const result: OpenFdaIngestionResult = {
    source: 'openfda_substance',
    total_fetched: 0,
    ingredients_upserted: 0,
    regulations_upserted: 0,
    sources_upserted: 0,
    errors: [],
  };

  const supabase = createServiceClient();

  const pages = fetchAllPages<OpenFdaSubstance>(
    '/other/substance.json',
    { search: 'codes.code_system:CFR' },
    options?.maxRecords
  );

  for await (const substances of pages) {
    for (const substance of substances) {
      result.total_fetched++;

      try {
        // Extract canonical name
        const displayName = substance.names.find((n) => n.display_name);
        const canonicalName = displayName?.name ?? substance.names[0]?.name;
        if (!canonicalName) {
          result.errors.push(`Substance ${substance.uuid}: no name found`);
          continue;
        }

        // Extract CAS number
        const casCode = substance.codes.find((c) => c.code_system === 'CAS');
        const casNumber = casCode?.code ?? null;

        // Extract all synonyms
        const synonyms = [
          ...new Set(substance.names.map((n) => n.name).filter(Boolean)),
        ];

        // Extract CFR codes
        const cfrCodes = substance.codes.filter(
          (c) => c.code_system === 'CFR'
        );
        if (cfrCodes.length === 0) continue;

        // Determine most restrictive status across all CFR codes
        let bestStatus: RegStatus | null = null;
        const allCategories = new Set<string>();
        const cfrReferences: string[] = [];

        for (const cfr of cfrCodes) {
          const status = cfrPartToStatus(cfr.code);
          if (!status) continue;

          cfrReferences.push(cfr.code);

          if (
            !bestStatus ||
            STATUS_PRIORITY[status] > STATUS_PRIORITY[bestStatus]
          ) {
            bestStatus = status;
          }

          for (const cat of cfrPartToProductCategories(cfr.code)) {
            allCategories.add(cat);
          }
        }

        if (!bestStatus) {
          result.errors.push(
            `Substance ${canonicalName}: no mappable CFR codes`
          );
          continue;
        }

        // Upsert ingredient
        const { data: ingredient } = await supabase
          .from('ingredients')
          .upsert(
            {
              canonical_name: canonicalName,
              cas_number: casNumber,
              synonyms,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'canonical_name' }
          )
          .select('id')
          .single();

        if (!ingredient) {
          result.errors.push(
            `Substance ${canonicalName}: failed to upsert ingredient`
          );
          continue;
        }
        result.ingredients_upserted++;

        // Check existing regulation for concentration preservation
        const { data: existingReg } = await supabase
          .from('ingredient_regulations')
          .select('max_concentration_pct')
          .eq('ingredient_id', ingredient.id)
          .eq('jurisdiction', JURISDICTION)
          .eq('regulatory_body', 'FDA')
          .single();

        await supabase
          .from('ingredient_regulations')
          .upsert(
            {
              ingredient_id: ingredient.id,
              jurisdiction: JURISDICTION,
              regulatory_body: 'FDA',
              status: bestStatus,
              product_categories: [...allCategories],
              regulation_reference: cfrReferences[0] ?? null,
              conditions: {
                cfr_codes: cfrReferences,
                unii: substance.unii ?? null,
              } as unknown as Json,
              max_concentration_pct:
                existingReg?.max_concentration_pct ?? null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'ingredient_id,jurisdiction,regulatory_body',
            }
          );

        result.regulations_upserted++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(
          `Substance ${substance.uuid}: ${msg}`
        );
      }
    }
  }

  console.log(
    `OpenFDA substances: ${result.ingredients_upserted} ingredients, ${result.regulations_upserted} regulations upserted`
  );
  return result;
}

// ---------------------------------------------------------------------------
// Enforcement Ingestion
// ---------------------------------------------------------------------------

export async function ingestOpenFdaEnforcement(options?: {
  daysSince?: number;
  maxRecords?: number;
}): Promise<OpenFdaIngestionResult> {
  const result: OpenFdaIngestionResult = {
    source: 'openfda_enforcement',
    total_fetched: 0,
    ingredients_upserted: 0,
    regulations_upserted: 0,
    sources_upserted: 0,
    errors: [],
  };

  const supabase = createServiceClient();
  const daysSince = options?.daysSince ?? 30;

  // Build date range for search
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysSince);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const dateSearch = `report_date:[${fmt(startDate)}+TO+${fmt(endDate)}]`;

  const pages = fetchAllPages<OpenFdaEnforcementResult>(
    '/food/enforcement.json',
    { search: dateSearch },
    options?.maxRecords
  );

  for await (const recalls of pages) {
    for (const recall of recalls) {
      result.total_fetched++;

      try {
        const syntheticUrl = `https://api.fda.gov/food/enforcement/${recall.recall_number}`;

        // Format recall as readable text
        const contentText = [
          `FDA Food Recall: ${recall.recall_number}`,
          `Status: ${recall.status}`,
          `Classification: ${recall.classification}`,
          `Recalling Firm: ${recall.recalling_firm}`,
          `Product: ${recall.product_description}`,
          `Reason: ${recall.reason_for_recall}`,
          `Distribution: ${recall.distribution_pattern}`,
          `Code Info: ${recall.code_info}`,
          recall.voluntary_mandated
            ? `Type: ${recall.voluntary_mandated}`
            : null,
          recall.recall_initiation_date
            ? `Initiated: ${recall.recall_initiation_date}`
            : null,
          recall.city && recall.state
            ? `Location: ${recall.city}, ${recall.state}`
            : null,
        ]
          .filter(Boolean)
          .join('\n');

        const { error } = await supabase.from('regulatory_sources').upsert(
          {
            url: syntheticUrl,
            title: `FDA Recall: ${recall.recall_number} — ${recall.recalling_firm}`,
            domain: 'api.fda.gov',
            regulatory_body: 'FDA',
            jurisdiction: JURISDICTION,
            content_type: 'html',
            ingestion_tier: 'openfda',
            content_text: contentText,
            scrape_status: 'structured',
            last_scraped_at: new Date().toISOString(),
          },
          { onConflict: 'url' }
        );

        if (error) {
          result.errors.push(
            `Recall ${recall.recall_number}: ${error.message}`
          );
          continue;
        }

        result.sources_upserted++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(`Recall ${recall.recall_number}: ${msg}`);
      }
    }
  }

  console.log(
    `OpenFDA enforcement: ${result.sources_upserted} recall sources upserted`
  );
  return result;
}

// ---------------------------------------------------------------------------
// CAERS (Adverse Events) Ingestion
// ---------------------------------------------------------------------------

interface OpenFdaCaersResult {
  report_number: string;
  outcomes: string[];
  products: Array<{
    name_brand: string;
    industry_name: string;
    role: string;
  }>;
  reactions: string[];
  date_created?: string;
  date_started?: string;
  consumer?: {
    age?: string;
    age_unit?: string;
    gender?: string;
  };
}

export async function ingestOpenFdaCaers(options?: {
  daysSince?: number;
  maxRecords?: number;
}): Promise<OpenFdaIngestionResult> {
  const result: OpenFdaIngestionResult = {
    source: 'openfda_caers',
    total_fetched: 0,
    ingredients_upserted: 0,
    regulations_upserted: 0,
    sources_upserted: 0,
    errors: [],
  };

  const supabase = createServiceClient();
  const daysSince = options?.daysSince ?? 30;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysSince);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const dateSearch = `date_created:[${fmt(startDate)}+TO+${fmt(endDate)}]`;

  const pages = fetchAllPages<OpenFdaCaersResult>(
    '/food/event.json',
    { search: dateSearch },
    options?.maxRecords
  );

  for await (const events of pages) {
    for (const event of events) {
      result.total_fetched++;

      try {
        const syntheticUrl = `https://api.fda.gov/food/event/${event.report_number}`;

        const productNames = (event.products ?? [])
          .map((p) => `${p.name_brand} (${p.industry_name}, role: ${p.role})`)
          .join('; ');

        const contentText = [
          `FDA CAERS Adverse Event: ${event.report_number}`,
          `Products: ${productNames}`,
          `Reactions: ${(event.reactions ?? []).join(', ')}`,
          `Outcomes: ${(event.outcomes ?? []).join(', ')}`,
          event.date_created ? `Date Created: ${event.date_created}` : null,
          event.date_started ? `Date Started: ${event.date_started}` : null,
          event.consumer?.gender ? `Consumer Gender: ${event.consumer.gender}` : null,
          event.consumer?.age ? `Consumer Age: ${event.consumer.age} ${event.consumer.age_unit ?? ''}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        const { error } = await supabase.from('regulatory_sources').upsert(
          {
            url: syntheticUrl,
            title: `CAERS: ${event.report_number} — ${(event.reactions ?? []).slice(0, 3).join(', ')}`,
            domain: 'api.fda.gov',
            regulatory_body: 'FDA',
            jurisdiction: JURISDICTION,
            content_type: 'html' as const,
            ingestion_tier: 'openfda',
            content_text: contentText,
            scrape_status: 'structured',
            last_scraped_at: new Date().toISOString(),
          },
          { onConflict: 'url' }
        );

        if (error) {
          result.errors.push(`CAERS ${event.report_number}: ${error.message}`);
          continue;
        }

        result.sources_upserted++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(`CAERS ${event.report_number}: ${msg}`);
      }
    }
  }

  console.log(
    `OpenFDA CAERS: ${result.sources_upserted} adverse event sources upserted`
  );
  return result;
}
