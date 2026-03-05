import { createServiceClient } from '@sieve/db';

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const JURISDICTION = 'US';
const PAGE_SIZE = 200;
const PAGE_DELAY_MS = 250;

export interface UsdaFdcIngestionResult {
  source: 'usda_fdc';
  total_fetched: number;
  sources_upserted: number;
  errors: string[];
}

interface FdcFood {
  fdcId: number;
  description: string;
  dataType: string;
  publicationDate?: string;
  foodNutrients?: Array<{
    nutrientId: number;
    nutrientName: string;
    nutrientNumber: string;
    unitName: string;
    value: number;
  }>;
}

interface FdcSearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: FdcFood[];
}

function getApiKey(): string {
  const key = process.env.DATA_GOV_API_KEY?.trim();
  if (!key) throw new Error('Missing DATA_GOV_API_KEY');
  return key;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ingestUsdaFdcNutrients(options?: {
  query?: string;
  maxRecords?: number;
  mode?: 'full' | 'search';
}): Promise<UsdaFdcIngestionResult> {
  const result: UsdaFdcIngestionResult = {
    source: 'usda_fdc',
    total_fetched: 0,
    sources_upserted: 0,
    errors: [],
  };

  const supabase = createServiceClient();
  const apiKey = getApiKey();
  const mode = options?.mode ?? 'full';
  const maxRecords = options?.maxRecords ?? 1000;

  if (mode === 'search' && options?.query) {
    // Search mode: POST with JSON body
    const url = `${BASE_URL}/foods/search?api_key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: options.query,
          dataType: ['Foundation', 'SR Legacy'],
          pageSize: Math.min(PAGE_SIZE, maxRecords),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        result.errors.push(`USDA FDC search returned ${res.status}: ${body.slice(0, 200)}`);
        return result;
      }

      const data = (await res.json()) as FdcSearchResponse;
      for (const food of data.foods) {
        result.total_fetched++;
        const stored = await storeFdcFood(supabase, food);
        if (stored) result.sources_upserted++;
        else result.errors.push(`Failed to store FDC ${food.fdcId}`);
      }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }
  } else {
    // Full mode: paginate through Foundation + SR Legacy datasets
    let pageNumber = 1;

    while (result.total_fetched < maxRecords) {
      const url = `${BASE_URL}/foods/list?api_key=${apiKey}`;

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataType: ['Foundation', 'SR Legacy'],
            pageSize: PAGE_SIZE,
            pageNumber,
          }),
        });

        if (!res.ok) {
          result.errors.push(`USDA FDC list page ${pageNumber} returned ${res.status}`);
          break;
        }

        const foods = (await res.json()) as FdcFood[];
        if (!foods || foods.length === 0) break;

        for (const food of foods) {
          result.total_fetched++;
          const stored = await storeFdcFood(supabase, food);
          if (stored) result.sources_upserted++;
        }

        pageNumber++;
        await delay(PAGE_DELAY_MS);
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e));
        break;
      }
    }
  }

  console.log(
    `USDA FDC: ${result.sources_upserted}/${result.total_fetched} foods stored`
  );
  return result;
}

async function storeFdcFood(
  supabase: ReturnType<typeof createServiceClient>,
  food: FdcFood
): Promise<boolean> {
  const syntheticUrl = `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${food.fdcId}/nutrients`;

  const nutrients = (food.foodNutrients ?? [])
    .map((n) => `${n.nutrientName}: ${n.value} ${n.unitName}`)
    .join('\n');

  const contentText = [
    `USDA FoodData Central: ${food.description}`,
    `FDC ID: ${food.fdcId}`,
    `Data Type: ${food.dataType}`,
    food.publicationDate ? `Published: ${food.publicationDate}` : null,
    nutrients ? `\nNutrient Composition:\n${nutrients}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const { error } = await supabase.from('regulatory_sources').upsert(
    {
      url: syntheticUrl,
      title: `USDA FDC: ${food.description}`,
      domain: 'fdc.nal.usda.gov',
      regulatory_body: 'USDA',
      jurisdiction: JURISDICTION,
      content_type: 'html' as const,
      ingestion_tier: 'usda_fdc_api',
      content_text: contentText,
      scrape_status: 'structured',
      last_scraped_at: new Date().toISOString(),
    },
    { onConflict: 'url' }
  );

  return !error;
}
