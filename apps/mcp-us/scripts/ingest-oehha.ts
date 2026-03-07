import { createHash } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@sieve/db';
import type { Json } from '@sieve/db';

const URL = 'https://oehha.ca.gov/sites/default/files/media/downloads/proposition-65/safeharborlist032521.pdf';
const CHUNK_PAGES = 3;

async function main() {
  const supabase = createServiceClient();
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY?.trim(),
    timeout: 10 * 60 * 1000,
  });

  console.log('Downloading OEHHA Prop 65 Safe Harbor PDF...');
  const res = await fetch(URL, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'application/pdf,*/*',
    },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`Downloaded: ${(buf.length / 1024).toFixed(0)}KB`);

  const contentHash = createHash('sha256').update(buf).digest('hex');

  // Check existing
  const { data: existing } = await supabase
    .from('regulatory_sources')
    .select('content_hash')
    .eq('url', URL)
    .single();

  if (existing?.content_hash === contentHash) {
    console.log('Already ingested with same hash — skipping');
    return;
  }

  const doc = await PDFDocument.load(new Uint8Array(buf));
  const totalPages = doc.getPageCount();
  console.log(`Total pages: ${totalPages}`);

  // Split into small chunks
  const chunks: { bytes: Uint8Array; label: string }[] = [];
  for (let s = 0; s < totalPages; s += CHUNK_PAGES) {
    const e = Math.min(s + CHUNK_PAGES, totalPages);
    const cd = await PDFDocument.create();
    const pages = await cd.copyPages(doc, Array.from({ length: e - s }, (_, i) => s + i));
    for (const p of pages) cd.addPage(p);
    chunks.push({ bytes: await cd.save(), label: `pages ${s + 1}-${e}` });
  }
  console.log(`Split into ${chunks.length} chunks`);

  const allEntries: Record<string, unknown>[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]!;
    const b64 = Buffer.from(c.bytes).toString('base64');
    console.log(`Processing chunk ${i + 1}/${chunks.length} (${c.label}, ${(c.bytes.length / 1024).toFixed(0)}KB)...`);

    try {
      const r = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
              {
                type: 'text',
                text: `Extract ALL chemical entries from this chunk of the OEHHA Prop 65 Safe Harbor Levels document into JSON. Output ONLY valid JSON — no prose, no markdown fences.

Format: {"entries":[{"chemical_name":"string","cas_number":"string|null","nsrl_ug_day":number|null,"madl_ug_day":number|null,"effective_date":"string|null","listing_mechanism":"string|null"}]}

Extract EVERY row. Preserve exact values. Use null for missing fields.`,
              },
            ],
          },
        ],
      });

      const tb = r.content.find((b) => b.type === 'text');
      if (!tb || tb.type !== 'text') {
        console.log(`  No text response`);
        continue;
      }

      let json = tb.text.trim();
      if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const ji = json.indexOf('{');
      if (ji > 0) json = json.slice(ji);

      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch {
        // Try to fix truncated JSON
        const lastComplete = json.lastIndexOf('},');
        if (lastComplete > 0) {
          json = json.slice(0, lastComplete + 1);
          const ob = (json.match(/\[/g) ?? []).length - (json.match(/\]/g) ?? []).length;
          const oc = (json.match(/\{/g) ?? []).length - (json.match(/\}/g) ?? []).length;
          json += ']'.repeat(Math.max(0, ob)) + '}'.repeat(Math.max(0, oc));
          parsed = JSON.parse(json);
          console.log(`  (fixed truncated JSON)`);
        } else {
          throw new Error('Could not fix truncated JSON');
        }
      }

      const entries = (parsed.entries ?? []) as Record<string, unknown>[];
      console.log(`  Extracted: ${entries.length} entries`);
      allEntries.push(...entries);
    } catch (e) {
      console.error(`  Failed: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
    }
  }

  console.log(`\nTotal entries: ${allEntries.length}`);

  // Store in regulatory_sources
  const structured = {
    type: 'ingredient_regulation',
    source_document: URL,
    extraction_date: new Date().toISOString(),
    entries: allEntries,
    total_entries_extracted: allEntries.length,
  };

  const { error: ue } = await supabase.from('regulatory_sources').upsert(
    {
      url: URL,
      title: 'OEHHA Prop 65 Safe Harbor Levels (NSRL/MADL)',
      domain: 'oehha.ca.gov',
      regulatory_body: 'OEHHA',
      jurisdiction: 'US',
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

  if (ue) {
    console.error('Upsert error:', ue.message);
    process.exit(1);
  }

  const { data: src } = await supabase
    .from('regulatory_sources')
    .select('id')
    .eq('url', URL)
    .single();

  if (!src) {
    console.error('No source row found');
    process.exit(1);
  }

  // Store ingredient regulations
  let stored = 0;
  for (const e of allEntries) {
    if (!e.chemical_name) continue;

    const { data: ing } = await supabase
      .from('ingredients')
      .upsert(
        {
          canonical_name: e.chemical_name as string,
          cas_number: (e.cas_number as string) ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'canonical_name' }
      )
      .select('id')
      .single();

    if (!ing) continue;

    await supabase.from('ingredient_regulations').upsert(
      {
        ingredient_id: ing.id,
        jurisdiction: 'US',
        regulatory_body: 'OEHHA',
        status: 'restricted',
        product_categories: ['all'],
        max_daily_dose_mg: e.madl_ug_day ? (e.madl_ug_day as number) / 1000 : null,
        conditions: {
          nsrl_ug_day: e.nsrl_ug_day,
          madl_ug_day: e.madl_ug_day,
          listing_mechanism: e.listing_mechanism,
        } as unknown as Json,
        regulation_reference: 'California Proposition 65',
        source_id: src.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'ingredient_id,jurisdiction,regulatory_body' }
    );
    stored++;
  }

  console.log(`Stored ${stored} ingredient regulations`);
}

main().catch(console.error);
