-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================
-- Enables RLS on all tables and creates policies so that:
--   - User-owned tables (products, compliance_checks, compliance_findings, audit_log)
--     restrict access to the owning user via auth.uid().
--   - Regulatory reference tables are readable by any authenticated user
--     but writable only via the service role (which bypasses RLS).
-- ================================================================

-- ================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE regulatory_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE labelling_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_source_changes ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 2. PRODUCTS — users can only access their own products
-- ================================================================

CREATE POLICY "products_select_own"
  ON products FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "products_insert_own"
  ON products FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "products_update_own"
  ON products FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "products_delete_own"
  ON products FOR DELETE
  USING (user_id = auth.uid());

-- ================================================================
-- 3. COMPLIANCE CHECKS — users see checks for their own products
-- ================================================================

CREATE POLICY "compliance_checks_select_own"
  ON compliance_checks FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "compliance_checks_insert_own"
  ON compliance_checks FOR INSERT
  WITH CHECK (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- ================================================================
-- 4. COMPLIANCE FINDINGS — users see findings for their own checks
-- ================================================================

CREATE POLICY "compliance_findings_select_own"
  ON compliance_findings FOR SELECT
  USING (
    check_id IN (
      SELECT id FROM compliance_checks
      WHERE product_id IN (
        SELECT id FROM products WHERE user_id = auth.uid()
      )
    )
  );

-- ================================================================
-- 5. AUDIT LOG — users see their own entries
-- ================================================================

CREATE POLICY "audit_log_select_own"
  ON audit_log FOR SELECT
  USING (
    user_id = auth.uid()
    OR product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "audit_log_insert_own"
  ON audit_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ================================================================
-- 6. REGULATORY DATA — public read for authenticated users
--    No INSERT/UPDATE/DELETE policies; only service role can write.
-- ================================================================

CREATE POLICY "regulatory_sources_select_authenticated"
  ON regulatory_sources FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "ingredients_select_authenticated"
  ON ingredients FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "ingredient_regulations_select_authenticated"
  ON ingredient_regulations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "labelling_requirements_select_authenticated"
  ON labelling_requirements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "claims_rules_select_authenticated"
  ON claims_rules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "import_requirements_select_authenticated"
  ON import_requirements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "allergens_select_authenticated"
  ON allergens FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "regulatory_embeddings_select_authenticated"
  ON regulatory_embeddings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "regulatory_source_changes_select_authenticated"
  ON regulatory_source_changes FOR SELECT
  USING (auth.role() = 'authenticated');
