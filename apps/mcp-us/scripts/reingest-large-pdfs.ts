import { createHash } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@sieve/db';
import type { Json } from '@sieve/db';

const JURISDICTION = 'US';
const CHUNK_SIZE = 15; // 15 pages per chunk for dense PDFs

interface PdfSource {
  url: string;
  title: string;
  regulatoryBody: string;
  dataType: 'ingredient_regulation' | 'labelling_requirement' | 'claims_rule' | 'mixed';
  userAgent?: boolean;
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
];

function buildPrompt(source: PdfSource, chunkInfo?: string): string {
  const chunkNote = chunkInfo ? `\n\nNote: This is ${chunkInfo} of the full document. Extract all entries from THIS chunk only.` : '';

  const base = `You are a regulatory data extraction expert. This PDF is from ${source.regulatoryBody} (United States). Document: ${source.title}.${chunkNote}

Extract ALL data into structured JSON. This is a COMPLETE extraction — do not skip any entries. Accuracy is critical.

CRITICAL: Output ONLY valid JSON. No prose, no explanation, no markdown fences. Start with { and end with }.`;

  if (source.dataType === 'ingredient_regulation') {
    return `${base}

Output format:
{"type":"ingredient_regulation","entries":[{"ingredient_name":"string","inci_name":"string|null","cas_number":"string|null","status":"banned|restricted|permitted|permitted_with_limits","product_categories":["string"],"max_concentration_pct":null,"conditions":["string"],"required_warnings":["string"],"regulation_reference":"string"}],"total_entries_extracted":0}

Extract EVERY row/entry from tables. Preserve exact values.`;
  }

  if (source.dataType === 'labelling_requirement') {
    return `${base}

Output format:
{"type":"labelling_requirement","entries":[{"element":"string","mandatory":true,"product_categories":["string"],"description":"string","format_rules":"string|null","exemptions":["string"],"regulation_reference":"string"}],"total_entries_extracted":0}

Extract EVERY labelling requirement, rule, and exemption.`;
  }

  return `${base}

Output format:
{"type":"mixed","ingredient_regulations":[],"labelling_requirements":[],"claims_rules":[]}`;
}

function parseJsonSafe(text: string): Record<string, unknown> {
  let json = text.trim();
  if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const ji = json.indexOf('{');
  if (ji > 0) json = json.slice(ji);

  try {
    return JSON.parse(json);
  } catch {
    const lastComplete = json.lastIndexOf('},');
    if (lastComplete > 0) {
      json = json.slice(0, lastComplete + 1);
      const ob = (json.match(/\[/g) ?? []).length - (json.match(/\]/g) ?? []).length;
      const oc = (json.match(/\{/g) ?? []).length - (json.match(/\}/g) ?? []).length;
      json += ']'.repeat(Math.max(0, ob)) + '}'.repeat(Math.max(0, oc));
      return JSON.parse(json);
    }
    throw new Error('Could not parse or fix JSON');
  }
}

async function splitPdf(pdfBytes: Uint8Array, chunkSize: number): Promise<{ bytes: Uint8Array; label: string }[]> {
  const doc = await PDFDocument.load(pdfBytes);
  const totalPages = doc.getPageCount();
  console.log(`  Total pages: ${totalPages}`);

  if (totalPages <= chunkSize) {
    return [{ bytes: pdfBytes, label: `pages 1-${totalPages}` }];
  }

  const chunks: { bytes: Uint8Array; label: string }[] = [];
  for (let start = 0; start < totalPages; start += chunkSize) {
    const end = Math.min(start + chunkSize, totalPages);
    const chunkDoc = await PDFDocument.create();
    const pages = await chunkDoc.copyPages(doc, Array.from({ length: end - start }, (_, i) => start + i));
    for (const page of pages) chunkDoc.addPage(page);
    chunks.push({ bytes: await chunkDoc.save(), label: `pages ${start + 1}-${end}` });
  }

  return chunks;
}

async function ingestPdf(source: PdfSource) {
  const supabase = createServiceClient();
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY?.trim(),
    timeout: 10 * 60 * 1000,
  });

  console.log(`\n--- Processing: ${source.title} ---`);

  const headers: Record<string, string> = {};
  if (source.userAgent) {
    headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    headers['Accept'] = 'application/pdf,*/*';
  }

  console.log(`  Downloading...`);
  const pdfResponse = await fetch(source.url, { redirect: 'follow', headers });
  if (!pdfResponse.ok) throw new Error(`Download failed: ${pdfResponse.status}`);

  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
  const contentHash = createHash('sha256').update(pdfBuffer).digest('hex');
  console.log(`  Downloaded: ${(pdfBuffer.length / 1024).toFixed(0)}KB`);

  // Force re-ingest by clearing hash
  await supabase
    .from('regulatory_sources')
    .update({ content_hash: null })
    .eq('url', source.url);

  const chunks = await splitPdf(new Uint8Array(pdfBuffer), CHUNK_SIZE);
  console.log(`  Split into ${chunks.length} chunks`);

  const allResults: Record<string, unknown>[] = [];
  let totalEntries = 0;

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]!;
    const b64 = Buffer.from(c.bytes).toString('base64');
    const chunkInfo = chunks.length > 1 ? `chunk ${i + 1} of ${chunks.length} (${c.label})` : undefined;

    console.log(`  Chunk ${i + 1}/${chunks.length} (${c.label}, ${(c.bytes.length / 1024).toFixed(0)}KB)...`);

    try {
      const r = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
              { type: 'text', text: buildPrompt(source, chunkInfo) },
            ],
          },
        ],
      });

      const tb = r.content.find((b) => b.type === 'text');
      if (!tb || tb.type !== 'text') {
        console.log(`    No text response`);
        continue;
      }

      if (r.stop_reason !== 'end_turn') {
        console.log(`    Warning: truncated (${r.stop_reason})`);
      }

      const parsed = parseJsonSafe(tb.text);
      allResults.push(parsed);

      const n = (parsed.entries as unknown[])?.length ?? 0;
      totalEntries += n;
      console.log(`    ${n} entries`);
    } catch (e) {
      console.error(`    Failed: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
    }
  }

  // Merge
  const allEntries: unknown[] = [];
  const allIngRegs: unknown[] = [];
  const allLabReqs: unknown[] = [];
  for (const r of allResults) {
    if (Array.isArray(r.entries)) allEntries.push(...r.entries);
    if (Array.isArray(r.ingredient_regulations)) allIngRegs.push(...r.ingredient_regulations);
    if (Array.isArray(r.labelling_requirements)) allLabReqs.push(...r.labelling_requirements);
  }

  const structured: Record<string, unknown> = {
    type: allResults[0]?.type ?? source.dataType,
    source_document: source.url,
    extraction_date: new Date().toISOString(),
  };
  if (allEntries.length > 0) structured.entries = allEntries;
  if (allIngRegs.length > 0) structured.ingredient_regulations = allIngRegs;
  if (allLabReqs.length > 0) structured.labelling_requirements = allLabReqs;
  structured.total_entries_extracted = allEntries.length + allIngRegs.length + allLabReqs.length;

  console.log(`  Total: ${structured.total_entries_extracted} entries from ${allResults.length} chunks`);

  // Store
  const { error: ue } = await supabase.from('regulatory_sources').upsert(
    {
      url: source.url,
      title: source.title,
      domain: new URL(source.url).hostname,
      regulatory_body: source.regulatoryBody,
      jurisdiction: JURISDICTION,
      content_type: 'pdf' as const,
      ingestion_tier: 'manual',
      content_text: JSON.stringify(structured).slice(0, 50000),
      content_hash: contentHash,
      structured_data: structured as unknown as Json,
      last_scraped_at: new Date().toISOString(),
      scrape_status: 'structured',
    },
    { onConflict: 'url' }
  );

  if (ue) throw new Error(`Upsert failed: ${ue.message}`);

  const { data: sourceRow } = await supabase
    .from('regulatory_sources')
    .select('id')
    .eq('url', source.url)
    .single();

  if (!sourceRow) throw new Error('Failed to retrieve source row');

  // Store ingredient regulations
  if (source.dataType === 'ingredient_regulation') {
    const entries = (structured.entries ?? structured.ingredient_regulations ?? []) as Record<string, unknown>[];
    let stored = 0;
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
          conditions: entry.conditions ? ({ conditions_of_use: entry.conditions } as unknown as Json) : null,
          required_warnings: (entry.required_warnings as string[]) ?? [],
          regulation_reference: (entry.regulation_reference as string) ?? null,
          source_id: sourceRow.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'ingredient_id,jurisdiction,regulatory_body' }
      );
      stored++;
    }
    console.log(`  Stored ${stored} ingredient regulations`);
  }

  // Store labelling requirements
  if (source.dataType === 'labelling_requirement') {
    const entries = (structured.entries ?? structured.labelling_requirements ?? []) as Record<string, unknown>[];
    let stored = 0;
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
      stored++;
    }
    console.log(`  Stored ${stored} labelling requirements`);
  }

  console.log(`  Done`);
}

async function main() {
  for (const source of PDF_SOURCES) {
    try {
      await ingestPdf(source);
    } catch (e) {
      console.error(`  ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

main().catch(console.error);
