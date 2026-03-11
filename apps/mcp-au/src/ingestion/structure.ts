import Anthropic from '@anthropic-ai/sdk';
import type { RegulatoryPage, StructuredData } from '@sieve/shared';
import { buildStructuringPrompt } from '@sieve/shared';

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
  return new Anthropic({ apiKey });
}

export async function structureHtmlContent(
  page: RegulatoryPage
): Promise<StructuredData | null> {
  const anthropic = getAnthropicClient();

  const prompt = buildStructuringPrompt({
    jurisdiction: 'AU_NZ',
    jurisdictionLabel: 'Australia and New Zealand',
    url: page.url,
    regulatoryBody: page.regulatory_body,
    contentText: page.content_text,
    extractionDate: new Date().toISOString(),
  });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    let text = textBlock.text.trim();
    if (text === 'null' || text === '') return null;

    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    return JSON.parse(text) as StructuredData;
  } catch (err) {
    console.error(`Failed to structure content from ${page.url}:`, err);
    return null;
  }
}
