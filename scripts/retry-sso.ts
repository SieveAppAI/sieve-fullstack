/**
 * Retry SSO legislation pages with longer Browser Use timeout.
 * These are large JS-rendered Singapore Statutes Online pages.
 *
 * Usage: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/retry-sso.ts
 */
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim() });

const BROWSER_USE_API = 'https://api.browser-use.com/api/v2';
const apiKey = process.env.BROWSER_USE_API_KEY!.trim();

const SSO_URLS = [
  'https://sso.agc.gov.sg/SL/HPA2007-S321-2007',  // Cosmetic Product Regulations
  'https://sso.agc.gov.sg/Acts-Supp/27-2024',       // Food Safety and Security Act 2024
  'https://sso.agc.gov.sg/SL/SFA1973-RG1',          // Food Regulations (largest)
];

async function extractSSO(url: string): Promise<string | null> {
  const task = `This is a Singapore Statutes Online page. Wait for the JavaScript-rendered content to fully load (it may take a few seconds). Extract the complete legislative text from the main content area. Include: the act/regulation title, all part headings, all section numbers and their full text, all schedules. If the page has a table of contents, use it to navigate but extract the actual text, not just headings. Return the full text content as plain text. Do not truncate.`;

  console.log(`  Creating Browser Use task...`);
  const response = await fetch(`${BROWSER_USE_API}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Browser-Use-API-Key': apiKey,
    },
    body: JSON.stringify({ task, startUrl: url, maxSteps: 200 }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.log(`  Task creation failed: ${response.status} ${body.slice(0, 200)}`);
    return null;
  }

  const result = await response.json();
  const taskId = result.id;
  if (!taskId) return null;

  console.log(`  Task ${taskId} started, polling (max 5 min)...`);

  // Poll for 5 minutes (60 * 5s = 300s)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const resp = await fetch(`${BROWSER_USE_API}/tasks/${taskId}`, {
        headers: { 'X-Browser-Use-API-Key': apiKey },
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      if (data.status === 'finished') {
        return data.output ?? null;
      }
      if (data.status === 'stopped') {
        console.log(`  Task stopped`);
        return null;
      }
      if (i % 6 === 5) console.log(`  Polling... ${(i + 1) * 5}s`);
    } catch {}
  }
  console.log(`  Timed out after 300s`);
  return null;
}

async function structureContent(url: string, contentText: string) {
  const prompt = `You are a regulatory data extraction expert. Given the following legislative content from Singapore Statutes Online, extract structured data. This is legislation text, so focus on extracting actionable regulatory requirements.

Source URL: ${url}
Content (first 30000 chars):
${contentText.slice(0, 30000)}

Extract into JSON with multiple types as applicable:

For INGREDIENT REGULATIONS:
{ "type": "ingredient_regulation", "entries": [{ "ingredient_name": string, "inci_name": string|null, "cas_number": string|null, "status": "banned"|"restricted"|"permitted"|"permitted_with_limits", "product_categories": string[], "max_concentration_pct": number|null, "conditions": string[], "required_warnings": string[], "regulation_reference": string }] }

For LABELLING REQUIREMENTS:
{ "type": "labelling_requirement", "entries": [{ "element": string, "mandatory": boolean, "product_categories": string[], "description": string, "format_rules": string|null, "regulation_reference": string }] }

For CLAIMS RULES:
{ "type": "claims_rule", "entries": [{ "claim_text": string, "claim_type": "nutrition"|"health"|"therapeutic"|"marketing", "status": "permitted"|"prohibited"|"conditional", "conditions": object|null, "product_categories": string[], "regulation_reference": string }] }

For IMPORT REQUIREMENTS:
{ "type": "import_requirement", "entries": [{ "requirement": string, "product_categories": string[], "documents_required": string[], "licensing_body": string, "regulation_reference": string }] }

If mixed, use "type": "mixed" with all applicable arrays (ingredient_regulations, labelling_requirements, claims_rules, import_requirements).
Return valid JSON only, no markdown fences.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return null;
  let text = textBlock.text.trim();
  if (text === 'null' || text === '') return null;
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  return JSON.parse(text);
}

function classifyRegulatoryBody(url: string): string {
  if (url.includes('HPA')) return 'HSA';
  if (url.includes('SFA')) return 'SFA';
  return 'SSO';
}

async function storeStructured(url: string, structured: Record<string, unknown>) {
  await supabase.from('regulatory_sources').update({
    structured_data: structured,
    scrape_status: 'structured',
    updated_at: new Date().toISOString(),
  }).eq('url', url);

  const { data: source } = await supabase
    .from('regulatory_sources')
    .select('id')
    .eq('url', url)
    .single();
  if (!source) return;

  type Entry = Record<string, unknown>;

  // Handle mixed type
  if (structured.type === 'mixed' || structured.ingredient_regulations) {
    const entries = (structured.ingredient_regulations ?? structured.entries ?? []) as Entry[];
    for (const entry of entries) {
      const { data: ingredient } = await supabase.from('ingredients').upsert({
        canonical_name: entry.ingredient_name as string,
        inci_name: (entry.inci_name as string) ?? null,
        cas_number: (entry.cas_number as string) ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'canonical_name' }).select('id').single();
      if (!ingredient) continue;
      await supabase.from('ingredient_regulations').upsert({
        ingredient_id: ingredient.id,
        jurisdiction: 'SG',
        regulatory_body: classifyRegulatoryBody(url),
        status: entry.status as string,
        product_categories: (entry.product_categories as string[]) ?? [],
        max_concentration_pct: entry.max_concentration_pct as number | null,
        conditions: { conditions_of_use: entry.conditions ?? [] },
        required_warnings: (entry.required_warnings as string[]) ?? [],
        regulation_reference: (entry.regulation_reference as string) ?? null,
        source_id: source.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'ingredient_id,jurisdiction,regulatory_body' });
    }
  }

  if (structured.labelling_requirements) {
    for (const entry of structured.labelling_requirements as Entry[]) {
      await supabase.from('labelling_requirements').upsert({
        jurisdiction: 'SG',
        regulatory_body: classifyRegulatoryBody(url),
        product_category: ((entry.product_categories as string[]) ?? ['food'])[0],
        element: entry.element as string,
        mandatory: (entry.mandatory as boolean) ?? true,
        description: (entry.description as string) ?? null,
        format_rules: (entry.format_rules as string) ?? null,
        regulation_reference: (entry.regulation_reference as string) ?? null,
        source_id: source.id,
      }, { onConflict: 'jurisdiction,product_category,element' });
    }
  }

  if (structured.claims_rules) {
    for (const entry of structured.claims_rules as Entry[]) {
      await supabase.from('claims_rules').upsert({
        jurisdiction: 'SG',
        regulatory_body: classifyRegulatoryBody(url),
        claim_text: entry.claim_text as string,
        claim_type: entry.claim_type as string,
        status: entry.status as string,
        product_categories: (entry.product_categories as string[]) ?? [],
        conditions: (entry.conditions as object) ?? null,
        regulation_reference: (entry.regulation_reference as string) ?? null,
        source_id: source.id,
      }, { onConflict: 'jurisdiction,claim_text,claim_type' });
    }
  }

  if (structured.import_requirements) {
    for (const entry of structured.import_requirements as Entry[]) {
      await supabase.from('import_requirements').upsert({
        jurisdiction: 'SG',
        product_category: ((entry.product_categories as string[]) ?? ['food'])[0],
        requirement: entry.requirement as string,
        requirement_type: (entry.requirement_type as string) ?? null,
        regulatory_body: classifyRegulatoryBody(url),
        documents_required: (entry.documents_required as string[]) ?? [],
        regulation_reference: (entry.regulation_reference as string) ?? null,
        source_id: source.id,
      }, { onConflict: 'jurisdiction,product_category,requirement' });
    }
  }
}

async function main() {
  for (const url of SSO_URLS) {
    console.log(`\n=== ${url} ===`);

    // Reset status
    await supabase.from('regulatory_sources').update({
      scrape_status: 'pending',
      error_message: null,
    }).eq('url', url);

    const text = await extractSSO(url);
    if (!text || text.length < 100) {
      console.log(`  FAILED: ${text ? `only ${text.length} chars` : 'no content'}`);
      await supabase.from('regulatory_sources').update({
        scrape_status: 'error' as never,
        error_message: 'Browser Use extraction failed or returned insufficient content',
      }).eq('url', url);
      continue;
    }

    console.log(`  Extracted ${text.length} chars`);
    const hash = createHash('sha256').update(text).digest('hex');
    await supabase.from('regulatory_sources').update({
      content_text: text,
      content_hash: hash,
      last_scraped_at: new Date().toISOString(),
      scrape_status: 'scraped',
    }).eq('url', url);

    // Structure
    try {
      const data = await structureContent(url, text);
      if (data) {
        await storeStructured(url, data);
        const entryCount =
          (data.entries?.length ?? 0) +
          (data.ingredient_regulations?.length ?? 0) +
          (data.labelling_requirements?.length ?? 0) +
          (data.claims_rules?.length ?? 0) +
          (data.import_requirements?.length ?? 0);
        console.log(`  Structured: ${data.type} with ${entryCount} entries`);
      } else {
        console.log('  No structured data');
      }
    } catch (e) {
      console.log(`  Structuring error: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Final counts
  const { data: counts } = await supabase
    .from('regulatory_sources')
    .select('scrape_status')
    .eq('jurisdiction', 'SG');
  const statusCounts: Record<string, number> = {};
  for (const row of counts ?? []) {
    statusCounts[row.scrape_status ?? 'unknown'] = (statusCounts[row.scrape_status ?? 'unknown'] ?? 0) + 1;
  }
  console.log(`\nFinal: `, statusCounts);
}

main().catch(console.error);
