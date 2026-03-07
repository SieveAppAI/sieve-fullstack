import { createHash } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@sieve/db';
import type { Json } from '@sieve/db';

const JURISDICTION = 'US';
const CHUNK_SIZE = 5; // pages per chunk (dense tabular PDFs need small chunks)

interface PdfSource {
  url: string;
  title: string;
  regulatoryBody: string;
  dataType: 'ingredient_regulation' | 'labelling_requirement' | 'claims_rule' | 'mixed';
  userAgent?: boolean; // use browser UA for download
}

const PDF_SOURCES: PdfSource[] = [
  {
    url: 'https://www.fda.gov/files/food/published/Food-Labeling-Guide-(PDF).pdf',
    title: 'FDA Guidance for Industry: Food Labeling Guide',
    regulatoryBody: 'FDA',
    dataType: 'labelling_requirement',
  },
  {
    url: 'https://www.cir-safety.org/sites/default/files/QuickReferenceTable_AllConclusionTypes.pdf',
    title: 'CIR Quick Reference Table — All Reviewed Cosmetic Ingredients',
    regulatoryBody: 'CIR',
    dataType: 'ingredient_regulation',
  },
  {
    url: 'https://oehha.ca.gov/sites/default/files/media/downloads/proposition-65/safeharborlist032521.pdf',
    title: 'OEHHA Prop 65 Safe Harbor Levels (NSRL/MADL)',
    regulatoryBody: 'OEHHA',
    dataType: 'ingredient_regulation',
    userAgent: true,
  },
];

function buildPrompt(source: PdfSource, chunkInfo?: string): string {
  const chunkNote = chunkInfo ? `\n\nNote: This is ${chunkInfo} of the full document. Extract all entries from THIS chunk only.` : '';

  const base = `You are a regulatory data extraction expert. This PDF is from ${source.regulatoryBody} (United States). Document: ${source.title}.${chunkNote}

Extract ALL data into structured JSON. This is a COMPLETE extraction — do not skip any entries, even if there are hundreds. Accuracy is critical.

CRITICAL: Output ONLY valid JSON. No prose, no explanation, no markdown fences. Start with { and end with }.`;

  if (source.dataType === 'ingredient_regulation') {
    return `${base}

Output format:
{"type":"ingredient_regulation","source_document":"${source.url}","extraction_date":"${new Date().toISOString()}","entries":[{"ingredient_name":"string","inci_name":"string|null","cas_number":"string|null","status":"banned|restricted|permitted|permitted_with_limits","product_categories":["string"],"max_concentration_pct":null,"max_daily_dose_mg":null,"conditions":["string"],"required_warnings":["string"],"regulation_reference":"string","annex_reference":null,"effective_date":null}],"total_entries_extracted":0}

Extract EVERY row/entry from tables. Preserve exact values.`;
  }

  if (source.dataType === 'labelling_requirement') {
    return `${base}

Output format:
{"type":"labelling_requirement","source_document":"${source.url}","extraction_date":"${new Date().toISOString()}","entries":[{"element":"string","mandatory":true,"product_categories":["string"],"description":"string","format_rules":"string|null","exemptions":["string"],"regulation_reference":"string"}],"total_entries_extracted":0}

Extract EVERY labelling requirement, rule, and exemption.`;
  }

  return `${base}

Output format:
{"type":"mixed","source_document":"${source.url}","extraction_date":"${new Date().toISOString()}","ingredient_regulations":[],"labelling_requirements":[],"claims_rules":[]}`;
}

async function splitPdf(pdfBytes: Uint8Array, chunkSize: number): Promise<Uint8Array[]> {
  const doc = await PDFDocument.load(pdfBytes);
  const totalPages = doc.getPageCount();
  console.log(`  Total pages: ${totalPages}`);

  if (totalPages <= chunkSize) {
    return [pdfBytes];
  }

  const chunks: Uint8Array[] = [];
  for (let start = 0; start < totalPages; start += chunkSize) {
    const end = Math.min(start + chunkSize, totalPages);
    const chunkDoc = await PDFDocument.create();
    const pages = await chunkDoc.copyPages(doc, Array.from({ length: end - start }, (_, i) => start + i));
    for (const page of pages) {
      chunkDoc.addPage(page);
    }
    const chunkBytes = await chunkDoc.save();
    chunks.push(chunkBytes);
    console.log(`  Chunk ${chunks.length}: pages ${start + 1}-${end}`);
  }

  return chunks;
}

function parseJsonResponse(text: string): Record<string, unknown> {
  let jsonText = text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  const jsonStart = jsonText.indexOf('{');
  if (jsonStart > 0) {
    jsonText = jsonText.slice(jsonStart);
  }
  try {
    return JSON.parse(jsonText);
  } catch {
    // Try to salvage truncated JSON by closing open arrays/objects
    let fixed = jsonText;
    // Remove last incomplete entry (likely truncated mid-object)
    const lastComplete = fixed.lastIndexOf('},');
    if (lastComplete > 0) {
      fixed = fixed.slice(0, lastComplete + 1);
    }
    // Close any open arrays and the root object
    const openBrackets = (fixed.match(/\[/g) ?? []).length - (fixed.match(/\]/g) ?? []).length;
    const openBraces = (fixed.match(/\{/g) ?? []).length - (fixed.match(/\}/g) ?? []).length;
    fixed += ']'.repeat(Math.max(0, openBrackets));
    fixed += '}'.repeat(Math.max(0, openBraces));
    return JSON.parse(fixed);
  }
}

function mergeResults(results: Record<string, unknown>[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    type: results[0]?.type ?? 'mixed',
    source_document: results[0]?.source_document ?? '',
    extraction_date: new Date().toISOString(),
  };

  const allEntries: unknown[] = [];
  const allIngredientRegs: unknown[] = [];
  const allLabellingReqs: unknown[] = [];
  const allClaimsRules: unknown[] = [];

  for (const r of results) {
    if (Array.isArray(r.entries)) allEntries.push(...r.entries);
    if (Array.isArray(r.ingredient_regulations)) allIngredientRegs.push(...r.ingredient_regulations);
    if (Array.isArray(r.labelling_requirements)) allLabellingReqs.push(...r.labelling_requirements);
    if (Array.isArray(r.claims_rules)) allClaimsRules.push(...r.claims_rules);
  }

  if (allEntries.length > 0) merged.entries = allEntries;
  if (allIngredientRegs.length > 0) merged.ingredient_regulations = allIngredientRegs;
  if (allLabellingReqs.length > 0) merged.labelling_requirements = allLabellingReqs;
  if (allClaimsRules.length > 0) merged.claims_rules = allClaimsRules;

  merged.total_entries_extracted =
    allEntries.length + allIngredientRegs.length + allLabellingReqs.length + allClaimsRules.length;

  return merged;
}

async function ingestPdf(source: PdfSource): Promise<{ success: boolean; entries?: number; error?: string }> {
  const supabase = createServiceClient();
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY?.trim(),
    timeout: 15 * 60 * 1000, // 15 minutes for large extractions
  });

  console.log(`\n--- Processing: ${source.title} ---`);

  // Download PDF
  console.log(`  Downloading from ${source.url}...`);
  const headers: Record<string, string> = {};
  if (source.userAgent) {
    headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    headers['Accept'] = 'application/pdf,*/*';
  }

  const pdfResponse = await fetch(source.url, { redirect: 'follow', headers });
  if (!pdfResponse.ok) {
    return { success: false, error: `Download failed: ${pdfResponse.status}` };
  }

  const pdfArrayBuffer = await pdfResponse.arrayBuffer();
  const pdfBuffer = Buffer.from(pdfArrayBuffer);

  if (pdfBuffer.length < 1000) {
    return { success: false, error: `File too small (${pdfBuffer.length} bytes). Likely blocked.` };
  }

  const contentHash = createHash('sha256').update(pdfBuffer).digest('hex');
  console.log(`  Downloaded: ${(pdfBuffer.length / 1024).toFixed(0)}KB, hash: ${contentHash.slice(0, 12)}...`);

  // Check if already ingested
  const { data: existing } = await supabase
    .from('regulatory_sources')
    .select('content_hash')
    .eq('url', source.url)
    .single();

  if (existing?.content_hash === contentHash) {
    console.log(`  Skipping — already ingested with same hash`);
    return { success: true, entries: 0 };
  }

  // Split into chunks
  const chunks = await splitPdf(new Uint8Array(pdfBuffer), CHUNK_SIZE);
  console.log(`  Split into ${chunks.length} chunk(s)`);

  // Extract each chunk
  const chunkResults: Record<string, unknown>[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const chunkBase64 = Buffer.from(chunk).toString('base64');
    const chunkInfo = chunks.length > 1 ? `chunk ${i + 1} of ${chunks.length}` : undefined;

    console.log(`  Extracting chunk ${i + 1}/${chunks.length} (${(chunk.length / 1024).toFixed(0)}KB)...`);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const maxTokens = attempt === 0 ? 32000 : 64000;
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: maxTokens,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: { type: 'base64', media_type: 'application/pdf', data: chunkBase64 },
                },
                { type: 'text', text: buildPrompt(source, chunkInfo) },
              ],
            },
          ],
        });

        const textBlock = response.content.find((b) => b.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          console.log(`  Chunk ${i + 1}: No text response`);
          break;
        }

        // Log if truncated but still use partial results
        if (response.stop_reason !== 'end_turn') {
          console.log(`  Chunk ${i + 1}: Warning — truncated (${response.stop_reason}), using partial results`);
        }

        const parsed = parseJsonResponse(textBlock.text);
        chunkResults.push(parsed);

        const chunkEntries = (parsed.total_entries_extracted as number) ??
          ((parsed.entries as unknown[])?.length ?? 0);
        console.log(`  Chunk ${i + 1}: ${chunkEntries} entries`);
        break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('Unterminated string') && attempt === 0) {
          console.log(`  Chunk ${i + 1}: JSON truncated, retrying with more tokens...`);
          continue;
        }
        console.error(`  Chunk ${i + 1} failed: ${msg}`);
        break;
      }
    }
  }

  if (chunkResults.length === 0) {
    return { success: false, error: 'All chunks failed extraction' };
  }

  // Merge results
  const structured = mergeResults(chunkResults);
  const totalEntries = structured.total_entries_extracted as number;
  console.log(`  Total extracted: ${totalEntries} entries across ${chunkResults.length} chunks`);

  // Store in regulatory_sources
  const structuredJson = JSON.stringify(structured);
  const { error: upsertError } = await supabase.from('regulatory_sources').upsert(
    {
      url: source.url,
      title: source.title,
      domain: new URL(source.url).hostname,
      regulatory_body: source.regulatoryBody,
      jurisdiction: JURISDICTION,
      content_type: 'pdf' as const,
      ingestion_tier: 'manual',
      content_text: structuredJson.slice(0, 50000),
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

  // Store ingredient regulations
  const ingredientEntries = (structured.entries ?? structured.ingredient_regulations ?? []) as Record<string, unknown>[];
  for (const entry of ingredientEntries) {
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

  // Store labelling requirements
  const labellingEntries = (structured.labelling_requirements ??
    (structured.type === 'labelling_requirement' ? structured.entries : []) ?? []) as Record<string, unknown>[];
  for (const entry of labellingEntries) {
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

  // Store claims rules
  const claimsEntries = (structured.claims_rules ??
    (structured.type === 'claims_rule' ? structured.entries : []) ?? []) as Record<string, unknown>[];
  for (const entry of claimsEntries) {
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

  console.log(`  Stored successfully`);
  return { success: true, entries: totalEntries };
}

async function main() {
  console.log(`=== Ingesting ${PDF_SOURCES.length} large/blocked PDFs (chunked) ===\n`);

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
}

main().catch(console.error);
