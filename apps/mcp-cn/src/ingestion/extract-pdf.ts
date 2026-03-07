import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';
import type { StructuredData } from '@sieve/shared';

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
  return new Anthropic({ apiKey });
}

export interface PdfExtractionResult {
  structured_data: StructuredData;
  content_hash: string;
  pdf_base64: string;
}

/**
 * Extract structured data from a PDF using Claude Vision.
 * Accepts either a URL to download or a base64-encoded PDF string.
 */
export async function extractPdfWithClaudeVision(
  pdfInput: string,
  regulatoryBody: string,
  dataType: string,
  description: string
): Promise<PdfExtractionResult> {
  const anthropic = getAnthropicClient();

  let pdfBase64: string;
  let contentHash: string;

  // If input looks like base64, use it directly; otherwise treat as URL
  if (pdfInput.startsWith('http')) {
    const pdfResponse = await fetch(pdfInput);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfInput}`);
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();
    pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    contentHash = createHash('sha256').update(Buffer.from(pdfBuffer)).digest('hex');
  } else {
    pdfBase64 = pdfInput;
    contentHash = createHash('sha256').update(Buffer.from(pdfBase64, 'base64')).digest('hex');
  }

  const prompt = buildPdfExtractionPrompt(regulatoryBody, dataType, description);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude Vision');
  }

  let text = textBlock.text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  const structured_data = JSON.parse(text) as StructuredData;

  return { structured_data, content_hash: contentHash, pdf_base64: pdfBase64 };
}

function buildPdfExtractionPrompt(
  regulatoryBody: string,
  dataType: string,
  description: string
): string {
  const basePrompt = `You are a regulatory data extraction expert. This document is in Chinese (simplified) and is from ${regulatoryBody} (China). Document: ${description}.

Extract ALL data into structured JSON. This is a COMPLETE extraction — do not skip any entries, even if there are hundreds or thousands. Accuracy is critical as this data will be used for automated compliance checking.

IMPORTANT: Translate ingredient names, claim texts, and requirement descriptions to English while preserving the original Chinese text in an "original_text_zh" field for each entry.`;

  if (dataType === 'ingredient_regulation') {
    return `${basePrompt}

Extract every ingredient/substance entry into this format:
{
  "type": "ingredient_regulation",
  "source_document": "${description}",
  "extraction_date": "${new Date().toISOString()}",
  "entries": [
    {
      "ingredient_name": string (English translation),
      "original_text_zh": string (original Chinese name),
      "inci_name": string | null,
      "cas_number": string | null,
      "status": "banned" | "restricted" | "permitted" | "permitted_with_limits",
      "product_categories": string[],
      "max_concentration_pct": number | null,
      "max_daily_dose_mg": number | null,
      "conditions": string[],
      "required_warnings": string[],
      "regulation_reference": string (e.g., "GB 2760", "IECIC 2021"),
      "annex_reference": string | null,
      "effective_date": string | null
    }
  ],
  "total_entries_extracted": number
}

IMPORTANT:
- Extract EVERY row/entry from tables. Do not summarise or skip entries.
- Preserve exact concentration limits, CAS numbers, and reference numbers.
- For GB 2760 tables, note the food category codes and max usage levels.
- If a cell is empty or not applicable, use null.
- Return valid JSON only, no markdown fences or commentary.`;
  }

  return `${basePrompt}

This document contains multiple types of regulatory data. Extract each type separately:

{
  "type": "mixed",
  "source_document": "${description}",
  "extraction_date": "${new Date().toISOString()}",
  "ingredient_regulations": [...],
  "labelling_requirements": [...],
  "claims_rules": [...],
  "import_requirements": [...]
}

For each entry, include an "original_text_zh" field with the original Chinese text alongside the English translation.

IMPORTANT:
- Extract EVERY row/entry from tables. Do not summarise or skip entries.
- Preserve exact concentration limits, CAS numbers, and reference numbers.
- For GB standard format tables, note the food/product category codes.
- If a cell is empty or not applicable, use null.
- Return valid JSON only, no markdown fences or commentary.`;
}
