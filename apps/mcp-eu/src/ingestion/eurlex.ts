import { createHash } from 'crypto';
import { createServiceClient } from '@sieve/db';
import type { RegulatoryPage } from '@sieve/shared';
import { EUR_LEX_CELEX_IDS } from './constants';
import { structureHtmlContent } from './structure';
import { storeStructuredData } from './store';

const JURISDICTION = 'EU';
const DELAY_MS = 2000;

export interface EurLexIngestionResult {
  source: 'eurlex';
  total_celex: number;
  pages_upserted: number;
  pages_structured: number;
  errors: string[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchEurLexConsolidated(
  celexNumber: string
): Promise<RegulatoryPage | null> {
  const url = `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${celexNumber}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (!res.ok) {
      // EUR-Lex uses WAF (CloudFront) that may return 202/403 with JS challenges
      if (res.status === 202 || res.status === 403) {
        console.error(`EUR-Lex ${celexNumber}: WAF challenge (HTTP ${res.status}). Use Browser Use for this source.`);
        return null;
      }
      console.error(`EUR-Lex ${celexNumber}: HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();
    const plainText = stripHtmlTags(html);

    if (plainText.length < 200) {
      console.warn(`EUR-Lex ${celexNumber}: content too short (${plainText.length} chars)`);
      return null;
    }

    const celexMeta = EUR_LEX_CELEX_IDS.find((c) => c.celex === celexNumber);

    return {
      url,
      title: celexMeta?.title ?? `EUR-Lex ${celexNumber}`,
      content_text: plainText,
      published_date: null,
      domain: 'eur-lex.europa.eu',
      regulatory_body: celexMeta?.regulatory_body ?? 'EC',
      content_type: 'html',
      scraped_at: new Date().toISOString(),
      content_hash: sha256(plainText),
    };
  } catch (e) {
    console.error(`EUR-Lex ${celexNumber}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

export async function ingestEurLexLegislation(): Promise<EurLexIngestionResult> {
  const result: EurLexIngestionResult = {
    source: 'eurlex',
    total_celex: EUR_LEX_CELEX_IDS.length,
    pages_upserted: 0,
    pages_structured: 0,
    errors: [],
  };

  const supabase = createServiceClient();

  for (const { celex, title, regulatory_body } of EUR_LEX_CELEX_IDS) {
    try {
      const page = await fetchEurLexConsolidated(celex);
      if (!page) {
        result.errors.push(`${celex}: failed to fetch (EUR-Lex WAF blocks server-side requests — use Browser Use mode for EUR-Lex content)`);
        continue;
      }

      // Check if content has changed
      const { data: existing } = await supabase
        .from('regulatory_sources')
        .select('content_hash')
        .eq('url', page.url)
        .single();

      if (existing?.content_hash === page.content_hash) {
        // No change — skip
        continue;
      }

      const { error } = await supabase.from('regulatory_sources').upsert(
        {
          url: page.url,
          title,
          domain: 'eur-lex.europa.eu',
          regulatory_body,
          jurisdiction: JURISDICTION,
          content_type: 'html' as const,
          ingestion_tier: 'eurlex',
          content_text: page.content_text,
          content_hash: page.content_hash,
          last_scraped_at: page.scraped_at,
          scrape_status: 'scraped',
        },
        { onConflict: 'url' }
      );

      if (error) {
        result.errors.push(`${celex}: ${error.message}`);
        continue;
      }

      result.pages_upserted++;

      // Structure via Claude
      try {
        const structured = await structureHtmlContent(page);
        if (structured) {
          await storeStructuredData(page.url, structured);
          result.pages_structured++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`${celex} structuring: ${msg}`);
      }

      // Rate limit for Claude API
      await delay(DELAY_MS);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`${celex}: ${msg}`);
    }
  }

  console.log(
    `EUR-Lex: ${result.pages_upserted}/${result.total_celex} pages upserted, ${result.pages_structured} structured`
  );
  return result;
}
