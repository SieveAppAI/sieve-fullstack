import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@sieve/db';
import type { Json } from '@sieve/db';

const JURISDICTION = 'US';
const MAX_PDF_PAGES = 95; // Claude limit is 100, leave margin

interface PdfSource {
  url: string;
  title: string;
  regulatoryBody: string;
  dataType: 'ingredient_regulation' | 'labelling_requirement' | 'claims_rule' | 'mixed';
  chunkPages?: number; // If set, process in page chunks of this size
}

const PDF_SOURCES: PdfSource[] = [
  // Already ingested successfully — will skip via hash check
  {
    url: 'https://www.fda.gov/media/88234/download',
    title: 'FDA Cosmetics Labeling Guide',
    regulatoryBody: 'FDA',
    dataType: 'labelling_requirement',
  },
  {
    url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/Health-Products-Compliance-Guidance.pdf',
    title: 'FTC Health Products Compliance Guidance (2022)',
    regulatoryBody: 'FTC',
    dataType: 'claims_rule',
  },
  // Retry: returned prose instead of JSON last time
  {
    url: 'https://www.fda.gov/media/97470/download',
    title: 'FDA Small Entity Compliance Guide: Structure/Function Claims on Dietary Supplements',
    regulatoryBody: 'FDA',
    dataType: 'claims_rule',
  },
  // Large PDFs: >100 pages — NOT supported by Claude PDF input yet
  // These need to be fetched as text via Exa or split externally
  // Skipping: Food Labeling Guide (8.5MB), CIR Quick Reference Table (4.8MB)

  // OEHHA: site blocks automated download — skip for now
  // Will need manual upload via /api/v1/upload-excel with the Excel version instead
];

// Sources that are HTML, not PDF — ingest as HTML via Exa pipeline
const HTML_SOURCES_TO_SEED = [
  {
    url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cpg-sec-585525-mushroom-mycelium-fitness-food-labeling',
    title: 'CPG Sec 585.525: Mushroom Mycelium - Fitness for Food; Labeling',
    regulatoryBody: 'FDA',
  },
];

function buildPrompt(source: PdfSource): string {
  const base = `You are a regulatory data extraction expert. This PDF is from ${source.regulatoryBody} (United States). Document: ${source.title}.

Extract ALL data into structured JSON. This is a COMPLETE extraction — do not skip any entries, even if there are hundreds. Accuracy is critical as this data will be used for automated compliance checking.

CRITICAL: You MUST output ONLY valid JSON. No prose, no explanation, no markdown fences. Start with { and end with }.`;

  if (source.dataType === 'ingredient_regulation') {
    return `${base}

Output format:
{"type":"ingredient_regulation","source_document":"${source.url}","extraction_date":"${new Date().toISOString()}","entries":[{"ingredient_name":"string","inci_name":"string|null","cas_number":"string|null","status":"banned|restricted|permitted|permitted_with_limits","product_categories":["string"],"max_concentration_pct":null,"max_daily_dose_mg":null,"conditions":["string"],"required_warnings":["string"],"regulation_reference":"string","annex_reference":null,"effective_date":null}],"total_entries_extracted":0}

Extract EVERY row/entry. Preserve exact values. Use null for empty fields.`;
  }

  if (source.dataType === 'labelling_requirement') {
    return `${base}

Output format:
{"type":"labelling_requirement","source_document":"${source.url}","extraction_date":"${new Date().toISOString()}","entries":[{"element":"string","mandatory":true,"product_categories":["string"],"description":"string","format_rules":"string|null","exemptions":["string"],"regulation_reference":"string"}],"total_entries_extracted":0}

Extract EVERY labelling requirement, rule, and exemption. Include format specs where given.`;
  }

  if (source.dataType === 'claims_rule') {
    return `${base}

Output format:
{"type":"claims_rule","source_document":"${source.url}","extraction_date":"${new Date().toISOString()}","entries":[{"claim_text":"string","claim_type":"nutrition|health|therapeutic|marketing","status":"permitted|prohibited|conditional","conditions":null,"product_categories":["string"],"regulation_reference":"string"}],"total_entries_extracted":0}

Extract EVERY claim type, example, and rule. Include substantiation requirements as conditions.`;
  }

  return `${base}

Output format:
{"type":"mixed","source_document":"${source.url}","extraction_date":"${new Date().toISOString()}","ingredient_regulations":[],"labelling_requirements":[],"claims_rules":[],"import_requirements":[]}

Extract each type where applicable.`;
}

async function ingestPdf(source: PdfSource): Promise<{ success: boolean; entries?: number; error?: string }> {
  const supabase = createServiceClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

  console.log(`\n--- Processing: ${source.title} ---`);

  // Download PDF
  console.log(`  Downloading from ${source.url}...`);
  const pdfResponse = await fetch(source.url, { redirect: 'follow' });
  if (!pdfResponse.ok) {
    return { success: false, error: `Download failed: ${pdfResponse.status} ${pdfResponse.statusText}` };
  }

  const contentType = pdfResponse.headers.get('content-type') ?? '';
  if (!contentType.includes('pdf') && !source.url.endsWith('.pdf')) {
    return { success: false, error: `Not a PDF: content-type is ${contentType}. Skipping.` };
  }

  const pdfArrayBuffer = await pdfResponse.arrayBuffer();
  const pdfBuffer = Buffer.from(pdfArrayBuffer);

  if (pdfBuffer.length < 100) {
    return { success: false, error: `Downloaded file too small (${pdfBuffer.length} bytes). Likely blocked.` };
  }

  const pdfBase64 = pdfBuffer.toString('base64');
  const contentHash = createHash('sha256').update(pdfBuffer).digest('hex');

  console.log(`  Downloaded: ${(pdfBuffer.length / 1024).toFixed(0)}KB, hash: ${contentHash.slice(0, 12)}...`);

  // Check if already ingested with same hash
  const { data: existing } = await supabase
    .from('regulatory_sources')
    .select('content_hash')
    .eq('url', source.url)
    .single();

  if (existing?.content_hash === contentHash) {
    console.log(`  Skipping — already ingested with same hash`);
    return { success: true, entries: 0 };
  }

  // Extract with Claude Vision
  console.log(`  Sending to Claude Vision...`);
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          { type: 'text', text: buildPrompt(source) },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return { success: false, error: 'No text response from Claude' };
  }

  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  // Find JSON start if there's preamble text
  const jsonStart = jsonText.indexOf('{');
  if (jsonStart > 0) {
    jsonText = jsonText.slice(jsonStart);
  }

  let structured;
  try {
    structured = JSON.parse(jsonText);
  } catch {
    return { success: false, error: `Invalid JSON response. First 200 chars: ${jsonText.slice(0, 200)}` };
  }

  const totalEntries = structured.total_entries_extracted ??
    (structured.entries?.length ?? 0) +
    (structured.ingredient_regulations?.length ?? 0) +
    (structured.labelling_requirements?.length ?? 0) +
    (structured.claims_rules?.length ?? 0);

  console.log(`  Extracted ${totalEntries} entries`);

  // Store in regulatory_sources
  const contentText = jsonText.slice(0, 50000);
  const { error: upsertError } = await supabase.from('regulatory_sources').upsert(
    {
      url: source.url,
      title: source.title,
      domain: new URL(source.url).hostname,
      regulatory_body: source.regulatoryBody,
      jurisdiction: JURISDICTION,
      content_type: 'pdf' as const,
      ingestion_tier: 'manual',
      content_text: contentText,
      content_hash: contentHash,
      structured_data: structured as unknown as Json,
      last_scraped_at: new Date().toISOString(),
      scrape_status: 'structured',
    },
    { onConflict: 'url' }
  );

  if (upsertError) {
    return { success: false, error: upsertError.message };
  }

  const { data: sourceRow } = await supabase
    .from('regulatory_sources')
    .select('id')
    .eq('url', source.url)
    .single();

  if (!sourceRow) {
    return { success: false, error: 'Failed to retrieve source after upsert' };
  }

  // Route structured data to appropriate tables
  if (structured.entries || structured.ingredient_regulations) {
    const entries = (structured.entries ?? structured.ingredient_regulations) as Record<string, unknown>[];
    for (const entry of entries) {
      if (!entry.ingredient_name) continue;

      const { data: ingredient } = await supabase
        .from('ingredients')
        .upsert(
          {
            canonical_name: entry.ingredient_name as string,
            inci_name: (entry.inci_name as string) ?? null,
            cas_number: (entry.cas_number as string) ?? null,
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
          regulatory_body: source.regulatoryBody,
          status: (entry.status as string) ?? 'permitted',
          product_categories: (entry.product_categories as string[]) ?? [],
          max_concentration_pct: (entry.max_concentration_pct as number) ?? null,
          max_daily_dose_mg: (entry.max_daily_dose_mg as number) ?? null,
          conditions: entry.conditions ? { conditions_of_use: entry.conditions } as unknown as Json : null,
          required_warnings: (entry.required_warnings as string[]) ?? [],
          regulation_reference: (entry.regulation_reference as string) ?? null,
          source_id: sourceRow.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'ingredient_id,jurisdiction,regulatory_body' }
      );
    }
  }

  if (structured.labelling_requirements || (structured.type === 'labelling_requirement' && structured.entries)) {
    const entries = (structured.labelling_requirements ?? structured.entries) as Record<string, unknown>[];
    for (const entry of entries) {
      if (!entry.element) continue;

      await supabase.from('labelling_requirements').upsert(
        {
          jurisdiction: JURISDICTION,
          regulatory_body: source.regulatoryBody,
          product_category: ((entry.product_categories as string[]) ?? ['food'])[0],
          element: entry.element as string,
          mandatory: (entry.mandatory as boolean) ?? true,
          description: (entry.description as string) ?? null,
          format_rules: (entry.format_rules as Json) ?? null,
          regulation_reference: (entry.regulation_reference as string) ?? null,
          source_id: sourceRow.id,
        },
        { onConflict: 'jurisdiction,product_category,element' }
      );
    }
  }

  if (structured.claims_rules || (structured.type === 'claims_rule' && structured.entries)) {
    const entries = (structured.claims_rules ?? structured.entries) as Record<string, unknown>[];
    for (const entry of entries) {
      if (!entry.claim_text) continue;

      await supabase.from('claims_rules').upsert(
        {
          jurisdiction: JURISDICTION,
          regulatory_body: source.regulatoryBody,
          claim_text: entry.claim_text as string,
          claim_type: entry.claim_type as string,
          status: entry.status as string,
          product_categories: (entry.product_categories as string[]) ?? [],
          conditions: (entry.conditions as Json) ?? null,
          regulation_reference: (entry.regulation_reference as string) ?? null,
          source_id: sourceRow.id,
        },
        { onConflict: 'jurisdiction,claim_text,claim_type' }
      );
    }
  }

  console.log(`  Stored successfully`);
  return { success: true, entries: totalEntries };
}

async function seedHtmlSources() {
  const supabase = createServiceClient();

  for (const source of HTML_SOURCES_TO_SEED) {
    const { data: existing } = await supabase
      .from('regulatory_sources')
      .select('id')
      .eq('url', source.url)
      .single();

    if (existing) {
      console.log(`  HTML source already seeded: ${source.title}`);
      continue;
    }

    const { error } = await supabase.from('regulatory_sources').insert({
      url: source.url,
      title: source.title,
      domain: new URL(source.url).hostname,
      regulatory_body: source.regulatoryBody,
      jurisdiction: JURISDICTION,
      content_type: 'html' as const,
      ingestion_tier: 'exa',
      scrape_status: 'pending',
    });

    if (error) {
      console.error(`  Failed to seed HTML source ${source.url}: ${error.message}`);
    } else {
      console.log(`  Seeded HTML source: ${source.title}`);
    }
  }
}

async function main() {
  console.log(`=== Ingesting ${PDF_SOURCES.length} PDF sources ===`);
  console.log(`=== Also seeding ${HTML_SOURCES_TO_SEED.length} HTML sources ===\n`);

  // Seed HTML sources first
  await seedHtmlSources();

  const results: Array<{ title: string; success: boolean; entries?: number; error?: string }> = [];

  for (const source of PDF_SOURCES) {
    try {
      const result = await ingestPdf(source);
      results.push({ title: source.title, ...result });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error(`  ERROR: ${error}`);
      results.push({ title: source.title, success: false, error });
    }
  }

  console.log(`\n=== Results ===`);
  for (const r of results) {
    const status = r.success ? `OK (${r.entries ?? 0} entries)` : `FAILED: ${r.error}`;
    console.log(`  ${r.title}: ${status}`);
  }

  const succeeded = results.filter((r) => r.success).length;
  console.log(`\n${succeeded}/${results.length} PDFs ingested successfully`);

  console.log(`\n=== Skipped (require manual handling) ===`);
  console.log(`  FDA Food Labeling Guide (8.5MB, >100 pages) — too large for Claude PDF input`);
  console.log(`  CIR Quick Reference Table (4.8MB, >100 pages) — too large for Claude PDF input`);
  console.log(`  OEHHA Prop 65 Safe Harbor Levels — site blocks automated downloads`);
  console.log(`  Tip: Use /api/v1/upload-excel for OEHHA data (Excel version available)`);
}

main().catch(console.error);
