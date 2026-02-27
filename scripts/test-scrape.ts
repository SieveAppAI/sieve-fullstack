/**
 * Test script: end-to-end scrape of 2 SFA pages.
 * Usage: npx tsx scripts/test-scrape.ts
 */
import Exa from 'exa-js';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
);
const exa = new Exa(process.env.EXA_API_KEY!.trim());
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim() });

const TEST_URLS = [
  'https://www.sfa.gov.sg/food-information/food-allergy-and-intolerance',
  'https://www.sfa.gov.sg/food-information/nutrition-labelling',
];

function classifyBody(url: string): string {
  const h = new URL(url).hostname.toLowerCase();
  if (h.includes('sfa.gov.sg')) return 'SFA';
  if (h.includes('hsa.gov.sg')) return 'HSA';
  if (h.includes('sso.agc.gov.sg')) return 'SSO';
  return 'Unknown';
}

async function extract(url: string): Promise<{ url: string; title: string; text: string } | null> {
  const domain = new URL(url).hostname;
  const r = await exa.searchAndContents(url, {
    includeDomains: [domain],
    numResults: 1,
    text: true,
  });
  if (r.results.length === 0) return null;
  return { url: r.results[0].url, title: r.results[0].title ?? '', text: r.results[0].text ?? '' };
}

async function structure(url: string, body: string, text: string): Promise<Record<string, unknown> | null> {
  const prompt = `You are a regulatory data extraction expert. Extract structured data from this Singapore regulatory page.

Source: ${url} (${body})
Content (first 25000 chars):
${text.slice(0, 25000)}

Extract into JSON. Choose the most appropriate type:
- "labelling_requirement" with entries: [{element, mandatory, product_categories, description, format_rules, regulation_reference}]
- "ingredient_regulation" with entries: [{ingredient_name, inci_name, cas_number, status, product_categories, max_concentration_pct, conditions, required_warnings, regulation_reference}]
- "claims_rule" with entries: [{claim_text, claim_type, status, conditions, product_categories, regulation_reference}]
- "import_requirement" with entries: [{requirement, product_categories, documents_required, licensing_body, regulation_reference}]

Return valid JSON only. If no regulatory data found, return null.`;

  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });
  const tb = resp.content.find((b) => b.type === 'text');
  if (!tb || tb.type !== 'text') return null;
  let t = tb.text.trim();
  if (t === 'null' || t === '') return null;
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  try { return JSON.parse(t); } catch (e) { console.error('  Parse error:', (e as Error).message, 'Raw:', t.substring(0, 200)); return null; }
}

async function main() {
  console.log('=== Test Scrape: End-to-End ===\n');

  for (const url of TEST_URLS) {
    console.log(`--- ${url} ---`);

    // Extract
    console.log('  Extracting via Exa...');
    const page = await extract(url);
    if (!page) { console.log('  [skip] No content'); continue; }
    console.log(`  Extracted: ${page.title} (${page.text.length} chars)`);

    // Store raw
    const hash = createHash('sha256').update(page.text).digest('hex');
    const { error: storeErr } = await supabase.from('regulatory_sources').upsert({
      url: page.url,
      title: page.title,
      domain: new URL(page.url).hostname,
      regulatory_body: classifyBody(page.url),
      jurisdiction: 'SG',
      content_type: 'html',
      ingestion_tier: 'exa',
      content_text: page.text,
      content_hash: hash,
      last_scraped_at: new Date().toISOString(),
      scrape_status: 'scraped',
    }, { onConflict: 'url' });
    if (storeErr) { console.log('  [fail] Store:', storeErr.message); continue; }
    console.log('  Stored raw content');

    // Structure
    console.log('  Structuring with Claude...');
    const structured = await structure(page.url, classifyBody(page.url), page.text);
    if (!structured) { console.log('  [skip] No structured data'); continue; }
    console.log(`  Structured: type=${(structured as Record<string, unknown>).type}, entries=${((structured as Record<string, unknown>).entries as unknown[])?.length ?? 0}`);

    // Store structured
    await supabase.from('regulatory_sources').update({
      structured_data: structured,
      scrape_status: 'structured',
      updated_at: new Date().toISOString(),
    }).eq('url', page.url);
    console.log('  Stored structured data');

    // Preview
    const entries = (structured as Record<string, unknown>).entries as Record<string, unknown>[];
    if (entries?.length > 0) {
      console.log('  Sample entries:');
      for (const e of entries.slice(0, 3)) {
        console.log(`    - ${e.element ?? e.ingredient_name ?? e.claim_text ?? e.requirement}`);
      }
      if (entries.length > 3) console.log(`    ... +${entries.length - 3} more`);
    }
    console.log();
  }

  console.log('=== Done ===');
}

main().catch(console.error);
