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

    case 'change-detection': {
      const { runChangeDetection } = await import('../src/ingestion/change-detection');
      const result = await runChangeDetection();
      console.log('Change detection result:', JSON.stringify(result, null, 2));
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: npx tsx scripts/run-ingestion.ts [seed|scrape|scrape-url <url>|change-detection]');
      process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
