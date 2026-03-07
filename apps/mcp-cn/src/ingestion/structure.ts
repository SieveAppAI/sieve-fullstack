import Anthropic from '@anthropic-ai/sdk';
import type { RegulatoryPage, StructuredData } from '@sieve/shared';

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
  return new Anthropic({ apiKey });
}

/**
 * Structure raw HTML content into typed regulatory data using Claude.
 * This is for HTML content scraped via Exa or Browser Use.
 * PDF content is already structured during extraction (Claude Vision).
 */
export async function structureHtmlContent(
  page: RegulatoryPage
): Promise<StructuredData | null> {
  const anthropic = getAnthropicClient();

  const prompt = `You are a regulatory data extraction expert specializing in Chinese (China) regulations. Given the following content scraped from a Chinese regulatory website, extract structured data into the specified JSON format.

IMPORTANT: The content is likely in Chinese (simplified). Extract all data and translate ingredient names, claim texts, and requirement descriptions to English while preserving the original Chinese text in an "original_text_zh" field for each entry.

Be aware of China-specific regulatory formats:
- GB standards (e.g., GB 2760 food additives tables with food category codes and max usage levels)
- IECIC inventory format (cosmetic ingredient listings with INCI names and CAS numbers)
- SAMR health food claims (24 permitted health function claims)
- GACC import requirements (Decree 248/249 registration requirements)

Source URL: ${page.url}
Regulatory Body: ${page.regulatory_body}
Content:
${page.content_text.slice(0, 30000)}

Extract into the following structure where applicable:

For INGREDIENT REGULATIONS:
{
  "type": "ingredient_regulation",
  "source_document": "${page.url}",
  "extraction_date": "${new Date().toISOString()}",
  "entries": [{
    "ingredient_name": string (English),
    "original_text_zh": string (Chinese),
    "inci_name": string | null,
    "cas_number": string | null,
    "status": "banned" | "restricted" | "permitted" | "permitted_with_limits",
    "product_categories": string[],
    "max_concentration_pct": number | null,
    "max_daily_dose_mg": number | null,
    "conditions": string[],
    "required_warnings": string[],
    "regulation_reference": string,
    "annex_reference": string | null,
    "effective_date": string | null
  }]
}

For LABELLING REQUIREMENTS:
{
  "type": "labelling_requirement",
  "source_document": "${page.url}",
  "extraction_date": "${new Date().toISOString()}",
  "entries": [{
    "element": string (English),
    "original_text_zh": string (Chinese),
    "mandatory": boolean,
    "product_categories": string[],
    "description": string,
    "format_rules": string | null,
    "exemptions": string[],
    "regulation_reference": string
  }]
}

For CLAIMS RULES:
{
  "type": "claims_rule",
  "source_document": "${page.url}",
  "extraction_date": "${new Date().toISOString()}",
  "entries": [{
    "claim_text": string (English),
    "original_text_zh": string (Chinese),
    "claim_type": "nutrition" | "health" | "therapeutic" | "marketing",
    "status": "permitted" | "prohibited" | "conditional",
    "conditions": object | null,
    "product_categories": string[],
    "regulation_reference": string
  }]
}

For IMPORT REQUIREMENTS:
{
  "type": "import_requirement",
  "source_document": "${page.url}",
  "extraction_date": "${new Date().toISOString()}",
  "entries": [{
    "requirement": string (English),
    "original_text_zh": string (Chinese),
    "product_categories": string[],
    "documents_required": string[],
    "licensing_body": string,
    "regulation_reference": string
  }]
}

If the content contains multiple types of data, use type "mixed" and include all relevant arrays.
Only extract data that is explicitly stated in the source content.
Include the exact regulation reference where available (e.g., GB 2760-2024, CSAR Article 15).
Return valid JSON only, no markdown fences or commentary.
If no structured regulatory data can be extracted, return null.`;

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

    // Strip markdown code fences if present
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    return JSON.parse(text) as StructuredData;
  } catch (err) {
    console.error(`Failed to structure content from ${page.url}:`, err);
    return null;
  }
}
