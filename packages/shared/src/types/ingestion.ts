export type RegulatoryBody = 'SFA' | 'HSA' | 'NEA' | 'SSO' | 'FDA' | 'FTC' | 'USDA' | 'CIR' | 'OTHER';
export type ContentType = 'html' | 'pdf';
export type IngestionTier = 'exa' | 'browser_use' | 'manual';
export type ScrapeStatus = 'pending' | 'scraped' | 'structured' | 'error';

export interface RegulatoryPage {
  url: string;
  title: string;
  content_text: string;
  published_date: string | null;
  domain: string;
  regulatory_body: RegulatoryBody;
  content_type: ContentType;
  scraped_at: string;
  content_hash: string;
}

export interface StructuredIngredientRegulation {
  ingredient_name: string;
  inci_name: string | null;
  cas_number: string | null;
  status: 'banned' | 'restricted' | 'permitted' | 'permitted_with_limits';
  product_categories: string[];
  max_concentration_pct: number | null;
  max_daily_dose_mg: number | null;
  conditions: string[];
  required_warnings: string[];
  regulation_reference: string;
  annex_reference: string | null;
  effective_date: string | null;
}

export interface StructuredLabellingRequirement {
  element: string;
  mandatory: boolean;
  product_categories: string[];
  description: string;
  format_rules: string | null;
  exemptions: string[];
  regulation_reference: string;
}

export interface StructuredClaimsRule {
  claim_text: string;
  claim_type: 'nutrition' | 'health' | 'therapeutic' | 'marketing';
  status: 'permitted' | 'prohibited' | 'conditional';
  conditions: Record<string, unknown> | null;
  product_categories: string[];
  regulation_reference: string;
}

export interface StructuredImportRequirement {
  requirement: string;
  product_categories: string[];
  documents_required: string[];
  licensing_body: string;
  regulation_reference: string;
}

export type StructuredDataType =
  | 'ingredient_regulation'
  | 'labelling_requirement'
  | 'claims_rule'
  | 'import_requirement'
  | 'mixed';

export interface StructuredData {
  type: StructuredDataType;
  source_document: string;
  extraction_date: string;
  entries?: StructuredIngredientRegulation[];
  ingredient_regulations?: StructuredIngredientRegulation[];
  labelling_requirements?: StructuredLabellingRequirement[];
  claims_rules?: StructuredClaimsRule[];
  import_requirements?: StructuredImportRequirement[];
  total_entries_extracted?: number;
}
