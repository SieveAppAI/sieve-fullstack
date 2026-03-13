/**
 * Seed script — runs the SG regulatory sources seed and inserts test ingredients.
 * Usage: npx tsx scripts/seed.ts
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  );
  console.error('Run: source .env.local (or export the vars manually)');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

// ─── SG Regulatory Sources ───────────────────────────────────────────────────

interface SeedSource {
  url: string;
  title: string;
  regulatory_body: string;
  content_type: 'html' | 'pdf';
  ingestion_tier: 'exa' | 'browser_use';
  browser_use_task?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
}

const SG_SEED_SOURCES: SeedSource[] = [
  // SFA — Food
  { url: 'https://www.sfa.gov.sg/legislation/food-safety-and-security-act', title: 'Food Safety and Security Act', regulatory_body: 'SFA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.sfa.gov.sg/legislation', title: 'SFA Legislation Overview', regulatory_body: 'SFA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.sfa.gov.sg/regulatory-standards-frameworks-guidelines/food-safety-regulatory-limits/overview-on-food-safety-regulatory-limits', title: 'Food Safety Regulatory Limits Overview', regulatory_body: 'SFA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.sfa.gov.sg/food-information/nutrition-labelling', title: 'Nutrition Labelling Guidelines', regulatory_body: 'SFA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.sfa.gov.sg/food-information/nutrition-health-claims', title: 'Health & Nutrition Claims', regulatory_body: 'SFA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.sfa.gov.sg/nutri-grade', title: 'Nutri-Grade Labelling', regulatory_body: 'SFA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.sfa.gov.sg/food-information/food-allergy-and-intolerance', title: 'Allergen Requirements', regulatory_body: 'SFA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.sfa.gov.sg/food-businesses/imports', title: 'Import Requirements', regulatory_body: 'SFA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.sfa.gov.sg/food-businesses/novel-food', title: 'Novel Foods', regulatory_body: 'SFA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.sfa.gov.sg/public-consultation', title: 'Public Consultations', regulatory_body: 'SFA', content_type: 'html', ingestion_tier: 'exa', frequency: 'daily' },
  { url: 'https://www.sfa.gov.sg/bringing-food-for-private-consumption-from-overseas/list-of-food---food-products-allowed', title: 'Allowed Food & Food Products', regulatory_body: 'SFA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  // HSA — Cosmetics
  { url: 'https://www.hsa.gov.sg/cosmetic-products/overview', title: 'Cosmetic Products Overview', regulatory_body: 'HSA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.hsa.gov.sg/cosmetic-products/asean-cosmetic-directive', title: 'ASEAN Cosmetic Directive', regulatory_body: 'HSA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.hsa.gov.sg/cosmetic-products/notification', title: 'Cosmetic Notification', regulatory_body: 'HSA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.hsa.gov.sg/cosmetic-products/gmp', title: 'GMP Certification', regulatory_body: 'HSA', content_type: 'html', ingestion_tier: 'exa', frequency: 'monthly' },
  // HSA — Health Supplements
  { url: 'https://www.hsa.gov.sg/health-supplements', title: 'Health Supplements Overview', regulatory_body: 'HSA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.hsa.gov.sg/vns', title: 'Voluntary Notification Scheme', regulatory_body: 'HSA', content_type: 'html', ingestion_tier: 'browser_use', browser_use_task: 'Navigate to HSA VNS. Extract positive ingredient list A-Z.', frequency: 'monthly' },
  { url: 'https://www.hsa.gov.sg/health-supplements/claims', title: 'Health Supplement Claims', regulatory_body: 'HSA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  { url: 'https://www.hsa.gov.sg/health-supplements/list-of-notified-hs-and-tm', title: 'List of Notified HS and TM', regulatory_body: 'HSA', content_type: 'html', ingestion_tier: 'exa', frequency: 'weekly' },
  // SSO — Legislation
  { url: 'https://sso.agc.gov.sg/Act/SFA1973', title: 'Sale of Food Act (Cap 283)', regulatory_body: 'SSO', content_type: 'html', ingestion_tier: 'browser_use', browser_use_task: 'Extract Sale of Food Act full text.', frequency: 'monthly' },
  { url: 'https://sso.agc.gov.sg/SL/SFA1973-RG1', title: 'Food Regulations', regulatory_body: 'SSO', content_type: 'html', ingestion_tier: 'browser_use', browser_use_task: 'Extract Food Regulations full text.', frequency: 'monthly' },
  { url: 'https://sso.agc.gov.sg/Acts-Supp/27-2024', title: 'Food Safety and Security Act 2024', regulatory_body: 'SSO', content_type: 'html', ingestion_tier: 'browser_use', browser_use_task: 'Extract FSSA 2024 full text.', frequency: 'monthly' },
  { url: 'https://sso.agc.gov.sg/Act/HPA2007', title: 'Health Products Act', regulatory_body: 'SSO', content_type: 'html', ingestion_tier: 'browser_use', browser_use_task: 'Extract Health Products Act full text.', frequency: 'monthly' },
  { url: 'https://sso.agc.gov.sg/SL/HPA2007-S321-2007', title: 'Cosmetic Product Regulations', regulatory_body: 'SSO', content_type: 'html', ingestion_tier: 'browser_use', browser_use_task: 'Extract cosmetic product regulations full text.', frequency: 'monthly' },
];

// ─── Test Ingredients ────────────────────────────────────────────────────────

const TEST_INGREDIENTS = [
  // Common food additives
  { canonical_name: 'Sodium Benzoate', inci_name: 'Sodium Benzoate', cas_number: '532-32-1', category: 'preservative', synonyms: ['E211', 'benzoate of soda'], common_names: ['sodium benzoate'] },
  { canonical_name: 'Potassium Sorbate', inci_name: 'Potassium Sorbate', cas_number: '24634-61-5', category: 'preservative', synonyms: ['E202', 'sorbic acid potassium salt'], common_names: ['potassium sorbate'] },
  { canonical_name: 'Citric Acid', inci_name: 'Citric Acid', cas_number: '77-92-9', category: 'acidity_regulator', synonyms: ['E330', '2-hydroxypropane-1,2,3-tricarboxylic acid'], common_names: ['citric acid', 'lemon acid'] },
  { canonical_name: 'Ascorbic Acid', inci_name: 'Ascorbic Acid', cas_number: '50-81-7', category: 'antioxidant', synonyms: ['E300', 'Vitamin C', 'L-ascorbic acid'], common_names: ['vitamin C'] },
  { canonical_name: 'Tartrazine', inci_name: 'Tartrazine', cas_number: '1934-21-0', category: 'colour', synonyms: ['E102', 'FD&C Yellow No. 5', 'CI 19140'], common_names: ['yellow 5'] },
  { canonical_name: 'Sunset Yellow FCF', inci_name: 'Sunset Yellow FCF', cas_number: '2783-94-0', category: 'colour', synonyms: ['E110', 'FD&C Yellow No. 6', 'CI 15985'], common_names: ['yellow 6', 'orange yellow S'] },
  { canonical_name: 'Aspartame', inci_name: 'Aspartame', cas_number: '22839-47-0', category: 'sweetener', synonyms: ['E951', 'NutraSweet', 'Equal'], common_names: ['aspartame'] },
  { canonical_name: 'Monosodium Glutamate', inci_name: 'Monosodium Glutamate', cas_number: '142-47-2', category: 'flavour_enhancer', synonyms: ['E621', 'MSG', 'sodium glutamate'], common_names: ['MSG', 'Ajinomoto'] },
  { canonical_name: 'Carrageenan', inci_name: 'Carrageenan', cas_number: '9000-07-1', category: 'thickener', synonyms: ['E407', 'Irish moss extract'], common_names: ['carrageenan'] },
  { canonical_name: 'Xanthan Gum', inci_name: 'Xanthan Gum', cas_number: '11138-66-2', category: 'thickener', synonyms: ['E415'], common_names: ['xanthan gum'] },

  // Cosmetics ingredients
  { canonical_name: 'Retinol', inci_name: 'Retinol', cas_number: '68-26-8', category: 'active', synonyms: ['Vitamin A1', 'all-trans-Retinol'], common_names: ['retinol', 'vitamin A'] },
  { canonical_name: 'Salicylic Acid', inci_name: 'Salicylic Acid', cas_number: '69-72-7', category: 'active', synonyms: ['BHA', '2-hydroxybenzoic acid'], common_names: ['salicylic acid'] },
  { canonical_name: 'Hydroquinone', inci_name: 'Hydroquinone', cas_number: '123-31-9', category: 'active', synonyms: ['1,4-dihydroxybenzene', 'benzene-1,4-diol'], common_names: ['hydroquinone'] },
  { canonical_name: 'Titanium Dioxide', inci_name: 'Titanium Dioxide', cas_number: '13463-67-7', category: 'uv_filter', synonyms: ['E171', 'CI 77891', 'TiO2'], common_names: ['titanium dioxide'] },
  { canonical_name: 'Parabens (Methylparaben)', inci_name: 'Methylparaben', cas_number: '99-76-3', category: 'preservative', synonyms: ['E218', 'methyl 4-hydroxybenzoate'], common_names: ['methylparaben'] },

  // Health supplements
  { canonical_name: 'Coenzyme Q10', inci_name: 'Ubiquinone', cas_number: '303-98-0', category: 'supplement', synonyms: ['CoQ10', 'ubidecarenone'], common_names: ['CoQ10'] },
  { canonical_name: 'Glucosamine', inci_name: 'Glucosamine', cas_number: '3416-24-8', category: 'supplement', synonyms: ['2-amino-2-deoxy-D-glucose', 'D-glucosamine'], common_names: ['glucosamine'] },
  { canonical_name: 'Fish Oil (Omega-3)', inci_name: null, cas_number: '8016-13-5', category: 'supplement', synonyms: ['omega-3 fatty acids', 'EPA', 'DHA'], common_names: ['fish oil', 'omega-3'] },
  { canonical_name: 'Melatonin', inci_name: 'Melatonin', cas_number: '73-31-4', category: 'supplement', synonyms: ['N-acetyl-5-methoxytryptamine'], common_names: ['melatonin'] },
  { canonical_name: 'Ephedrine', inci_name: 'Ephedrine', cas_number: '299-42-3', category: 'stimulant', synonyms: ['ma huang', 'ephedra alkaloid'], common_names: ['ephedrine', 'ma huang'] },
];

// ─── Test Ingredient Regulations (SG) ────────────────────────────────────────

interface TestRegulation {
  ingredient_name: string;
  status: string;
  regulatory_body: string;
  product_categories: string[];
  max_concentration_pct?: number;
  conditions?: Record<string, unknown>;
  required_warnings?: string[];
  regulation_reference?: string;
}

const TEST_REGULATIONS: TestRegulation[] = [
  { ingredient_name: 'Sodium Benzoate', status: 'permitted_with_limits', regulatory_body: 'SFA', product_categories: ['food', 'beverages'], max_concentration_pct: 0.1, regulation_reference: 'Food Regulations, Sixth Schedule' },
  { ingredient_name: 'Tartrazine', status: 'permitted_with_limits', regulatory_body: 'SFA', product_categories: ['food', 'beverages'], max_concentration_pct: 0.03, required_warnings: ['May have an adverse effect on activity and attention in children'], regulation_reference: 'Food Regulations, Eighth Schedule' },
  { ingredient_name: 'Aspartame', status: 'permitted_with_limits', regulatory_body: 'SFA', product_categories: ['food', 'beverages'], max_concentration_pct: 1.0, required_warnings: ['Contains a source of phenylalanine'], regulation_reference: 'Food Regulations, Sixth Schedule' },
  { ingredient_name: 'Hydroquinone', status: 'banned', regulatory_body: 'HSA', product_categories: ['cosmetics'], regulation_reference: 'ASEAN Cosmetic Directive, Annex II' },
  { ingredient_name: 'Retinol', status: 'permitted_with_limits', regulatory_body: 'HSA', product_categories: ['cosmetics'], max_concentration_pct: 0.3, conditions: { conditions_of_use: ['Not for use in lip products', 'Not for use in products for children under 3'] }, regulation_reference: 'ASEAN Cosmetic Directive, Annex III' },
  { ingredient_name: 'Salicylic Acid', status: 'permitted_with_limits', regulatory_body: 'HSA', product_categories: ['cosmetics'], max_concentration_pct: 2.0, required_warnings: ['Not to be used for children under 3 years of age'], regulation_reference: 'ASEAN Cosmetic Directive, Annex III' },
  { ingredient_name: 'Parabens (Methylparaben)', status: 'permitted_with_limits', regulatory_body: 'HSA', product_categories: ['cosmetics'], max_concentration_pct: 0.4, regulation_reference: 'ASEAN Cosmetic Directive, Annex VI' },
  { ingredient_name: 'Ephedrine', status: 'banned', regulatory_body: 'HSA', product_categories: ['health_supplements'], regulation_reference: 'Health Products (Prohibited Substances) Regulations' },
  { ingredient_name: 'Melatonin', status: 'restricted', regulatory_body: 'HSA', product_categories: ['health_supplements'], conditions: { conditions_of_use: ['Requires pharmacist supervision', 'Not for long-term use'] }, regulation_reference: 'HSA Guidelines on Health Supplements' },
  { ingredient_name: 'Coenzyme Q10', status: 'permitted', regulatory_body: 'HSA', product_categories: ['health_supplements'], regulation_reference: 'VNS Positive List' },
  { ingredient_name: 'Glucosamine', status: 'permitted', regulatory_body: 'HSA', product_categories: ['health_supplements'], regulation_reference: 'VNS Positive List' },
  { ingredient_name: 'Fish Oil (Omega-3)', status: 'permitted', regulatory_body: 'HSA', product_categories: ['health_supplements'], regulation_reference: 'VNS Positive List' },
  { canonical_name: 'Citric Acid', ingredient_name: 'Citric Acid', status: 'permitted', regulatory_body: 'SFA', product_categories: ['food', 'beverages'], regulation_reference: 'Food Regulations, Generally Recognized as Safe' },
  { ingredient_name: 'Monosodium Glutamate', status: 'permitted', regulatory_body: 'SFA', product_categories: ['food'], regulation_reference: 'Food Regulations' },
];

// ─── Run Seed ────────────────────────────────────────────────────────────────

async function seedSources() {
  console.log('Seeding SG regulatory sources...');
  let count = 0;

  for (const source of SG_SEED_SOURCES) {
    const { data: existing } = await supabase
      .from('regulatory_sources')
      .select('id')
      .eq('url', source.url)
      .single();

    if (existing) {
      console.log(`  [skip] ${source.title}`);
      continue;
    }

    const { data: inserted, error } = await supabase
      .from('regulatory_sources')
      .insert({
        url: source.url,
        title: source.title,
        domain: new URL(source.url).hostname,
        regulatory_body: source.regulatory_body,
        jurisdiction: 'SG',
        content_type: source.content_type,
        ingestion_tier: source.ingestion_tier,
        browser_use_task: source.browser_use_task ?? null,
        scrape_status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  [fail] ${source.title}:`, error.message);
      continue;
    }

    if (inserted) {
      await supabase.from('scrape_schedule').insert({
        source_id: inserted.id,
        frequency: source.frequency,
        enabled: true,
      });
      console.log(`  [seed] ${source.title}`);
      count++;
    }
  }

  console.log(`Seeded ${count} regulatory sources.\n`);
}

async function seedIngredients() {
  console.log('Seeding test ingredients...');
  let count = 0;

  for (const ing of TEST_INGREDIENTS) {
    const { error } = await supabase.from('ingredients').upsert(
      {
        canonical_name: ing.canonical_name,
        inci_name: ing.inci_name,
        cas_number: ing.cas_number,
        category: ing.category,
        synonyms: ing.synonyms,
        common_names: ing.common_names,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'canonical_name' }
    );

    if (error) {
      console.error(`  [fail] ${ing.canonical_name}:`, error.message);
    } else {
      console.log(`  [seed] ${ing.canonical_name}`);
      count++;
    }
  }

  console.log(`Seeded ${count} ingredients.\n`);
}

async function seedRegulations() {
  console.log('Seeding SG ingredient regulations...');
  let count = 0;

  for (const reg of TEST_REGULATIONS) {
    // Find the ingredient
    const { data: ingredient } = await supabase
      .from('ingredients')
      .select('id')
      .eq('canonical_name', reg.ingredient_name)
      .single();

    if (!ingredient) {
      console.error(`  [skip] ${reg.ingredient_name}: ingredient not found`);
      continue;
    }

    const { error } = await supabase.from('ingredient_regulations').upsert(
      {
        ingredient_id: ingredient.id,
        jurisdiction: 'SG',
        regulatory_body: reg.regulatory_body,
        status: reg.status,
        product_categories: reg.product_categories,
        max_concentration_pct: reg.max_concentration_pct ?? null,
        conditions: (reg.conditions ?? {}) as Record<string, unknown>,
        required_warnings: reg.required_warnings ?? [],
        regulation_reference: reg.regulation_reference ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'ingredient_id,jurisdiction,regulatory_body' }
    );

    if (error) {
      console.error(`  [fail] ${reg.ingredient_name}:`, error.message);
    } else {
      console.log(`  [seed] ${reg.ingredient_name} (${reg.status})`);
      count++;
    }
  }

  console.log(`Seeded ${count} regulations.\n`);
}

async function main() {
  console.log('=== Taama Database Seed ===\n');
  await seedSources();
  await seedIngredients();
  await seedRegulations();
  console.log('=== Seed complete ===');
}

main().catch(console.error);
