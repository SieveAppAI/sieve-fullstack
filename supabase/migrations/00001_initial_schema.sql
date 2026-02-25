-- ================================================================
-- EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================================
-- REGULATORY DATA TABLES
-- ================================================================

CREATE TABLE regulatory_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  domain TEXT NOT NULL,
  regulatory_body TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'SG',
  content_type TEXT,
  ingestion_tier TEXT NOT NULL DEFAULT 'exa',
  browser_use_task TEXT,
  content_text TEXT,
  content_hash TEXT,
  structured_data JSONB,
  pdf_page_count INTEGER,
  pdf_storage_path TEXT,
  extraction_model TEXT,
  extraction_confidence DECIMAL,
  last_scraped_at TIMESTAMPTZ,
  last_changed_at TIMESTAMPTZ,
  scrape_status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE regulatory_source_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES regulatory_sources(id),
  old_content_hash TEXT,
  new_content_hash TEXT,
  change_summary TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

-- ================================================================
-- INGREDIENT DATABASE
-- ================================================================

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL UNIQUE,
  inci_name TEXT,
  cas_number TEXT,
  synonyms TEXT[] DEFAULT '{}',
  common_names TEXT[] DEFAULT '{}',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ingredients_canonical ON ingredients(canonical_name);
CREATE INDEX idx_ingredients_inci ON ingredients(inci_name);
CREATE INDEX idx_ingredients_cas ON ingredients(cas_number);
CREATE INDEX idx_ingredients_synonyms ON ingredients USING GIN(synonyms);
CREATE INDEX idx_ingredients_trgm_canonical ON ingredients USING GIN(canonical_name gin_trgm_ops);
CREATE INDEX idx_ingredients_trgm_inci ON ingredients USING GIN(inci_name gin_trgm_ops);

CREATE TABLE ingredient_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID REFERENCES ingredients(id),
  jurisdiction TEXT NOT NULL,
  regulatory_body TEXT NOT NULL,
  status TEXT NOT NULL,
  product_categories TEXT[] DEFAULT '{}',
  product_subcategories TEXT[] DEFAULT '{}',
  max_concentration_pct DECIMAL,
  max_daily_dose_mg DECIMAL,
  conditions JSONB DEFAULT '{}',
  required_warnings TEXT[] DEFAULT '{}',
  regulation_reference TEXT,
  annex_reference TEXT,
  effective_date DATE,
  source_id UUID REFERENCES regulatory_sources(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ing_reg_jurisdiction ON ingredient_regulations(jurisdiction);
CREATE INDEX idx_ing_reg_status ON ingredient_regulations(status);
CREATE INDEX idx_ing_reg_ingredient ON ingredient_regulations(ingredient_id);

-- ================================================================
-- LABELLING REQUIREMENTS
-- ================================================================

CREATE TABLE labelling_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  regulatory_body TEXT NOT NULL,
  product_category TEXT NOT NULL,
  element TEXT NOT NULL,
  mandatory BOOLEAN DEFAULT true,
  description TEXT,
  format_rules JSONB,
  language_requirements TEXT[] DEFAULT '{}',
  exemptions JSONB DEFAULT '{}',
  regulation_reference TEXT,
  source_id UUID REFERENCES regulatory_sources(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- CLAIMS DATABASE
-- ================================================================

CREATE TABLE claims_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  regulatory_body TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  status TEXT NOT NULL,
  product_categories TEXT[] DEFAULT '{}',
  conditions JSONB,
  regulation_reference TEXT,
  source_id UUID REFERENCES regulatory_sources(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- ALLERGEN DATABASE
-- ================================================================

CREATE TABLE allergens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  allergen_name TEXT NOT NULL,
  allergen_group TEXT,
  sub_allergens TEXT[] DEFAULT '{}',
  declaration_threshold TEXT,
  regulation_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- IMPORT REQUIREMENTS
-- ================================================================

CREATE TABLE import_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  product_category TEXT NOT NULL,
  requirement TEXT NOT NULL,
  requirement_type TEXT,
  regulatory_body TEXT,
  documents_required TEXT[] DEFAULT '{}',
  special_conditions JSONB,
  regulation_reference TEXT,
  source_id UUID REFERENCES regulatory_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- PRODUCT & COMPLIANCE TABLES
-- ================================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  team_id UUID,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  formulation JSONB,
  claims TEXT[] DEFAULT '{}',
  nutrition_info JSONB,
  label_info JSONB,
  artwork_urls TEXT[] DEFAULT '{}',
  target_markets TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  jurisdiction TEXT NOT NULL,
  overall_status TEXT NOT NULL,
  compliance_score DECIMAL,
  readiness_score DECIMAL,
  findings JSONB NOT NULL,
  statistics JSONB,
  report_pdf_url TEXT,
  data_version TEXT,
  checked_at TIMESTAMPTZ DEFAULT now(),
  checked_by UUID REFERENCES auth.users(id)
);

CREATE TABLE compliance_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES compliance_checks(id),
  severity TEXT NOT NULL,
  blocking BOOLEAN DEFAULT false,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  ingredient_name TEXT,
  regulation_reference TEXT,
  regulatory_body TEXT,
  recommended_action TEXT,
  evidence_required TEXT,
  status TEXT DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- AUDIT LOG
-- ================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- VECTOR EMBEDDINGS (pgvector)
-- ================================================================

CREATE TABLE regulatory_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES regulatory_sources(id),
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER,
  embedding vector(1024),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reg_embeddings ON regulatory_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ================================================================
-- SCRAPE SCHEDULING
-- ================================================================

CREATE TABLE scrape_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES regulatory_sources(id),
  frequency TEXT NOT NULL,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- DATABASE FUNCTIONS
-- ================================================================

-- Fuzzy match ingredients using pg_trgm trigram similarity
CREATE OR REPLACE FUNCTION fuzzy_match_ingredient(
  search_term TEXT,
  similarity_threshold FLOAT DEFAULT 0.3,
  result_limit INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  canonical_name TEXT,
  inci_name TEXT,
  cas_number TEXT,
  synonyms TEXT[],
  common_names TEXT[],
  category TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    i.id,
    i.canonical_name,
    i.inci_name,
    i.cas_number,
    i.synonyms,
    i.common_names,
    i.category,
    GREATEST(
      similarity(lower(i.canonical_name), lower(search_term)),
      COALESCE(similarity(lower(i.inci_name), lower(search_term)), 0)
    ) AS similarity
  FROM ingredients i
  WHERE
    similarity(lower(i.canonical_name), lower(search_term)) > similarity_threshold
    OR COALESCE(similarity(lower(i.inci_name), lower(search_term)), 0) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT result_limit;
$$;

-- Full-text + trigram search for ingredients
CREATE OR REPLACE FUNCTION search_ingredients(
  search_term TEXT,
  result_limit INT DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  canonical_name TEXT,
  inci_name TEXT,
  cas_number TEXT,
  category TEXT,
  synonyms TEXT[],
  common_names TEXT[],
  relevance FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    i.id,
    i.canonical_name,
    i.inci_name,
    i.cas_number,
    i.category,
    i.synonyms,
    i.common_names,
    GREATEST(
      similarity(lower(i.canonical_name), lower(search_term)),
      COALESCE(similarity(lower(i.inci_name), lower(search_term)), 0),
      CASE WHEN lower(i.canonical_name) = lower(search_term) THEN 1.0
           WHEN lower(i.canonical_name) LIKE '%' || lower(search_term) || '%' THEN 0.8
           ELSE 0.0
      END
    ) AS relevance
  FROM ingredients i
  WHERE
    lower(i.canonical_name) LIKE '%' || lower(search_term) || '%'
    OR lower(COALESCE(i.inci_name, '')) LIKE '%' || lower(search_term) || '%'
    OR lower(COALESCE(i.cas_number, '')) = lower(search_term)
    OR similarity(lower(i.canonical_name), lower(search_term)) > 0.2
    OR COALESCE(similarity(lower(i.inci_name), lower(search_term)), 0) > 0.2
    OR search_term = ANY(SELECT lower(unnest(i.synonyms)))
    OR search_term = ANY(SELECT lower(unnest(i.common_names)))
  ORDER BY relevance DESC
  LIMIT result_limit;
$$;
