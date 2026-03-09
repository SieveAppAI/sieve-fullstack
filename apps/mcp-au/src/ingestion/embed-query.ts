import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: text,
    providerOptions: { openai: { dimensions: 1024 } },
  });
  return embedding;
}
