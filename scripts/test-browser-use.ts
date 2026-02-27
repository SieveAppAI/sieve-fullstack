/**
 * Test: Store and structure the Browser Use output for Sale of Food Act.
 * Usage: npx tsx scripts/test-browser-use.ts
 */
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim() });

const BU_TASK_ID = '78e7c417-dbf8-4ae0-8a58-24d2825aee44';
const BU_API = 'https://api.browser-use.com/api/v2';

async function main() {
  // Fetch the Browser Use output
  const resp = await fetch(`${BU_API}/tasks/${BU_TASK_ID}`, {
    headers: { 'X-Browser-Use-API-Key': process.env.BROWSER_USE_API_KEY!.trim() },
  });
  const task = await resp.json();
  const content = task.output as string;
  console.log('Content length:', content.length);

  // Store in regulatory_sources
  const url = 'https://sso.agc.gov.sg/Act/SFA1973';
  const hash = createHash('sha256').update(content).digest('hex');

  const { error: storeErr } = await sb.from('regulatory_sources').upsert(
    {
      url,
      title: 'Sale of Food Act (Cap 283)',
      domain: 'sso.agc.gov.sg',
      regulatory_body: 'SSO',
      jurisdiction: 'SG',
      content_type: 'html',
      ingestion_tier: 'browser_use',
      content_text: content,
      content_hash: hash,
      last_scraped_at: new Date().toISOString(),
      scrape_status: 'scraped',
    },
    { onConflict: 'url' }
  );

  if (storeErr) {
    console.error('Store error:', storeErr.message);
    return;
  }
  console.log('Stored raw content');

  // Structure with Claude
  console.log('Structuring with Claude...');
  const structResp = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: `You are a regulatory data extraction expert. Extract structured data from this Singapore legislation page.

Source URL: ${url} (SSO)
Content (first 15000 chars):
${content.slice(0, 15000)}

Extract into JSON. Choose the most appropriate type from: labelling_requirement, ingredient_regulation, claims_rule, import_requirement, or mixed.
Return valid JSON only, no markdown fences.`,
      },
    ],
  });

  const textBlock = structResp.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    console.log('No text in response');
    return;
  }
  let text = textBlock.text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  let structured: Record<string, unknown>;
  try {
    structured = JSON.parse(text);
  } catch (e) {
    console.error('Parse error:', (e as Error).message, text.substring(0, 200));
    return;
  }

  console.log('Structured type:', structured.type);
  const entries = structured.entries as Record<string, unknown>[];
  console.log('Entries:', entries?.length ?? 0);

  // Update regulatory_sources
  await sb.from('regulatory_sources').update({
    structured_data: structured,
    scrape_status: 'structured',
    updated_at: new Date().toISOString(),
  }).eq('url', url);

  console.log('Stored structured data');

  // Preview
  if (entries?.length > 0) {
    console.log('Sample entries:');
    for (const e of entries.slice(0, 5)) {
      console.log(
        '  -',
        e.element ?? e.ingredient_name ?? e.claim_text ?? e.requirement ?? JSON.stringify(e).substring(0, 80)
      );
    }
    if (entries.length > 5) console.log(`  ... +${entries.length - 5} more`);
  }
}

main().catch(console.error);
