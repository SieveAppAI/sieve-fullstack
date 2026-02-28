/**
 * Ingest SSO legislation from downloaded PDFs.
 * Extracts text via pdftotext, stores in regulatory_sources,
 * structures via Claude Sonnet, and cascades to specialized tables.
 *
 * Usage: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/ingest-sso-pdfs.ts
 */
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim() });

const CHUNK_SIZE = 50_000;
const CHUNK_OVERLAP = 1_000;
const HOME = process.env.HOME!;

interface Document {
  pdfPath: string;
  matchUrl: string;
  newUrl?: string;
  title: string;
  regulatoryBody: string;
}

const DOCUMENTS: Document[] = [
  {
    pdfPath: `${HOME}/Downloads/Sale of Food Act 1973.pdf`,
    matchUrl: 'https://sso.agc.gov.sg/Act/SFA1973',
    title: 'Sale of Food Act 1973',
    regulatoryBody: 'SFA',
  },
  {
    pdfPath: `${HOME}/Downloads/Food Regulations.pdf`,
    matchUrl: 'https://sso.agc.gov.sg/SL/SFA1973-RG1',
    title: 'Food Regulations',
    regulatoryBody: 'SFA',
  },
  {
    pdfPath: `${HOME}/Downloads/Food Safety and Security Act 2025.pdf`,
    matchUrl: 'https://sso.agc.gov.sg/Acts-Supp/27-2024',
    newUrl: 'https://sso.agc.gov.sg/Acts-Supp/7-2025',
    title: 'Food Safety and Security Act 2025',
    regulatoryBody: 'SFA',
  },
  {
    pdfPath: `${HOME}/Downloads/Health Products Act 2007 (1).pdf`,
    matchUrl: 'https://sso.agc.gov.sg/Act/HPA2007',
    title: 'Health Products Act 2007',
    regulatoryBody: 'HSA',
  },
  {
    pdfPath: `${HOME}/Downloads/Health Products (Cosmetic Products — ASEAN Cosmeti.pdf`,
    matchUrl: 'https://sso.agc.gov.sg/SL/HPA2007-S321-2007',
    title: 'Health Products (Cosmetic Products) Regulations',
    regulatoryBody: 'HSA',
  },
];

function extractPdf(pdfPath: string): string {
  if (!existsSync(pdfPath)) throw new Error(`PDF not found: ${pdfPath}`);
  return execSync(`/opt/homebrew/bin/pdftotext "${pdfPath}" -`, {
    maxBuffer: 50 * 1024 * 1024,
    encoding: 'utf-8',
  });
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    chunks.push(text.slice(offset, offset + CHUNK_SIZE));
    offset += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function structureChunk(
  url: string,
  title: string,
  chunkText: string,
  chunkIndex: number,
  totalChunks: number
): Promise<Record<string, unknown> | null> {
  const prompt = `You are a regulatory data extraction expert. Given the following legislative content from Singapore Statutes Online, extract structured data. Focus on extracting actionable regulatory requirements — skip governance, penalties, definitions, and administrative provisions unless they contain specific ingredient limits, labelling rules, claims criteria, or import requirements.

Source: ${title} (${url})
Chunk ${chunkIndex + 1} of ${totalChunks}

Content:
${chunkText}

Extract into JSON with multiple types as applicable:

For INGREDIENT REGULATIONS (banned substances, permitted additives with limits, concentration caps):
{ "type": "ingredient_regulation", "entries": [{ "ingredient_name": string, "inci_name": string|null, "cas_number": string|null, "status": "banned"|"restricted"|"permitted"|"permitted_with_limits", "product_categories": string[], "max_concentration_pct": number|null, "conditions": string[], "required_warnings": string[], "regulation_reference": string }] }

For LABELLING REQUIREMENTS (mandatory label elements, format rules, language requirements):
{ "type": "labelling_requirement", "entries": [{ "element": string, "mandatory": boolean, "product_categories": string[], "description": string, "format_rules": string|null, "regulation_reference": string }] }

For CLAIMS RULES (nutrition claims thresholds, health claims, prohibited therapeutic claims):
{ "type": "claims_rule", "entries": [{ "claim_text": string, "claim_type": "nutrition"|"health"|"therapeutic"|"marketing", "status": "permitted"|"prohibited"|"conditional", "conditions": object|null, "product_categories": string[], "regulation_reference": string }] }

For IMPORT REQUIREMENTS (licensing, documentation, inspections):
{ "type": "import_requirement", "entries": [{ "requirement": string, "product_categories": string[], "documents_required": string[], "licensing_body": string, "regulation_reference": string }] }

If mixed, use "type": "mixed" with all applicable arrays (ingredient_regulations, labelling_requirements, claims_rules, import_requirements).
If this chunk contains NO extractable regulatory data (e.g. only definitions, governance, or penalties), return: { "type": "empty" }
Return valid JSON only, no markdown fences.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return null;
  let text = textBlock.text.trim();
  if (text === 'null' || text === '') return null;
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed.type === 'empty') return null;
    return parsed;
  } catch {
    console.log(`    JSON parse error on chunk ${chunkIndex + 1}`);
    return null;
  }
}

function mergeStructured(results: Record<string, unknown>[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    type: 'mixed',
    ingredient_regulations: [] as unknown[],
    labelling_requirements: [] as unknown[],
    claims_rules: [] as unknown[],
    import_requirements: [] as unknown[],
  };

  for (const result of results) {
    if (result.type === 'ingredient_regulation') {
      (merged.ingredient_regulations as unknown[]).push(...((result.entries as unknown[]) ?? []));
    } else if (result.type === 'labelling_requirement') {
      (merged.labelling_requirements as unknown[]).push(...((result.entries as unknown[]) ?? []));
    } else if (result.type === 'claims_rule') {
      (merged.claims_rules as unknown[]).push(...((result.entries as unknown[]) ?? []));
    } else if (result.type === 'import_requirement') {
      (merged.import_requirements as unknown[]).push(...((result.entries as unknown[]) ?? []));
    } else if (result.type === 'mixed') {
      if (result.ingredient_regulations)
        (merged.ingredient_regulations as unknown[]).push(...(result.ingredient_regulations as unknown[]));
      if (result.labelling_requirements)
        (merged.labelling_requirements as unknown[]).push(...(result.labelling_requirements as unknown[]));
      if (result.claims_rules)
        (merged.claims_rules as unknown[]).push(...(result.claims_rules as unknown[]));
      if (result.import_requirements)
        (merged.import_requirements as unknown[]).push(...(result.import_requirements as unknown[]));
    }
  }

  return merged;
}

async function storeStructured(url: string, regulatoryBody: string, structured: Record<string, unknown>) {
  await supabase
    .from('regulatory_sources')
    .update({
      structured_data: structured,
      scrape_status: 'structured',
      updated_at: new Date().toISOString(),
    })
    .eq('url', url);

  const { data: source } = await supabase
    .from('regulatory_sources')
    .select('id')
    .eq('url', url)
    .single();
  if (!source) return;

  type Entry = Record<string, unknown>;

  const ingRegs = (structured.ingredient_regulations ?? structured.entries ?? []) as Entry[];
  if (ingRegs.length > 0) {
    let stored = 0;
    for (const entry of ingRegs) {
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
      const { error } = await supabase.from('ingredient_regulations').upsert(
        {
          ingredient_id: ingredient.id,
          jurisdiction: 'SG',
          regulatory_body: regulatoryBody,
          status: entry.status as string,
          product_categories: (entry.product_categories as string[]) ?? [],
          max_concentration_pct: entry.max_concentration_pct as number | null,
          conditions: { conditions_of_use: entry.conditions ?? [] },
          required_warnings: (entry.required_warnings as string[]) ?? [],
          regulation_reference: (entry.regulation_reference as string) ?? null,
          source_id: source.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'ingredient_id,jurisdiction,regulatory_body' }
      );
      if (!error) stored++;
    }
    console.log(`    ingredient_regulations: ${stored}/${ingRegs.length} stored`);
  }

  const labReqs = (structured.labelling_requirements ?? []) as Entry[];
  if (labReqs.length > 0) {
    let stored = 0;
    for (const entry of labReqs) {
      const { error } = await supabase.from('labelling_requirements').upsert(
        {
          jurisdiction: 'SG',
          regulatory_body: regulatoryBody,
          product_category: ((entry.product_categories as string[]) ?? ['food'])[0],
          element: entry.element as string,
          mandatory: (entry.mandatory as boolean) ?? true,
          description: (entry.description as string) ?? null,
          format_rules: (entry.format_rules as string) ?? null,
          regulation_reference: (entry.regulation_reference as string) ?? null,
          source_id: source.id,
        },
        { onConflict: 'jurisdiction,product_category,element' }
      );
      if (!error) stored++;
    }
    console.log(`    labelling_requirements: ${stored}/${labReqs.length} stored`);
  }

  const claimsRules = (structured.claims_rules ?? []) as Entry[];
  if (claimsRules.length > 0) {
    let stored = 0;
    for (const entry of claimsRules) {
      const { error } = await supabase.from('claims_rules').upsert(
        {
          jurisdiction: 'SG',
          regulatory_body: regulatoryBody,
          claim_text: entry.claim_text as string,
          claim_type: entry.claim_type as string,
          status: entry.status as string,
          product_categories: (entry.product_categories as string[]) ?? [],
          conditions: (entry.conditions as object) ?? null,
          regulation_reference: (entry.regulation_reference as string) ?? null,
          source_id: source.id,
        },
        { onConflict: 'jurisdiction,claim_text,claim_type' }
      );
      if (!error) stored++;
    }
    console.log(`    claims_rules: ${stored}/${claimsRules.length} stored`);
  }

  const importReqs = (structured.import_requirements ?? []) as Entry[];
  if (importReqs.length > 0) {
    let stored = 0;
    for (const entry of importReqs) {
      const { error } = await supabase.from('import_requirements').upsert(
        {
          jurisdiction: 'SG',
          product_category: ((entry.product_categories as string[]) ?? ['food'])[0],
          requirement: entry.requirement as string,
          requirement_type: (entry.requirement_type as string) ?? null,
          regulatory_body: regulatoryBody,
          documents_required: (entry.documents_required as string[]) ?? [],
          regulation_reference: (entry.regulation_reference as string) ?? null,
          source_id: source.id,
        },
        { onConflict: 'jurisdiction,product_category,requirement' }
      );
      if (!error) stored++;
    }
    console.log(`    import_requirements: ${stored}/${importReqs.length} stored`);
  }
}

async function processDocument(doc: Document) {
  console.log(`\n=== ${doc.title} ===`);
  console.log(`  PDF: ${doc.pdfPath}`);

  // 1. Extract text
  const text = extractPdf(doc.pdfPath);
  console.log(`  Extracted: ${text.length.toLocaleString()} chars`);

  const hash = createHash('sha256').update(text).digest('hex');
  const url = doc.newUrl ?? doc.matchUrl;

  // 2. Update regulatory_sources row — update URL if needed, store raw content
  if (doc.newUrl) {
    await supabase
      .from('regulatory_sources')
      .update({
        url: doc.newUrl,
        title: doc.title,
        regulatory_body: doc.regulatoryBody,
        content_text: text,
        content_hash: hash,
        content_type: 'pdf',
        extraction_model: 'pdftotext',
        last_scraped_at: new Date().toISOString(),
        scrape_status: 'scraped',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('url', doc.matchUrl);
  } else {
    await supabase
      .from('regulatory_sources')
      .update({
        title: doc.title,
        regulatory_body: doc.regulatoryBody,
        content_text: text,
        content_hash: hash,
        content_type: 'pdf',
        extraction_model: 'pdftotext',
        last_scraped_at: new Date().toISOString(),
        scrape_status: 'scraped',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('url', doc.matchUrl);
  }

  // 3. Chunk & structure
  const chunks = chunkText(text);
  console.log(`  Chunks: ${chunks.length} (${CHUNK_SIZE.toLocaleString()} chars each)`);

  const chunkResults: Record<string, unknown>[] = [];
  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`  Structuring chunk ${i + 1}/${chunks.length}...`);
    const result = await structureChunk(url, doc.title, chunks[i], i, chunks.length);
    if (result) {
      chunkResults.push(result);
      const entryCount =
        ((result.entries as unknown[])?.length ?? 0) +
        ((result.ingredient_regulations as unknown[])?.length ?? 0) +
        ((result.labelling_requirements as unknown[])?.length ?? 0) +
        ((result.claims_rules as unknown[])?.length ?? 0) +
        ((result.import_requirements as unknown[])?.length ?? 0);
      console.log(` ${entryCount} entries (${result.type})`);
    } else {
      console.log(' empty');
    }
  }

  if (chunkResults.length === 0) {
    console.log(`  No structured data extracted`);
    return;
  }

  // 4. Merge and store
  const merged = mergeStructured(chunkResults);
  const totalEntries =
    ((merged.ingredient_regulations as unknown[])?.length ?? 0) +
    ((merged.labelling_requirements as unknown[])?.length ?? 0) +
    ((merged.claims_rules as unknown[])?.length ?? 0) +
    ((merged.import_requirements as unknown[])?.length ?? 0);
  console.log(`  Total entries: ${totalEntries}`);

  await storeStructured(url, doc.regulatoryBody, merged);
  console.log(`  Done — stored structured data`);
}

async function main() {
  // Baseline counts
  const tables = ['ingredients', 'ingredient_regulations', 'labelling_requirements', 'claims_rules', 'import_requirements'];
  const before: Record<string, number> = {};
  for (const t of tables) {
    const { count } = await supabase.from(t).select('id', { count: 'exact', head: true });
    before[t] = count ?? 0;
  }
  console.log('Before:', before);

  for (const doc of DOCUMENTS) {
    await processDocument(doc);
  }

  // Final counts
  console.log('\n=== Final Counts ===');
  for (const t of tables) {
    const { count } = await supabase.from(t).select('id', { count: 'exact', head: true });
    const delta = (count ?? 0) - before[t];
    console.log(`  ${t}: ${count} (${delta >= 0 ? '+' : ''}${delta})`);
  }

  // Check all 5 sources are structured
  const { data: sources } = await supabase
    .from('regulatory_sources')
    .select('url, title, scrape_status')
    .eq('domain', 'sso.agc.gov.sg');
  console.log('\nSource statuses:');
  for (const s of sources ?? []) {
    console.log(`  ${s.scrape_status} — ${s.title}`);
  }
}

main().catch(console.error);
