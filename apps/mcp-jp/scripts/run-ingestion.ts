/**
 * Standalone ingestion script — runs outside Next.js to avoid OOM.
 * Usage: npx tsx scripts/run-ingestion.ts [seed|scrape|scrape-url <url>]
 */
import 'dotenv/config';
import { resolve } from 'path';

// Load .env.local manually since dotenv/config only loads .env
import { config } from 'dotenv';
config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  const command = process.argv[2] || 'seed';

  console.log(`Running: ${command}`);
  console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING'}`);
  console.log(`Exa API Key: ${process.env.EXA_API_KEY ? 'set' : 'MISSING'}`);
  console.log(`Anthropic Key: ${process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING'}`);

  switch (command) {
    case 'seed': {
      const { seedJPSources } = await import('../src/ingestion/seed');
      const result = await seedJPSources();
      console.log('Seed result:', result);
      break;
    }

    case 'scrape': {
      const { runFullIngestion } = await import('../src/ingestion/pipeline');
      const result = await runFullIngestion();
      console.log('Scrape result:', JSON.stringify(result, null, 2));
      break;
    }

    case 'scrape-url': {
      const url = process.argv[3];
      if (!url) {
        console.error('Usage: npx tsx scripts/run-ingestion.ts scrape-url <url>');
        process.exit(1);
      }
      const { runFullIngestion } = await import('../src/ingestion/pipeline');
      const result = await runFullIngestion([url]);
      console.log('Scrape result:', JSON.stringify(result, null, 2));
      break;
    }

    case 'structure': {
      // Structure scraped-but-not-yet-structured sources
      const { createServiceClient } = await import('@sieve/db');
      const { structureHtmlContent } = await import('../src/ingestion/structure');
      const { storeStructuredData } = await import('../src/ingestion/store');
      const { classifyRegulatoryBody } = await import('../src/ingestion/constants');

      const supabase = createServiceClient();
      const { data: sources } = await supabase
        .from('regulatory_sources')
        .select('id, url, title, content_text, content_hash, content_type')
        .eq('jurisdiction', 'JP')
        .eq('scrape_status', 'scraped');

      if (!sources || sources.length === 0) {
        console.log('No scraped sources to structure');
        break;
      }

      console.log(`Structuring ${sources.length} pages...`);
      let structured = 0;

      for (const source of sources) {
        try {
          const page = {
            url: source.url,
            title: source.title ?? '',
            content_text: source.content_text ?? '',
            published_date: null,
            domain: new URL(source.url).hostname,
            regulatory_body: classifyRegulatoryBody(source.url),
            content_type: 'html' as const,
            scraped_at: new Date().toISOString(),
            content_hash: source.content_hash ?? '',
          };

          const data = await structureHtmlContent(page);
          if (data) {
            await storeStructuredData(source.url, data);
            await supabase
              .from('regulatory_sources')
              .update({ scrape_status: 'structured', updated_at: new Date().toISOString() })
              .eq('id', source.id);
            structured++;
            console.log(`  Structured: ${source.url}`);
          } else {
            console.log(`  No data: ${source.url}`);
            await supabase
              .from('regulatory_sources')
              .update({ scrape_status: 'structured', updated_at: new Date().toISOString() })
              .eq('id', source.id);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  Error: ${source.url}: ${msg}`);
        }

        // Rate limit for Claude API
        await new Promise((r) => setTimeout(r, 1500));
      }

      console.log(`Structured ${structured}/${sources.length} pages`);
      break;
    }

    case 'change-detection': {
      const { runChangeDetection } = await import('../src/ingestion/change-detection');
      const result = await runChangeDetection();
      console.log('Change detection result:', JSON.stringify(result, null, 2));
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: npx tsx scripts/run-ingestion.ts [seed|scrape|scrape-url <url>|structure|change-detection]');
      process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
