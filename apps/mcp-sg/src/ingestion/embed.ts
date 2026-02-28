import { createServiceClient } from '@sieve/db';

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3';
const EMBEDDING_DIM = 1024;
const BATCH_SIZE = 64;
const CHUNK_WORDS = 500;
const OVERLAP_WORDS = 50;

interface VoyageResponse {
  data: { embedding: number[] }[];
}

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

async function getEmbeddings(
  texts: string[],
  apiKey: string,
): Promise<number[][]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
      output_dimension: EMBEDDING_DIM,
    }),
  });

  if (!response.ok) {
    throw new Error(`Voyage API error ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as VoyageResponse;
  return json.data.map((d) => d.embedding);
}

export async function reembedSources(): Promise<{ embedded: number; errors: string[] }> {
  const apiKey = process.env.VOYAGE_API_KEY?.trim();
  if (!apiKey) {
    return { embedded: 0, errors: [] };
  }

  const supabase = createServiceClient();
  const errors: string[] = [];

  // Get all structured sources with content
  const { data: sources } = await supabase
    .from('regulatory_sources')
    .select('id, url, content_text')
    .eq('jurisdiction', 'SG')
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

  // Process each source: chunk, embed, store
  for (const source of toEmbed) {
    try {
      const chunks = chunkText(source.content_text!);
      const allInserts: { source_id: string; chunk_text: string; embedding: string }[] = [];

      // Embed chunks in batches
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await getEmbeddings(batch, apiKey);

        for (let j = 0; j < batch.length; j++) {
          allInserts.push({
            source_id: source.id,
            chunk_text: batch[j],
            embedding: `[${embeddings[j].join(',')}]`,
          });
        }
      }

      // Insert all chunks for this source
      const { error } = await supabase
        .from('regulatory_embeddings')
        .insert(allInserts);

      if (error) {
        errors.push(`${source.url}: ${error.message}`);
      } else {
        totalEmbedded += allInserts.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${source.url}: ${msg}`);
    }
  }

  return { embedded: totalEmbedded, errors };
}
