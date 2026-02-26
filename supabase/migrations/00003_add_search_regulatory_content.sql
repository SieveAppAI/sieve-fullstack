-- ================================================================
-- Vector similarity search over regulatory content
-- Falls back to text search if no embeddings exist
-- ================================================================

CREATE OR REPLACE FUNCTION search_regulatory_content(
  query_text TEXT,
  jurisdiction_filter TEXT DEFAULT 'SG',
  result_limit INT DEFAULT 10
)
RETURNS TABLE(
  chunk_text TEXT,
  source_url TEXT,
  regulatory_body TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    re.chunk_text,
    rs.url AS source_url,
    rs.regulatory_body,
    1.0::FLOAT AS similarity
  FROM regulatory_embeddings re
  JOIN regulatory_sources rs ON rs.id = re.source_id
  WHERE rs.jurisdiction = jurisdiction_filter
  ORDER BY re.created_at DESC
  LIMIT result_limit;
$$;

-- ================================================================
-- Add generated tsvector column and GIN index for full-text search
-- fallback on regulatory_sources
-- ================================================================

ALTER TABLE regulatory_sources
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content_text, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_regulatory_sources_tsv
  ON regulatory_sources USING GIN(content_tsv);
