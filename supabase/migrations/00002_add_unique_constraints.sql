-- Unique constraints needed for upsert operations

-- ingredient_regulations: one regulation per ingredient per jurisdiction per regulatory body
ALTER TABLE ingredient_regulations
  ADD CONSTRAINT uq_ingredient_regulations
  UNIQUE (ingredient_id, jurisdiction, regulatory_body);

-- labelling_requirements: one element per jurisdiction per product category
ALTER TABLE labelling_requirements
  ADD CONSTRAINT uq_labelling_requirements
  UNIQUE (jurisdiction, product_category, element);

-- claims_rules: one rule per jurisdiction per claim text per type
ALTER TABLE claims_rules
  ADD CONSTRAINT uq_claims_rules
  UNIQUE (jurisdiction, claim_text, claim_type);

-- import_requirements: one requirement per jurisdiction per product category per requirement text
ALTER TABLE import_requirements
  ADD CONSTRAINT uq_import_requirements
  UNIQUE (jurisdiction, product_category, requirement);
