/**
 * Extract and structure high-priority discovered URLs.
 * These are pages with actual regulatory data (ingredients, labelling, import reqs).
 */
import { resolve } from 'path';
import { config } from 'dotenv';
config({ path: resolve(__dirname, '../.env.local') });

import { createServiceClient } from '@sieve/db';
import { extractHtmlContent } from '../src/ingestion/extract-html';
import { storeRegulatoryPage } from '../src/ingestion/store';
import { structureHtmlContent } from '../src/ingestion/structure';
import { storeStructuredData } from '../src/ingestion/store';
import { classifyRegulatoryBody } from '../src/ingestion/constants';

// High-value URLs discovered — ingredient lists, labelling, halal, import
const PRIORITY_URLS = [
  // Ingredient lists
  'https://www.sfda.gov.sa/en/AllowedPreservatives',
  'http://sfda.gov.sa/en/ProhibitedIngredientsList',
  'https://www.sfda.gov.sa/en/AllowedColorants',

  // Food law & regulations
  'https://www.sfda.gov.sa/sites/default/files/2021-06/Implementing-Regulations-of-Food-Law-En.pdf',
  'https://www.sfda.gov.sa/sites/default/files/2020-12/FoodHygieneRequirementsEn.pdf',
  'https://www.sfda.gov.sa/sites/default/files/2021-10/NovelFoodGeneralRequirements.pdf',

  // Halal
  'https://www.sfda.gov.sa/en/regulations/2539',

  // Cosmetics
  'https://www.sfda.gov.sa/en/cosmetics-products',

  // Import requirements
  'http://sfda.gov.sa/en/regulations/66195',

  // GSO Standards
  'https://www.gso.org.sa/en/gso-standards/',

  // Dubai Municipality
  'https://www.dm.gov.ae/municipality-business/food-safety/',

  // UAE MoIAT
  'https://moiat.gov.ae/en/open-data/laws-and-legislation',
];

async function main() {
  const supabase = createServiceClient();

  // Filter to URLs not already in DB
  const { data: existing } = await supabase
    .from('regulatory_sources')
    .select('url')
    .eq('jurisdiction', 'GCC');

  const existingUrls = new Set((existing ?? []).map((s) => s.url));
  const newUrls = PRIORITY_URLS.filter((u) => !existingUrls.has(u));

  console.log(`${newUrls.length} new priority URLs to process (${PRIORITY_URLS.length - newUrls.length} already in DB)`);

  if (newUrls.length === 0) {
    console.log('All priority URLs already ingested');
    return;
  }

  // Extract HTML
  console.log('\n--- Extracting HTML ---');
  const { pages, browserUseUrls } = await extractHtmlContent(newUrls);
  console.log(`Extracted ${pages.length} pages, ${browserUseUrls.length} need browser-use`);

  // Store pages
  for (const page of pages) {
    const stored = await storeRegulatoryPage(page);
    console.log(`  ${stored ? 'OK' : 'FAIL'}: ${page.url} (${page.content_text.length} chars)`);
  }

  // Structure with Claude
  console.log('\n--- Structuring with Claude ---');
  let structured = 0;
  for (const page of pages) {
    try {
      const data = await structureHtmlContent(page);
      if (data) {
        await storeStructuredData(page.url, data);

        // Update source status
        await supabase
          .from('regulatory_sources')
          .update({ scrape_status: 'structured', updated_at: new Date().toISOString() })
          .eq('url', page.url);

        structured++;
        console.log(`  Structured: ${page.url}`);
      } else {
        console.log(`  No data: ${page.url}`);
        await supabase
          .from('regulatory_sources')
          .update({ scrape_status: 'structured', updated_at: new Date().toISOString() })
          .eq('url', page.url);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  Error: ${page.url}: ${msg}`);
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\nDone: ${structured}/${pages.length} pages structured`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
