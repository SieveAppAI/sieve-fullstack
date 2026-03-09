/**
 * Standalone ingestion script — runs outside Next.js to avoid OOM.
 * Usage: npx tsx scripts/run-ingestion.ts [seed|discover|extract|structure|pdfs]
 */
import { resolve } from 'path';
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
      const { seedGCCSources } = await import('../src/ingestion/seed');
      const result = await seedGCCSources();
      console.log('Seed result:', result);
      break;
    }

    case 'discover': {
      // Step 1: Just discover URLs and print them
      const { discoverPages } = await import('../src/ingestion/discover');
      const urls = await discoverPages();
      console.log(`Discovered ${urls.length} URLs:`);
      for (const url of urls) console.log(`  ${url}`);
      break;
    }

    case 'extract': {
      // Step 2: Extract HTML from seeded URLs (uses DB sources)
      const { createServiceClient } = await import('@sieve/db');
      const { extractHtmlContent } = await import('../src/ingestion/extract-html');
      const { storeRegulatoryPage } = await import('../src/ingestion/store');

      const supabase = createServiceClient();
      const { data: sources } = await supabase
        .from('regulatory_sources')
        .select('url')
        .eq('jurisdiction', 'GCC')
        .eq('content_type', 'html')
        .eq('scrape_status', 'pending');

      if (!sources || sources.length === 0) {
        console.log('No pending HTML sources to extract');
        break;
      }

      const urls = sources.map((s) => s.url);
      console.log(`Extracting ${urls.length} HTML sources...`);

      const { pages, browserUseUrls } = await extractHtmlContent(urls);
      console.log(`Extracted ${pages.length} pages, ${browserUseUrls.length} need browser-use`);

      for (const page of pages) {
        const stored = await storeRegulatoryPage(page);
        console.log(`  ${stored ? 'Stored' : 'FAILED'}: ${page.url} (${page.content_text.length} chars)`);
      }
      break;
    }

    case 'structure': {
      // Step 3: Structure scraped content with Claude
      const { createServiceClient } = await import('@sieve/db');
      const { structureHtmlContent } = await import('../src/ingestion/structure');
      const { storeStructuredData } = await import('../src/ingestion/store');
      const { classifyRegulatoryBody } = await import('../src/ingestion/constants');

      const supabase = createServiceClient();
      const { data: sources } = await supabase
        .from('regulatory_sources')
        .select('id, url, title, content_text, content_hash, content_type')
        .eq('jurisdiction', 'GCC')
        .eq('content_type', 'html')
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

    case 'pdfs': {
      // Step 4: Process pending PDFs
      const { createServiceClient } = await import('@sieve/db');
      const { extractPdfWithClaudeVision } = await import('../src/ingestion/extract-pdf');
      const { storeStructuredData } = await import('../src/ingestion/store');

      const supabase = createServiceClient();
      const { data: pdfSources } = await supabase
        .from('regulatory_sources')
        .select('*')
        .eq('jurisdiction', 'GCC')
        .eq('content_type', 'pdf')
        .in('scrape_status', ['pending', 'pending_upload']);

      if (!pdfSources || pdfSources.length === 0) {
        console.log('No pending PDFs to process');
        break;
      }

      console.log(`Processing ${pdfSources.length} PDFs...`);
      let processed = 0;

      for (const source of pdfSources) {
        try {
          console.log(`  Downloading: ${source.url}`);
          const result = await extractPdfWithClaudeVision(
            source.url,
            source.regulatory_body ?? 'SFDA',
            'mixed',
            source.title ?? source.url
          );

          await supabase
            .from('regulatory_sources')
            .update({
              content_hash: result.content_hash,
              structured_data: result.structured_data as any,
              scrape_status: 'structured',
              last_scraped_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', source.id);

          await storeStructuredData(source.url, result.structured_data);
          processed++;
          console.log(`  Done: ${source.title}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  Error: ${source.url}: ${msg}`);
          await supabase
            .from('regulatory_sources')
            .update({ scrape_status: 'error', updated_at: new Date().toISOString() })
            .eq('id', source.id);
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      console.log(`Processed ${processed}/${pdfSources.length} PDFs`);
      break;
    }

    case 'status': {
      const { createServiceClient } = await import('@sieve/db');
      const supabase = createServiceClient();
      const { data: sources } = await supabase
        .from('regulatory_sources')
        .select('url, title, scrape_status, content_type, regulatory_body')
        .eq('jurisdiction', 'GCC')
        .order('scrape_status');

      if (!sources) {
        console.log('No sources found');
        break;
      }

      const byStatus: Record<string, number> = {};
      for (const s of sources) {
        byStatus[s.scrape_status ?? 'unknown'] = (byStatus[s.scrape_status ?? 'unknown'] || 0) + 1;
      }
      console.log('\nStatus summary:', byStatus);
      console.log(`\nAll ${sources.length} sources:`);
      for (const s of sources) {
        console.log(`  [${s.scrape_status}] ${s.content_type} ${s.regulatory_body}: ${s.title ?? s.url}`);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: npx tsx scripts/run-ingestion.ts [seed|discover|extract|structure|pdfs|status]');
      process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
