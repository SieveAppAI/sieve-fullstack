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

export async function extractPdfWithClaudeVision(
  pdfUrl: string,
  regulatoryBody: string,
  dataType: string,
  description: string
): Promise<PdfExtractionResult> {
  const anthropic = getAnthropicClient();

  // Download PDF
  const pdfResponse = await fetch(pdfUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfUrl}`);
  }

  const pdfBuffer = await pdfResponse.arrayBuffer();
  const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
  const contentHash = createHash('sha256')
    .update(Buffer.from(pdfBuffer))
    .digest('hex');

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

  const structured_data = JSON.parse(textBlock.text) as StructuredData;

  return { structured_data, content_hash: contentHash, pdf_base64: pdfBase64 };
}

function buildPdfExtractionPrompt(
  regulatoryBody: string,
  dataType: string,
  description: string
): string {
  const basePrompt = `You are a regulatory data extraction expert. This PDF is from ${regulatoryBody} (Australia/New Zealand). Document: ${description}.

Extract ALL data into structured JSON. This is a COMPLETE extraction — do not skip any entries, even if there are hundreds. Accuracy is critical as this data will be used for automated compliance checking.`;

  if (dataType === 'ingredient_regulation') {
    return `${basePrompt}

Extract every ingredient/substance entry into this format:
{
  "type": "ingredient_regulation",
  "source_document": "${description}",
  "extraction_date": "${new Date().toISOString()}",
  "entries": [
    {
      "ingredient_name": string,
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
    }
  ],
  "total_entries_extracted": number
}

IMPORTANT:
- Extract EVERY row/entry from tables. Do not summarise or skip entries.
- Preserve exact concentration limits, CAS numbers, and reference numbers.
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

IMPORTANT:
- Extract EVERY row/entry from tables. Do not summarise or skip entries.
- Preserve exact concentration limits, CAS numbers, and reference numbers.
- If a cell is empty or not applicable, use null.
- Return valid JSON only, no markdown fences or commentary.`;
}
