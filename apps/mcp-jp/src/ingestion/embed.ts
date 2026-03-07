import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createServiceClient } from '@sieve/db';

const CHUNK_WORDS = 500;
const OVERLAP_WORDS = 50;

function chunkText(text: string): string[] {
  const words = text.split(/\s+/);
  if (words.length <= CHUNK_WORDS) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + CHUNK_WORDS, words.length);
    chunks.push(words.slice(start, end).join(' '));
    start = end - OVERLAP_WORDS;
    if (start >= words.length - OVERLAP_WORDS) break;
  }

  return chunks;
}

export async function reembedSources(): Promise<{ embedded: number; errors: string[] }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { embedded: 0, errors: ['OPENAI_API_KEY not set'] };
  }

  const supabase = createServiceClient();
  const errors: string[] = [];

  // Get all structured sources with content
  const { data: sources } = await supabase
    .from('regulatory_sources')
    .select('id, url, content_text')
    .eq('jurisdiction', 'JP')
    .eq('scrape_status', 'structured')
    .not('content_text', 'is', null);

  if (!sources || sources.length === 0) {
    return { embedded: 0, errors: [] };
  }

  // Get source IDs that already have embeddings
  const { data: existingEmbeddings } = await supabase
    .from('regulatory_embeddings')
    .select('source_id');

  const embeddedSourceIds = new Set(
    (existingEmbeddings ?? []).map((e) => e.source_id),
  );

  // Filter to sources that need embedding
  const toEmbed = sources.filter((s) => !embeddedSourceIds.has(s.id));

  if (toEmbed.length === 0) {
    return { embedded: 0, errors: [] };
  }

  let totalEmbedded = 0;

  for (const source of toEmbed) {
    try {
      const chunks = chunkText(source.content_text!);

      const { embeddings } = await embedMany({
        model: openai.embedding('text-embedding-3-small'),
        values: chunks,
        providerOptions: { openai: { dimensions: 1024 } },
      });

      const inserts = chunks.map((text, i) => ({
        source_id: source.id,
        chunk_text: text,
        embedding: `[${embeddings[i].join(',')}]`,
      }));

      const { error } = await supabase
        .from('regulatory_embeddings')
        .insert(inserts);

      if (error) {
        errors.push(`${source.url}: ${error.message}`);
      } else {
        totalEmbedded += inserts.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${source.url}: ${msg}`);
    }
  }

  return { embedded: totalEmbedded, errors };
}
