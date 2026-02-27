/**
 * Process all remaining pending/scraped regulatory sources.
 * - Exa-tier: extract via Exa API, then structure via Claude
 * - Browser Use-tier: extract via Browser Use API, then structure via Claude
 * - Scraped (already extracted): just structure via Claude
 *
 * Usage: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/scrape-remaining.ts
 */
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import Exa from 'exa-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
);

const exa = new Exa(process.env.EXA_API_KEY!.trim());
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim() });

const BROWSER_USE_API = 'https://api.browser-use.com/api/v2';
const browserUseApiKey = process.env.BROWSER_USE_API_KEY?.trim();

// ── Exa extraction ──────────────────────────────────────────────
async function extractWithExa(url: string): Promise<{ text: string; title: string } | null> {
  try {
    const results = await exa.getContents([url], { text: true, livecrawl: 'always' });
    if (results.results.length > 0) {
      const r = results.results[0];
      const text = r.text ?? '';
      if (text.length >= 100 && !text.includes('Please enable JavaScript')) {
        return { text, title: r.title ?? '' };
      }
    }
  } catch (e) {
    console.log(`  Exa getContents failed for ${url}, trying searchAndContents...`);
  }

  // Fallback: searchAndContents
  try {
    const domain = new URL(url).hostname;
    const results = await exa.searchAndContents(url, {
      includeDomains: [domain],
      numResults: 1,
      text: true,
    });
    if (results.results.length > 0) {
      const r = results.results[0];
      const text = r.text ?? '';
      if (text.length >= 100) {
        return { text, title: r.title ?? '' };
      }
    }
  } catch (e) {
    console.log(`  Exa searchAndContents also failed for ${url}`);
  }

  return null;
}

// ── Browser Use extraction ──────────────────────────────────────
function buildTaskForUrl(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('sso.agc.gov.sg')) {
    return `This is a Singapore Statutes Online page. Wait for the JavaScript-rendered content to fully load. Extract the complete legislative text from the main content area, including: the act/regulation title, all part headings, all section numbers and their text, all schedules, and any amendments. If there are multiple parts or divisions, extract them all. Return the full text content. Do not truncate.`;
  }
  if (hostname.includes('hsa.gov.sg') && url.includes('vns')) {
    return `This is the HSA Voluntary Notification Scheme page. Find the search or listing functionality for approved health supplement ingredients. If there is an A-Z listing or category navigation, iterate through the first few categories to extract approved ingredients with their conditions of use. Return as much structured ingredient data as possible.`;
  }
  return `Wait for the page to fully load. Extract all text content from the main content area, including tables, lists, and any regulatory information. Return the complete text.`;
}

async function extractWithBrowserUseApi(url: string): Promise<{ text: string } | null> {
  if (!browserUseApiKey) {
    console.log('  BROWSER_USE_API_KEY not set, skipping');
    return null;
  }

  const task = buildTaskForUrl(url);
  const response = await fetch(`${BROWSER_USE_API}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Browser-Use-API-Key': browserUseApiKey,
    },
    body: JSON.stringify({ task, startUrl: url, maxSteps: 150 }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.log(`  Browser Use task creation failed: ${response.status} ${body.slice(0, 200)}`);
    return null;
  }

  const result = await response.json();
  const taskId = result.id;
  if (!taskId) return null;

  console.log(`  Browser Use task ${taskId} started, polling...`);

  // Poll for completion (max 200s)
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const resp = await fetch(`${BROWSER_USE_API}/tasks/${taskId}`, {
        headers: { 'X-Browser-Use-API-Key': browserUseApiKey },
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      if (data.status === 'finished') {
        return data.output ? { text: data.output } : null;
      }
      if (data.status === 'stopped') {
        console.log(`  Task ${taskId} stopped`);
        return null;
      }
      if (i % 6 === 5) console.log(`  Still polling... (${(i + 1) * 5}s)`);
    } catch {}
  }
  console.log(`  Task ${taskId} timed out`);
  return null;
}

// ── Claude structuring ──────────────────────────────────────────
function classifyRegulatoryBody(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('sfa.gov.sg')) return 'SFA';
  if (hostname.includes('hsa.gov.sg')) return 'HSA';
  if (hostname.includes('sso.agc.gov.sg')) return 'SSO';
  if (hostname.includes('nea.gov.sg')) return 'NEA';
  return 'SFA';
}

async function structureContent(url: string, contentText: string, regulatoryBody: string) {
  const prompt = `You are a regulatory data extraction expert. Given the following content scraped from a Singapore regulatory website, extract structured data into the specified JSON format.

Source URL: ${url}
Regulatory Body: ${regulatoryBody}
Content:
${contentText.slice(0, 30000)}

Extract into the following structure where applicable:

For INGREDIENT REGULATIONS:
{
  "type": "ingredient_regulation",
  "source_document": "${url}",
  "extraction_date": "${new Date().toISOString()}",
  "entries": [{
    "ingredient_name": string,
    "inci_name": string | null,
    "cas_number": string | null,
    "status": "banned" | "restricted" | "permitted" | "permitted_with_limits",
    "product_categories": string[],
    "max_concentration_pct": number | null,
    "max_daily_dose_mg": number | null,
    "conditions": string[],
    "required_warnings": string[],
    "regulation_reference": string,
    "annex_reference": string | null,
    "effective_date": string | null
  }]
}

For LABELLING REQUIREMENTS:
{
  "type": "labelling_requirement",
  "source_document": "${url}",
  "extraction_date": "${new Date().toISOString()}",
  "entries": [{
    "element": string,
    "mandatory": boolean,
    "product_categories": string[],
    "description": string,
    "format_rules": string | null,
    "exemptions": string[],
    "regulation_reference": string
  }]
}

For CLAIMS RULES:
{
  "type": "claims_rule",
  "source_document": "${url}",
  "extraction_date": "${new Date().toISOString()}",
  "entries": [{
    "claim_text": string,
    "claim_type": "nutrition" | "health" | "therapeutic" | "marketing",
    "status": "permitted" | "prohibited" | "conditional",
    "conditions": object | null,
    "product_categories": string[],
    "regulation_reference": string
  }]
}

For IMPORT REQUIREMENTS:
{
  "type": "import_requirement",
  "source_document": "${url}",
  "extraction_date": "${new Date().toISOString()}",
  "entries": [{
    "requirement": string,
    "product_categories": string[],
    "documents_required": string[],
    "licensing_body": string,
    "regulation_reference": string
  }]
}

If the content contains multiple types of data, use type "mixed" and include all relevant arrays.
Only extract data that is explicitly stated in the source content.
Include the exact regulation reference where available.
Return valid JSON only, no markdown fences or commentary.
If no structured regulatory data can be extracted, return null.`;

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

// ── Storage helpers ─────────────────────────────────────────────
async function storeExtracted(url: string, text: string, title: string, tier: string) {
  const hash = createHash('sha256').update(text).digest('hex');
  await supabase.from('regulatory_sources').update({
    content_text: text,
    content_hash: hash,
    title: title || undefined,
    last_scraped_at: new Date().toISOString(),
    scrape_status: 'scraped',
    ingestion_tier: tier,
  }).eq('url', url);
}

async function storeStructured(url: string, structured: Record<string, unknown>) {
  await supabase.from('regulatory_sources').update({
    structured_data: structured,
    scrape_status: 'structured',
    updated_at: new Date().toISOString(),
  }).eq('url', url);

  // Get source ID
  const { data: source } = await supabase
    .from('regulatory_sources')
    .select('id')
    .eq('url', url)
    .single();
  if (!source) return;

  type Entry = Record<string, unknown>;
  const entries = (structured.entries ?? structured.ingredient_regulations ?? []) as Entry[];

  if (structured.type === 'ingredient_regulation' || structured.ingredient_regulations) {
    for (const entry of entries) {
      const { data: ingredient } = await supabase.from('ingredients').upsert({
        canonical_name: entry.ingredient_name as string,
        inci_name: (entry.inci_name as string) ?? null,
        cas_number: (entry.cas_number as string) ?? null,
        category: (entry.category as string) ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'canonical_name' }).select('id').single();
      if (!ingredient) continue;

      await supabase.from('ingredient_regulations').upsert({
        ingredient_id: ingredient.id,
        jurisdiction: 'SG',
        regulatory_body: (entry.regulatory_body as string) ?? classifyRegulatoryBody(url),
        status: entry.status as string,
        product_categories: (entry.product_categories as string[]) ?? [],
        max_concentration_pct: entry.max_concentration_pct as number | null,
        max_daily_dose_mg: entry.max_daily_dose_mg as number | null,
        conditions: { conditions_of_use: entry.conditions ?? [], other_limitations: entry.other_limitations ?? [] },
        required_warnings: (entry.required_warnings as string[]) ?? [],
        regulation_reference: (entry.regulation_reference as string) ?? null,
        annex_reference: (entry.annex_reference as string) ?? null,
        source_id: source.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'ingredient_id,jurisdiction,regulatory_body' });
    }
  }

  if (structured.type === 'labelling_requirement' || structured.labelling_requirements) {
    const labellingEntries = (structured.labelling_requirements ?? structured.entries ?? []) as Entry[];
    for (const entry of labellingEntries) {
      await supabase.from('labelling_requirements').upsert({
        jurisdiction: 'SG',
        regulatory_body: (entry.regulatory_body as string) ?? classifyRegulatoryBody(url),
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

  if (structured.type === 'claims_rule' || structured.claims_rules) {
    const claimsEntries = (structured.claims_rules ?? structured.entries ?? []) as Entry[];
    for (const entry of claimsEntries) {
      await supabase.from('claims_rules').upsert({
        jurisdiction: 'SG',
        regulatory_body: (entry.regulatory_body as string) ?? classifyRegulatoryBody(url),
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

  if (structured.type === 'import_requirement' || structured.import_requirements) {
    const importEntries = (structured.import_requirements ?? structured.entries ?? []) as Entry[];
    for (const entry of importEntries) {
      await supabase.from('import_requirements').upsert({
        jurisdiction: 'SG',
        product_category: ((entry.product_categories as string[]) ?? ['food'])[0],
        requirement: entry.requirement as string,
        requirement_type: (entry.requirement_type as string) ?? null,
        regulatory_body: (entry.licensing_body as string) ?? classifyRegulatoryBody(url),
        documents_required: (entry.documents_required as string[]) ?? [],
        regulation_reference: (entry.regulation_reference as string) ?? null,
        source_id: source.id,
      }, { onConflict: 'jurisdiction,product_category,requirement' });
    }
  }
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  // Fetch all non-structured sources
  const { data: sources } = await supabase
    .from('regulatory_sources')
    .select('*')
    .eq('jurisdiction', 'SG')
    .in('scrape_status', ['pending', 'scraped'])
    .order('ingestion_tier', { ascending: true });

  if (!sources || sources.length === 0) {
    console.log('No pending/scraped sources found.');
    return;
  }

  console.log(`Found ${sources.length} sources to process:\n`);
  for (const s of sources) {
    console.log(`  [${s.scrape_status}] [${s.ingestion_tier}] ${s.title ?? s.url}`);
  }
  console.log('');

  const exaPending = sources.filter(s => s.ingestion_tier === 'exa' && s.scrape_status === 'pending');
  const buPending = sources.filter(s => s.ingestion_tier === 'browser_use' && s.scrape_status === 'pending');
  const scraped = sources.filter(s => s.scrape_status === 'scraped');

  let extracted = 0;
  let structured = 0;
  let failed = 0;

  // ── Process Exa-tier pending sources ──
  console.log(`\n=== Processing ${exaPending.length} Exa-tier pending sources ===\n`);
  for (const source of exaPending) {
    console.log(`[Exa] ${source.title ?? source.url}`);
    const result = await extractWithExa(source.url);
    if (result) {
      console.log(`  Extracted ${result.text.length} chars`);
      await storeExtracted(source.url, result.text, result.title, 'exa');
      extracted++;

      // Structure immediately
      try {
        const data = await structureContent(source.url, result.text, source.regulatory_body ?? classifyRegulatoryBody(source.url));
        if (data) {
          await storeStructured(source.url, data);
          console.log(`  Structured: ${data.type} with ${(data.entries ?? data.ingredient_regulations ?? data.labelling_requirements ?? data.claims_rules ?? data.import_requirements ?? []).length} entries`);
          structured++;
        } else {
          console.log('  No structured data extracted');
        }
      } catch (e) {
        console.log(`  Structuring error: ${e instanceof Error ? e.message : e}`);
        failed++;
      }
    } else {
      console.log('  Exa extraction failed — adding to Browser Use queue');
      // Mark as browser_use tier for next pass
      await supabase.from('regulatory_sources').update({ ingestion_tier: 'browser_use' }).eq('url', source.url);
      buPending.push(source);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // ── Process already-scraped sources (just need structuring) ──
  console.log(`\n=== Structuring ${scraped.length} already-scraped sources ===\n`);
  for (const source of scraped) {
    console.log(`[Structure] ${source.title ?? source.url}`);
    try {
      const data = await structureContent(
        source.url,
        source.content_text ?? '',
        source.regulatory_body ?? classifyRegulatoryBody(source.url)
      );
      if (data) {
        await storeStructured(source.url, data);
        const entries = data.entries ?? data.ingredient_regulations ?? data.labelling_requirements ?? data.claims_rules ?? data.import_requirements ?? [];
        console.log(`  Structured: ${data.type} with ${entries.length} entries`);
        structured++;
      } else {
        console.log('  No structured data extracted');
      }
    } catch (e) {
      console.log(`  Structuring error: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // ── Process Browser Use-tier pending sources ──
  console.log(`\n=== Processing ${buPending.filter(s => s.scrape_status === 'pending').length} Browser Use-tier pending sources ===\n`);
  for (const source of buPending.filter(s => s.scrape_status === 'pending')) {
    console.log(`[BrowserUse] ${source.title ?? source.url}`);
    const result = await extractWithBrowserUseApi(source.url);
    if (result && result.text.length > 100) {
      console.log(`  Extracted ${result.text.length} chars`);
      await storeExtracted(source.url, result.text, source.title ?? '', 'browser_use');
      extracted++;

      // Structure
      try {
        const data = await structureContent(source.url, result.text, source.regulatory_body ?? classifyRegulatoryBody(source.url));
        if (data) {
          await storeStructured(source.url, data);
          const entries = data.entries ?? data.ingredient_regulations ?? data.labelling_requirements ?? data.claims_rules ?? data.import_requirements ?? [];
          console.log(`  Structured: ${data.type} with ${entries.length} entries`);
          structured++;
        } else {
          console.log('  No structured data extracted');
        }
      } catch (e) {
        console.log(`  Structuring error: ${e instanceof Error ? e.message : e}`);
        failed++;
      }
    } else {
      console.log('  Browser Use extraction failed or too short');
      await supabase.from('regulatory_sources').update({
        scrape_status: 'error' as never,
        error_message: 'Browser Use extraction failed or returned insufficient content',
      }).eq('url', source.url);
      failed++;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n=== DONE ===`);
  console.log(`  Extracted: ${extracted}`);
  console.log(`  Structured: ${structured}`);
  console.log(`  Failed: ${failed}`);

  // Final counts
  const { data: counts } = await supabase
    .from('regulatory_sources')
    .select('scrape_status')
    .eq('jurisdiction', 'SG');

  const statusCounts: Record<string, number> = {};
  for (const row of counts ?? []) {
    statusCounts[row.scrape_status ?? 'unknown'] = (statusCounts[row.scrape_status ?? 'unknown'] ?? 0) + 1;
  }
  console.log(`\nFinal source status:`, statusCounts);
}

main().catch(console.error);
