export type ProductCategory = 'food' | 'supplement' | 'cosmetic';

export type IngredientStatus =
  | 'banned'
  | 'restricted'
  | 'permitted'
  | 'permitted_with_limits';

export type ClaimType =
  | 'nutrition'
  | 'health'
  | 'therapeutic'
  | 'marketing'
  | 'certification';

export type ClaimStatus = 'permitted' | 'prohibited' | 'conditional';

export interface NutritionInfo {
  energy_kcal?: number;
  protein_g?: number;
  fat_g?: number;
  saturated_fat_g?: number;
  trans_fat_g?: number;
  carbohydrate_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  dietary_fibre_g?: number;
  cholesterol_mg?: number;
  [key: string]: number | undefined;
}

export interface IngredientCheckResult {
  ingredient: string;
  jurisdiction: string;
  status: IngredientStatus;
  max_concentration_pct: number | null;
  max_daily_dose_mg: number | null;
  conditions: string[];
  required_warnings: string[];
  regulation_reference: string | null;
  annex_reference: string | null;
  product_categories: string[];
}

export interface ClaimValidation {
  claim: string;
  status: ClaimStatus;
  conditions: Record<string, unknown> | null;
  regulation_reference: string | null;
  reason: string | null;
}

export interface ClaimsValidationResult {
  jurisdiction: string;
  product_category: ProductCategory;
  results: ClaimValidation[];
}

export interface LabellingElement {
  element: string;
  mandatory: boolean;
  description: string;
  format_rules: Record<string, unknown> | null;
  language_requirements: string[];
  exemptions: Record<string, unknown>;
  regulation_reference: string | null;
}

export interface LabellingRequirementsResult {
  jurisdiction: string;
  product_category: ProductCategory;
  subcategory: string | null;
  elements: LabellingElement[];
}

export interface ImportRequirement {
  requirement: string;
  requirement_type: string | null;
  regulatory_body: string | null;
  documents_required: string[];
  special_conditions: Record<string, unknown> | null;
  regulation_reference: string | null;
}

export interface ImportRequirementsResult {
  jurisdiction: string;
  product_category: ProductCategory;
  origin_country: string | null;
  requirements: ImportRequirement[];
}

export interface RegulationChange {
  source_url: string;
  change_summary: string;
  detected_at: string;
  affected_categories: string[];
}

export interface RegulationUpdateResult {
  jurisdiction: string;
  since: string | null;
  changes: RegulationChange[];
}

export interface RegulationSearchHit {
  chunk_text: string;
  source_url: string;
  regulatory_body: string;
  similarity: number;
}

export interface RegulationSearchResult {
  jurisdiction: string;
  query: string;
  results: RegulationSearchHit[];
}

export interface ScrapeResult {
  mode: 'full' | 'change_detection' | 'specific_urls';
  urls_processed: number;
  changes_detected: number;
  errors: { url: string; error: string }[];
}

export interface IngestionStatusResult {
  jurisdiction: string;
  total_sources: number;
  last_full_scrape: string | null;
  last_change_check: string | null;
  sources_by_status: Record<string, number>;
  recent_errors: { url: string; error: string; at: string }[];
}

export interface JurisdictionMCPServer {
  check_ingredient(input: {
    ingredient: string;
    cas_number?: string;
    product_category?: ProductCategory;
    concentration_pct?: number;
  }): Promise<IngredientCheckResult>;

  validate_claims(input: {
    claims: string[];
    product_category: ProductCategory;
    nutrition_info?: NutritionInfo;
  }): Promise<ClaimsValidationResult>;

  get_labelling_requirements(input: {
    product_category: ProductCategory;
    subcategory?: string;
  }): Promise<LabellingRequirementsResult>;

  get_import_requirements(input: {
    product_category: ProductCategory;
    origin_country?: string;
  }): Promise<ImportRequirementsResult>;

  get_regulation_update(input: {
    since?: string;
    category?: string;
  }): Promise<RegulationUpdateResult>;

  search_regulations(input: {
    query: string;
    limit?: number;
  }): Promise<RegulationSearchResult>;

  trigger_scrape(input: {
    mode: 'full' | 'change_detection' | 'specific_urls';
    urls?: string[];
  }): Promise<ScrapeResult>;

  get_ingestion_status(): Promise<IngestionStatusResult>;
}
