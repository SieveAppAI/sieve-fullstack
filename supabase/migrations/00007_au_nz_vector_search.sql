-- ================================================================
-- Update search_regulatory_content RPC to handle AU_NZ jurisdiction
-- AU_NZ expands to match rows with jurisdiction IN ('AU', 'NZ', 'AU_NZ')
-- Backward-compatible: SG/US pass their code and hit the ELSE branch
-- ================================================================

CREATE OR REPLACE FUNCTION search_regulatory_content(
  query_embedding vector(1024),
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
    (1 - (re.embedding <=> query_embedding))::FLOAT AS similarity
  FROM regulatory_embeddings re
  JOIN regulatory_sources rs ON rs.id = re.source_id
  WHERE CASE
    WHEN jurisdiction_filter = 'AU_NZ' THEN rs.jurisdiction IN ('AU', 'NZ', 'AU_NZ')
    ELSE rs.jurisdiction = jurisdiction_filter
  END
    AND re.embedding IS NOT NULL
  ORDER BY re.embedding <=> query_embedding
  LIMIT result_limit;
$$;
