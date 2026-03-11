/**
 * Shared structuring prompt for extracting multi-dimensional regulatory data.
 * Used by all jurisdiction MCP servers to ensure consistent extraction.
 */

export function buildStructuringPrompt(opts: {
  jurisdiction: string;
  jurisdictionLabel: string;
  url: string;
  regulatoryBody: string;
  contentText: string;
  extractionDate: string;
}): string {
  const content = opts.contentText.slice(0, 30000);

  return `You are a regulatory data extraction expert specializing in ${opts.jurisdictionLabel} food, supplement, and cosmetics regulations.

Given the following content scraped from a ${opts.jurisdictionLabel} regulatory website, extract ALL applicable structured data into the JSON format below.

CRITICAL: Most regulatory documents contain MULTIPLE types of data. You MUST extract ALL dimensions that are present — do NOT stop after finding one type. Use type "mixed" and populate every applicable array.

Source URL: ${opts.url}
Regulatory Body: ${opts.regulatoryBody}
Content:
${content}

Return a single JSON object with type "mixed" containing ALL of the following arrays that have extractable data:

{
  "type": "mixed",
  "source_document": "${opts.url}",
  "extraction_date": "${opts.extractionDate}",
  "ingredient_regulations": [{
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
  }],
  "labelling_requirements": [{
    "element": string,
    "mandatory": boolean,
    "product_categories": string[],
    "description": string,
    "format_rules": string | null,
    "exemptions": string[],
    "regulation_reference": string
  }],
  "claims_rules": [{
    "claim_text": string,
    "claim_type": "nutrition" | "health" | "therapeutic" | "marketing",
    "status": "permitted" | "prohibited" | "conditional",
    "conditions": object | null,
    "product_categories": string[],
    "regulation_reference": string
  }],
  "import_requirements": [{
    "requirement": string,
    "product_categories": string[],
    "documents_required": string[],
    "licensing_body": string,
    "regulation_reference": string
  }]
}

RULES:
1. Include EVERY array where data exists — even if only 1-2 entries for that type.
2. For labelling: extract mandatory label elements, format rules, language requirements, warning statements, panel requirements.
3. For claims: extract both permitted AND prohibited claims. Include nutrition claims (e.g., "sugar free", "low fat"), health claims, and therapeutic claims.
4. For claims with numeric thresholds (e.g., "sugar free" = ≤0.5g/100ml), encode the threshold in the "conditions" object as: {"nutrient": "sugar", "operator": "<=", "value": 0.5, "unit": "g per 100g", "description": "..."}.
5. For import: extract licensing requirements, documentation, registration needs, testing requirements.
6. Omit arrays that have zero entries (don't include empty arrays).
7. Only extract data explicitly stated in the source content.
8. Include exact regulation references where available.
9. Return valid JSON only — no markdown fences or commentary.
10. If no structured regulatory data can be extracted at all, return null.`;
}
