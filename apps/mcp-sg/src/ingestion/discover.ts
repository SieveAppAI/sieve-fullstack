import Exa from 'exa-js';
import {
  SG_REGULATORY_DOMAINS,
  DISCOVERY_QUERIES,
  ROOT_URLS,
} from './constants';

function getExaClient() {
  const apiKey = process.env.EXA_API_KEY?.trim();
  if (!apiKey) throw new Error('Missing EXA_API_KEY');
  return new Exa(apiKey);
}

export async function discoverPages(): Promise<string[]> {
  const exa = getExaClient();
  const allUrls = new Set<string>();

  // Search-based discovery
  for (const query of DISCOVERY_QUERIES) {
    try {
      const results = await exa.search(query, {
        includeDomains: SG_REGULATORY_DOMAINS,
        numResults: 25,
        type: 'auto',
      });

      for (const result of results.results) {
        allUrls.add(result.url);
      }
    } catch (err) {
      console.error(`Discovery query failed: ${query}`, err);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  // Subpage crawling from known root URLs
  for (const url of ROOT_URLS) {
    try {
      const contents = await exa.getContents([url], {
        text: true,
        subpages: 20,
        subpageTarget:
          'regulatory requirements ingredients labelling',
      });

      for (const page of contents.results) {
        allUrls.add(page.url);
      }
    } catch (err) {
      console.error(`Subpage crawl failed: ${url}`, err);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return Array.from(allUrls);
}
