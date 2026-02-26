-- Case-insensitive synonym and common name search for ingredients
CREATE OR REPLACE FUNCTION find_ingredient_by_synonym(
  search_term TEXT
)
RETURNS TABLE(
  id UUID,
  canonical_name TEXT,
  inci_name TEXT,
  cas_number TEXT,
  synonyms TEXT[],
  common_names TEXT[],
  category TEXT
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
    i.category
  FROM ingredients i
  WHERE EXISTS (
    SELECT 1 FROM unnest(i.synonyms) s WHERE lower(s) = lower(search_term)
  )
  OR EXISTS (
    SELECT 1 FROM unnest(i.common_names) cn WHERE lower(cn) = lower(search_term)
  )
  LIMIT 5;
$$;
