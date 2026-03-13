import { createHash } from 'crypto';
import { createServiceClient } from '@sieve/db';
import type { RegulatoryPage } from '@sieve/shared';
import { EUR_LEX_CELEX_IDS } from './constants';
import { structureHtmlContent } from './structure';
import { storeStructuredData } from './store';

const JURISDICTION = 'EU';
const DELAY_MS = 2000;

/**
 * CELLAR API base URL — the EU Publications Office REST endpoint.
 * Unlike eur-lex.europa.eu, this endpoint does not use WAF/CloudFront
 * JS challenges, so server-side fetching works reliably.
 */
const CELLAR_SEARCH_API = 'https://publications.europa.eu/webapi/rdf/sparql';

export interface CellarIngestionResult {
  source: 'cellar';
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

/**
 * Fetch a regulation via the EUR-Lex CELLAR content negotiation endpoint.
 * Uses the CELEX-based URI which returns the HTML rendition without WAF.
 *
 * Fallback chain:
 * 1. publications.europa.eu content negotiation (CELLAR REST)
 * 2. eur-lex.europa.eu HTML endpoint (may hit WAF — existing eurlex.ts handles this)
 */
async function fetchViaCellar(celexNumber: string): Promise<string | null> {
  // The CELLAR content-negotiation endpoint resolves CELEX IDs to content
  const cellarUrl = `https://publications.europa.eu/resource/celex/${celexNumber}`;

  try {
    const res = await fetch(cellarUrl, {
      headers: {
        Accept: 'text/html, application/xhtml+xml;q=0.9, application/xml;q=0.8',
        'Accept-Language': 'en',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      console.warn(`CELLAR ${celexNumber}: HTTP ${res.status}, trying Formex XML...`);
      return await fetchFormexXml(celexNumber);
    }

    const html = await res.text();
    if (html.length < 500) {
      console.warn(`CELLAR ${celexNumber}: response too short (${html.length} chars)`);
      return await fetchFormexXml(celexNumber);
    }

    return html;
  } catch (e) {
    console.error(`CELLAR ${celexNumber}: ${e instanceof Error ? e.message : String(e)}`);
    return await fetchFormexXml(celexNumber);
  }
}

/**
 * Fallback: fetch Formex XML from EUR-Lex and extract text content.
 * EUR-Lex serves Formex XML at a different path that is less likely to be WAF'd.
 */
async function fetchFormexXml(celexNumber: string): Promise<string | null> {
  const xmlUrl = `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celexNumber}`;

  try {
    const res = await fetch(xmlUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Taama-Regulatory-Ingestion/1.0 (compliance research)',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      console.error(`Formex fallback ${celexNumber}: HTTP ${res.status}`);
      return null;
    }

    return await res.text();
  } catch (e) {
    console.error(`Formex fallback ${celexNumber}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/**
 * Fetch a single CELEX regulation via the CELLAR API and return a RegulatoryPage.
 */
export async function fetchCellarRegulation(
  celexNumber: string
): Promise<RegulatoryPage | null> {
  const html = await fetchViaCellar(celexNumber);
  if (!html) return null;

  const plainText = stripHtmlTags(html);

  if (plainText.length < 200) {
    console.warn(`CELLAR ${celexNumber}: extracted text too short (${plainText.length} chars)`);
    return null;
  }

  const celexMeta = EUR_LEX_CELEX_IDS.find((c) => c.celex === celexNumber);
  const sourceUrl = `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${celexNumber}`;

  return {
    url: sourceUrl,
    title: celexMeta?.title ?? `EUR-Lex ${celexNumber}`,
    content_text: plainText,
    published_date: null,
    domain: 'eur-lex.europa.eu',
    regulatory_body: celexMeta?.regulatory_body ?? 'EC',
    content_type: 'html',
    scraped_at: new Date().toISOString(),
    content_hash: sha256(plainText),
  };
}

/**
 * Ingest all EUR-Lex regulations via the CELLAR API.
 * This bypasses the WAF that blocks the standard eurlex.ts approach.
 */
export async function ingestViaCellar(): Promise<CellarIngestionResult> {
  const result: CellarIngestionResult = {
    source: 'cellar',
    total_celex: EUR_LEX_CELEX_IDS.length,
    pages_upserted: 0,
    pages_structured: 0,
    errors: [],
  };

  const supabase = createServiceClient();

  for (const { celex, title, regulatory_body } of EUR_LEX_CELEX_IDS) {
    try {
      const page = await fetchCellarRegulation(celex);
      if (!page) {
        result.errors.push(`${celex}: failed to fetch via CELLAR and fallbacks`);
        continue;
      }

      // Check if content has changed
      const { data: existing } = await supabase
        .from('regulatory_sources')
        .select('content_hash')
        .eq('url', page.url)
        .single();

      if (existing?.content_hash === page.content_hash) {
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
          ingestion_tier: 'cellar',
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

      await delay(DELAY_MS);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`${celex}: ${msg}`);
    }
  }

  console.log(
    `CELLAR: ${result.pages_upserted}/${result.total_celex} pages upserted, ${result.pages_structured} structured`
  );
  return result;
}
