/**
 * Seed SG nutrition and marketing claims rules into the Taama database.
 * Based on Codex Alimentarius (CAC/GL 23-1997) which SFA follows for nutrition claims,
 * plus SFA-specific marketing claim guidelines.
 *
 * Usage: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/seed-sg-claims.ts
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

interface ClaimRule {
  claim_text: string;
  claim_type: 'nutrition_content' | 'nutrient_comparative' | 'health' | 'marketing' | 'certification' | 'therapeutic';
  status: 'permitted' | 'conditional' | 'prohibited';
  conditions: Record<string, unknown> | null;
  regulation_reference: string;
  product_categories: string[];
}

const CLAIMS_RULES: ClaimRule[] = [
  // ─── Nutrition Content Claims (conditional with thresholds) ─────────────────

  // Fat claims
  {
    claim_text: 'Low fat',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'fat', operator: '<=', value: 3, unit: 'g per 100g', description: 'Not more than 3g fat per 100g (solids) or 1.5g per 100ml (liquids)' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2; SFA Nutrition Labelling Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Fat free',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'fat', operator: '<=', value: 0.5, unit: 'g per 100g', description: 'Not more than 0.5g fat per 100g or 100ml' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2; SFA Nutrition Labelling Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: '0g Fat',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'fat', operator: '<=', value: 0.5, unit: 'g per 100g', description: 'Not more than 0.5g fat per 100g or 100ml' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2',
    product_categories: ['food', 'beverages'],
  },

  // Sugar claims
  {
    claim_text: 'Low sugar',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'sugar', operator: '<=', value: 5, unit: 'g per 100g', description: 'Not more than 5g sugars per 100g (solids) or 2.5g per 100ml (liquids)' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2; SFA Nutrition Labelling Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Sugar free',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'sugar', operator: '<=', value: 0.5, unit: 'g per 100g', description: 'Not more than 0.5g sugars per 100g or 100ml' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2; SFA Nutrition Labelling Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: '0g Sugar',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'sugar', operator: '<=', value: 0.5, unit: 'g per 100g', description: 'Not more than 0.5g sugars per 100g or 100ml' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'No added sugar',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { description: 'No sugars of any type added during processing or packing, including ingredients that contain sugars (e.g., fruit juices, honey). Must state "Not a low sugar food" if total sugars exceed 5g per 100g.' },
    regulation_reference: 'Codex CAC/GL 23-1997, Clause 8.4; SFA Nutrition Labelling Guidelines',
    product_categories: ['food', 'beverages'],
  },

  // Sodium / Salt claims
  {
    claim_text: 'Low sodium',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'sodium', operator: '<=', value: 120, unit: 'mg per 100g', description: 'Not more than 120mg sodium per 100g' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2; SFA Nutrition Labelling Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Low salt',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'sodium', operator: '<=', value: 120, unit: 'mg per 100g', description: 'Not more than 120mg sodium per 100g' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Sodium free',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'sodium', operator: '<=', value: 5, unit: 'mg per 100g', description: 'Not more than 5mg sodium per 100g' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2',
    product_categories: ['food', 'beverages'],
  },

  // Protein claims
  {
    claim_text: 'High protein',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'protein', operator: '>=', value: 10, unit: 'g per serving', description: 'Protein contributes ≥20% of energy OR ≥10g per serving' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2; SFA Nutrition Labelling Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Source of protein',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'protein', operator: '>=', value: 5, unit: 'g per serving', description: 'Protein contributes ≥10% of energy OR ≥5g per serving' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Protein per serving',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'protein', operator: '>=', value: 5, unit: 'g per serving', description: 'Quantified protein claims are conditional — must meet "source of protein" threshold (≥5g per serving) at minimum' },
    regulation_reference: 'Codex CAC/GL 23-1997, Clause 8.2; SFA Nutrition Labelling Guidelines',
    product_categories: ['food', 'beverages'],
  },

  // Fiber claims
  {
    claim_text: 'High fiber',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'fiber', operator: '>=', value: 6, unit: 'g per 100g', description: 'Not less than 6g dietary fibre per 100g or 3g per 100kcal' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2; SFA Nutrition Labelling Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Excellent source of fiber',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'fiber', operator: '>=', value: 6, unit: 'g per 100g', description: 'Not less than 6g dietary fibre per 100g or 3g per 100kcal' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Source of fiber',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'fiber', operator: '>=', value: 3, unit: 'g per 100g', description: 'Not less than 3g dietary fibre per 100g or 1.5g per 100kcal' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Good source of fiber',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'fiber', operator: '>=', value: 3, unit: 'g per 100g', description: 'Not less than 3g dietary fibre per 100g or 1.5g per 100kcal' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2',
    product_categories: ['food', 'beverages'],
  },

  // Calorie claims
  {
    claim_text: 'Low calorie',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'energy', operator: '<=', value: 40, unit: 'kcal per 100g', description: 'Not more than 40kcal per 100g (solids) or 20kcal per 100ml (liquids)' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2; SFA Nutrition Labelling Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Calorie free',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'energy', operator: '<=', value: 4, unit: 'kcal per 100g', description: 'Not more than 4kcal per 100g or 100ml' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2',
    product_categories: ['food', 'beverages'],
  },

  // Cholesterol claims
  {
    claim_text: 'Low cholesterol',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'cholesterol', operator: '<=', value: 20, unit: 'mg per 100g', description: 'Not more than 20mg cholesterol per 100g (solids) or 10mg per 100ml (liquids), and saturated fat must not exceed 1.5g per 100g' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Cholesterol free',
    claim_type: 'nutrition_content',
    status: 'conditional',
    conditions: { nutrient: 'cholesterol', operator: '<=', value: 5, unit: 'mg per 100g', description: 'Not more than 5mg cholesterol per 100g (solids) or 100ml (liquids), and saturated fat must not exceed 1.5g per 100g' },
    regulation_reference: 'Codex CAC/GL 23-1997, Table to Clause 8.2',
    product_categories: ['food', 'beverages'],
  },

  // ─── General Marketing Claims (permitted) ──────────────────────────────────

  {
    claim_text: 'Natural',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted if product does not contain artificial additives. Must be verifiable.' },
    regulation_reference: 'SFA Food Advertising Guidelines; Codex CAC/GL 1-1979',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Non-GMO',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted with third-party certification (e.g., Non-GMO Project Verified). Singapore does not mandate GMO labelling but allows voluntary claims.' },
    regulation_reference: 'SFA Food Advertising Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Non-GMO Project Verified',
    claim_type: 'certification',
    status: 'permitted',
    conditions: { description: 'Permitted — third-party certified claim. Must hold valid Non-GMO Project certification.' },
    regulation_reference: 'SFA Food Advertising Guidelines; Non-GMO Project Standard',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'No artificial colors',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted if verifiable — product must not contain any artificial/synthetic colour additives.' },
    regulation_reference: 'SFA Food Advertising Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'No artificial flavors',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted if verifiable — product must not contain any artificial/synthetic flavouring agents.' },
    regulation_reference: 'SFA Food Advertising Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'No artificial preservatives',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted if verifiable — product must not contain any artificial/synthetic preservatives.' },
    regulation_reference: 'SFA Food Advertising Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'No artificial colors, flavors, or preservatives',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted if verifiable — product must not contain any artificial/synthetic additives.' },
    regulation_reference: 'SFA Food Advertising Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Gluten free',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted — product must contain less than 20 ppm gluten (Codex Standard for gluten-free). Must be verifiable.' },
    regulation_reference: 'Codex STAN 118-1979; SFA Food Labelling Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Vegan',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted — product must not contain any animal-derived ingredients. Verifiable claim.' },
    regulation_reference: 'SFA Food Advertising Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Plant-based',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted — product must be derived primarily from plant sources. Verifiable claim.' },
    regulation_reference: 'SFA Food Advertising Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Keto-friendly',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted as general marketing claim. Not a regulated nutrition claim — no specific thresholds defined by SFA/Codex.' },
    regulation_reference: 'SFA Food Advertising Guidelines — general marketing claim',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Paleo-friendly',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted as general marketing claim. Not a regulated nutrition claim.' },
    regulation_reference: 'SFA Food Advertising Guidelines — general marketing claim',
    product_categories: ['food', 'beverages'],
  },

  // ─── Certification Claims (conditional) ────────────────────────────────────

  {
    claim_text: 'Halal',
    claim_type: 'certification',
    status: 'conditional',
    conditions: { description: 'In Singapore, Halal certification must be obtained from MUIS (Majlis Ugama Islam Singapura). Unauthorized use of Halal mark is an offence under the Administration of Muslim Law Act.' },
    regulation_reference: 'Administration of Muslim Law Act (Cap. 3); MUIS Halal Certification Conditions',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Organic',
    claim_type: 'certification',
    status: 'conditional',
    conditions: { description: 'Must be certified by an accredited organic certification body recognized by SFA. SFA recognizes certifications by USDA NOP, EU Organic, JAS, and other IFOAM-accredited bodies.' },
    regulation_reference: 'SFA Guidelines on Organic Labelling; Sale of Food Act',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Kosher',
    claim_type: 'certification',
    status: 'conditional',
    conditions: { description: 'Must hold valid Kosher certification from a recognized certifying body (e.g., OU, OK, Star-K). Verifiable claim.' },
    regulation_reference: 'SFA Food Advertising Guidelines; applicable Kosher certification body standards',
    product_categories: ['food', 'beverages'],
  },

  // ─── Marketing Puffery (permitted — subjective/non-specific) ───────────────

  {
    claim_text: 'Great for All-Day Snacking',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted — subjective marketing claim (puffery). Does not make specific health, nutrition, or performance claims.' },
    regulation_reference: 'SFA Food Advertising Guidelines — general puffery permitted',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Love Every Bite',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted — subjective marketing claim (puffery). Does not make specific health, nutrition, or performance claims.' },
    regulation_reference: 'SFA Food Advertising Guidelines — general puffery permitted',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Delicious',
    claim_type: 'marketing',
    status: 'permitted',
    conditions: { description: 'Permitted — subjective taste claim (puffery).' },
    regulation_reference: 'SFA Food Advertising Guidelines — general puffery permitted',
    product_categories: ['food', 'beverages'],
  },

  // ─── Prohibited Claims ─────────────────────────────────────────────────────

  {
    claim_text: 'Cures disease',
    claim_type: 'therapeutic',
    status: 'prohibited',
    conditions: { description: 'Therapeutic/medicinal claims are prohibited on food products in Singapore. Claims that a food can cure, treat, prevent, or mitigate any disease are not permitted.' },
    regulation_reference: 'Sale of Food Act (Cap 283), Section 16; Medicines Act; SFA Food Advertising Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Treats disease',
    claim_type: 'therapeutic',
    status: 'prohibited',
    conditions: { description: 'Therapeutic/medicinal claims are prohibited on food products. Claims that food can treat any medical condition are not permitted.' },
    regulation_reference: 'Sale of Food Act (Cap 283), Section 16; Medicines Act; SFA Food Advertising Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Prevents disease',
    claim_type: 'therapeutic',
    status: 'prohibited',
    conditions: { description: 'Disease prevention claims are prohibited on food products unless specifically approved as a health claim by SFA.' },
    regulation_reference: 'Sale of Food Act (Cap 283), Section 16; SFA Food Advertising Guidelines',
    product_categories: ['food', 'beverages'],
  },
  {
    claim_text: 'Boosts immunity',
    claim_type: 'health',
    status: 'prohibited',
    conditions: { description: 'Implied health/therapeutic claims like "boosts immunity" are prohibited on food products in Singapore unless specifically pre-approved by SFA under the health claims framework.' },
    regulation_reference: 'SFA Nutrition & Health Claims Guidelines; Sale of Food Act',
    product_categories: ['food', 'beverages'],
  },
];

async function seedClaimsRules() {
  console.log('=== Seeding SG Claims Rules ===\n');
  let seeded = 0;
  let failed = 0;

  for (const rule of CLAIMS_RULES) {
    // Use upsert with claim_text + jurisdiction + claim_type as the dedup key
    // Since there's no unique constraint on these, check for existing first
    const { data: existing } = await supabase
      .from('claims_rules')
      .select('id')
      .eq('jurisdiction', 'SG')
      .eq('claim_text', rule.claim_text)
      .eq('claim_type', rule.claim_type)
      .limit(1)
      .single();

    if (existing) {
      // Update existing rule
      const { error } = await supabase
        .from('claims_rules')
        .update({
          status: rule.status,
          conditions: rule.conditions,
          regulation_reference: rule.regulation_reference,
          product_categories: rule.product_categories,
          regulatory_body: 'SFA',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error(`  [fail] ${rule.claim_text}: ${error.message}`);
        failed++;
      } else {
        console.log(`  [update] ${rule.claim_text} (${rule.status})`);
        seeded++;
      }
    } else {
      // Insert new rule
      const { error } = await supabase.from('claims_rules').insert({
        jurisdiction: 'SG',
        regulatory_body: 'SFA',
        claim_text: rule.claim_text,
        claim_type: rule.claim_type,
        status: rule.status,
        conditions: rule.conditions,
        regulation_reference: rule.regulation_reference,
        product_categories: rule.product_categories,
      });

      if (error) {
        console.error(`  [fail] ${rule.claim_text}: ${error.message}`);
        failed++;
      } else {
        console.log(`  [seed] ${rule.claim_text} (${rule.status})`);
        seeded++;
      }
    }
  }

  console.log(`\n=== Done: ${seeded} seeded/updated, ${failed} failed (of ${CLAIMS_RULES.length} total) ===`);
}

seedClaimsRules().catch(console.error);
