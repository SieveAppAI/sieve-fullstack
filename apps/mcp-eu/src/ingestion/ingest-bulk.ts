import { createServiceClient } from '@sieve/db';
import type { Json } from '@sieve/db';
import * as XLSX from 'xlsx';

const JURISDICTION = 'EU';

export interface BulkIngestionResult {
  source: string;
  total_fetched: number;
  ingredients_upserted: number;
  regulations_upserted: number;
  sources_upserted: number;
  errors: string[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// CosIng Ingredients Inventory
// ---------------------------------------------------------------------------

interface CosIngRow {
  'INCI name'?: string;
  'INN name'?: string;
  'CAS No'?: string;
  'EC No'?: string;
  'Chem/IUPAC Name / Description'?: string;
  'Function'?: string;
  'Restriction'?: string;
  'Regulation'?: string;
  // Column names may vary across versions
  [key: string]: unknown;
}

function cosIngStatusFromRestriction(
  restriction: string | undefined
): 'banned' | 'restricted' | 'permitted' | 'permitted_with_limits' {
  if (!restriction) return 'permitted';
  const lower = restriction.toLowerCase();
  if (lower.includes('annex ii') || lower.includes('prohibited')) return 'banned';
  if (lower.includes('annex iii') || lower.includes('restricted')) return 'restricted';
  if (lower.includes('annex iv') || lower.includes('annex v') || lower.includes('annex vi')) {
    return 'permitted_with_limits';
  }
  return 'permitted';
}

function cosIngAnnexRef(restriction: string | undefined): string | null {
  if (!restriction) return null;
  const match = restriction.match(/Annex\s+(II|III|IV|V|VI)/i);
  return match ? match[0] : null;
}

export async function ingestCosIng(
  fileBuffer: Buffer
): Promise<BulkIngestionResult> {
  const result: BulkIngestionResult = {
    source: 'cosing_ingredients',
    total_fetched: 0,
    ingredients_upserted: 0,
    regulations_upserted: 0,
    sources_upserted: 0,
    errors: [],
  };

  const supabase = createServiceClient();
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    result.errors.push('No sheets found in CosIng file');
    return result;
  }

  const rows = XLSX.utils.sheet_to_json<CosIngRow>(workbook.Sheets[sheetName]!);
  result.total_fetched = rows.length;

  for (const row of rows) {
    const inciName = row['INCI name']?.toString().trim();
    if (!inciName) continue;

    const casNumber = row['CAS No']?.toString().trim() || null;
    const canonicalName = inciName;
    const restriction = row['Restriction']?.toString() || row['Regulation']?.toString();
    const functions = row['Function']?.toString().trim() || null;

    try {
      const { data: ingredient } = await supabase
        .from('ingredients')
        .upsert(
          {
            canonical_name: canonicalName,
            inci_name: inciName,
            cas_number: casNumber,
            category: functions,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'canonical_name' }
        )
        .select('id')
        .single();

      if (!ingredient) {
        result.errors.push(`CosIng ${inciName}: failed to upsert ingredient`);
        continue;
      }
      result.ingredients_upserted++;

      const status = cosIngStatusFromRestriction(restriction);
      const annexRef = cosIngAnnexRef(restriction);

      await supabase.from('ingredient_regulations').upsert(
        {
          ingredient_id: ingredient.id,
          jurisdiction: JURISDICTION,
          regulatory_body: 'EC',
          status,
          product_categories: ['cosmetics'],
          regulation_reference: 'Regulation (EC) No 1223/2009',
          annex_reference: annexRef,
          conditions: {
            functions: functions?.split(',').map((f) => f.trim()) ?? [],
            ec_number: row['EC No']?.toString().trim() ?? null,
            cosing_restriction: restriction ?? null,
          } as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'ingredient_id,jurisdiction,regulatory_body' }
      );

      result.regulations_upserted++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`CosIng ${inciName}: ${msg}`);
    }
  }

  console.log(
    `CosIng: ${result.ingredients_upserted} ingredients, ${result.regulations_upserted} regulations upserted`
  );
  return result;
}

// ---------------------------------------------------------------------------
// EU Health Claims Register
// ---------------------------------------------------------------------------

interface HealthClaimRow {
  'Claim'?: string;
  'Type of claim'?: string;
  'Claim status'?: string;
  'Conditions of use'?: string;
  'Food/constituent'?: string;
  'Reference'?: string;
  [key: string]: unknown;
}

function claimStatusFromRegister(
  status: string | undefined
): 'permitted' | 'prohibited' | 'conditional' {
  if (!status) return 'conditional';
  const lower = status.toLowerCase();
  if (lower.includes('authorised') || lower.includes('authorized')) return 'permitted';
  if (lower.includes('non-authorised') || lower.includes('rejected')) return 'prohibited';
  return 'conditional';
}

function claimTypeFromRegister(
  type: string | undefined
): 'nutrition' | 'health' | 'therapeutic' | 'marketing' {
  if (!type) return 'health';
  const lower = type.toLowerCase();
  if (lower.includes('13.1') || lower.includes('function')) return 'health';
  if (lower.includes('14') || lower.includes('disease risk')) return 'health';
  if (lower.includes('nutrition')) return 'nutrition';
  return 'health';
}

export async function ingestHealthClaimsRegister(
  fileBuffer: Buffer
): Promise<BulkIngestionResult> {
  const result: BulkIngestionResult = {
    source: 'health_claims_register',
    total_fetched: 0,
    ingredients_upserted: 0,
    regulations_upserted: 0,
    sources_upserted: 0,
    errors: [],
  };

  const supabase = createServiceClient();
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    result.errors.push('No sheets found in Health Claims file');
    return result;
  }

  const rows = XLSX.utils.sheet_to_json<HealthClaimRow>(workbook.Sheets[sheetName]!);
  result.total_fetched = rows.length;

  for (const row of rows) {
    const claimText = row['Claim']?.toString().trim();
    if (!claimText) continue;

    const claimType = claimTypeFromRegister(row['Type of claim']?.toString());
    const status = claimStatusFromRegister(row['Claim status']?.toString());
    const conditions = row['Conditions of use']?.toString().trim() || null;
    const reference = row['Reference']?.toString().trim() || 'Regulation (EC) No 1924/2006';

    try {
      await supabase.from('claims_rules').upsert(
        {
          jurisdiction: JURISDICTION,
          regulatory_body: 'EC',
          claim_text: claimText,
          claim_type: claimType,
          status,
          product_categories: ['food', 'supplement'],
          conditions: conditions
            ? ({ conditions_of_use: conditions, food_constituent: row['Food/constituent']?.toString() ?? null } as unknown as Json)
            : null,
          regulation_reference: reference,
        },
        { onConflict: 'jurisdiction,claim_text,claim_type' }
      );

      result.regulations_upserted++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`Claim "${claimText.slice(0, 50)}...": ${msg}`);
    }
  }

  console.log(
    `Health Claims Register: ${result.regulations_upserted} claims upserted`
  );
  return result;
}

// ---------------------------------------------------------------------------
// EFSA OpenFoodTox
// ---------------------------------------------------------------------------

export async function ingestOpenFoodTox(
  fileBuffer: Buffer
): Promise<BulkIngestionResult> {
  const result: BulkIngestionResult = {
    source: 'openfoodtox',
    total_fetched: 0,
    ingredients_upserted: 0,
    regulations_upserted: 0,
    sources_upserted: 0,
    errors: [],
  };

  const supabase = createServiceClient();
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    result.errors.push('No sheets found in OpenFoodTox file');
    return result;
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]!);
  result.total_fetched = rows.length;

  // Build batch records, deduplicating by substance name (URL)
  const now = new Date().toISOString();
  const recordMap = new Map<string, {
    url: string;
    title: string;
    domain: string;
    regulatory_body: string;
    jurisdiction: string;
    content_type: 'html';
    ingestion_tier: string;
    content_text: string;
    scrape_status: string;
    last_scraped_at: string;
  }>();

  for (const row of rows) {
    const substanceName = (
      row['Substance'] ?? row['Substance Name'] ?? row['substance_name'] ?? row['Name']
    )?.toString().trim();
    if (!substanceName) continue;

    const url = `https://zenodo.org/records/8120114#${encodeURIComponent(substanceName)}`;
    if (recordMap.has(url)) continue; // Skip duplicates

    const casNumber = (row['CASNumber'] ?? row['CAS Number'])?.toString().trim();
    const contentParts = [
      `EFSA OpenFoodTox: ${substanceName}`,
      casNumber ? `CAS: ${casNumber}` : null,
      row['Component'] ? `Component: ${row['Component']}` : null,
      row['ECRefNo'] ? `EC Ref: ${row['ECRefNo']}` : null,
      row['MolecularFormula'] ? `Formula: ${row['MolecularFormula']}` : null,
      row['ADI'] ? `ADI: ${row['ADI']}` : null,
      row['TDI'] ? `TDI: ${row['TDI']}` : null,
      row['ARfD'] ? `ARfD: ${row['ARfD']}` : null,
      row['NOAEL'] ? `NOAEL: ${row['NOAEL']}` : null,
    ].filter(Boolean).join('\n');

    recordMap.set(url, {
      url,
      title: `EFSA OpenFoodTox: ${substanceName}`,
      domain: 'zenodo.org',
      regulatory_body: 'EFSA',
      jurisdiction: JURISDICTION,
      content_type: 'html' as const,
      ingestion_tier: 'bulk_download',
      content_text: contentParts,
      scrape_status: 'structured',
      last_scraped_at: now,
    });
  }

  const records = Array.from(recordMap.values());

  // Batch upsert in chunks of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    try {
      const { error } = await supabase
        .from('regulatory_sources')
        .upsert(batch, { onConflict: 'url' });

      if (error) {
        result.errors.push(`OpenFoodTox batch ${i}-${i + batch.length}: ${error.message}`);
      } else {
        result.sources_upserted += batch.length;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`OpenFoodTox batch ${i}-${i + batch.length}: ${msg}`);
    }
  }

  console.log(
    `OpenFoodTox: ${result.sources_upserted} sources upserted`
  );
  return result;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function downloadFile(url: string, label: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Sieve-EU-MCP/1.0' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${label} download failed: HTTP ${res.status}`);
  const contentType = res.headers.get('content-type') ?? '';
  const buf = Buffer.from(await res.arrayBuffer());
  // Detect if response is HTML instead of a spreadsheet
  if (
    contentType.includes('text/html') &&
    buf.length < 100_000 &&
    buf.toString('utf-8', 0, 200).includes('<')
  ) {
    throw new Error(`${label}: received HTML page instead of spreadsheet file`);
  }
  return buf;
}

export async function runBulkDownload(): Promise<BulkIngestionResult[]> {
  const results: BulkIngestionResult[] = [];
  const errors: string[] = [];

  // CosIng bulk download — the portal is an Angular SPA, no direct XLS download available.
  // The data.europa.eu catalog page doesn't provide a direct file URL.
  // CosIng data must be ingested via EUR-Lex annex parsing or Browser Use (Tier 2).
  errors.push(
    'CosIng: No direct bulk download URL available. CosIng portal is an Angular SPA. ' +
    'Use EUR-Lex ingestion (mode: eurlex) for Cosmetics Regulation annexes, ' +
    'or Browser Use (mode: full) for interactive CosIng portal scraping.'
  );

  // Health Claims Register — also an Angular SPA portal, no direct Excel download URL.
  errors.push(
    'Health Claims Register: No direct bulk download URL available. ' +
    'The EU Health Claims Register is an Angular SPA. ' +
    'Use Browser Use (mode: full) for interactive portal scraping.'
  );

  await delay(1000);

  // OpenFoodTox — direct XLSX download from Zenodo API
  try {
    const oftUrl = 'https://zenodo.org/api/records/8120114/files/SubstanceCharacterisation_KJ_2023.xlsx/content';
    const buffer = await downloadFile(oftUrl, 'OpenFoodTox');
    results.push(await ingestOpenFoodTox(buffer));
  } catch (e) {
    errors.push(`OpenFoodTox download error: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (errors.length > 0) {
    results.push({
      source: 'bulk_download_orchestrator',
      total_fetched: 0,
      ingredients_upserted: 0,
      regulations_upserted: 0,
      sources_upserted: 0,
      errors,
    });
  }

  return results;
}
