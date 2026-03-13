/**
 * Seed common food ingredients into the Taama database.
 * These are generally permitted base ingredients (proteins, fibers, oils, etc.)
 * that aren't in additive schedules but need to be recognized by check_ingredient.
 *
 * Usage: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/seed-common-ingredients.ts
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

interface CommonIngredient {
  canonical_name: string;
  synonyms: string[];
  common_names: string[];
  category: string;
}

interface IngredientRegulation {
  status: 'permitted';
  product_categories: string[];
  regulation_reference: string;
  regulatory_body: string;
}

const DEFAULT_REGULATION: IngredientRegulation = {
  status: 'permitted',
  product_categories: ['food', 'beverages', 'health_supplements'],
  regulation_reference: 'SFA Food Regulations — generally permitted food ingredient',
  regulatory_body: 'SFA',
};

const COMMON_INGREDIENTS: CommonIngredient[] = [
  // ─── Proteins ──────────────────────────────────────────────────────────────
  { canonical_name: 'Pea Protein', synonyms: ['Pea Protein Isolate', 'Pea Protein Concentrate', 'Pisum sativum protein'], common_names: ['Pea Protein'], category: 'protein' },
  { canonical_name: 'Whey Protein', synonyms: ['Whey Protein Isolate', 'Whey Protein Concentrate', 'WPI', 'WPC'], common_names: ['Whey Protein', 'Whey'], category: 'protein' },
  { canonical_name: 'Soy Protein', synonyms: ['Soy Protein Isolate', 'Soy Protein Concentrate', 'Soya Protein'], common_names: ['Soy Protein'], category: 'protein' },
  { canonical_name: 'Casein', synonyms: ['Sodium Caseinate', 'Calcium Caseinate', 'Micellar Casein', 'Milk Protein'], common_names: ['Casein'], category: 'protein' },
  { canonical_name: 'Egg White Powder', synonyms: ['Dried Egg White', 'Egg Albumen', 'Egg White Protein'], common_names: ['Egg White Powder'], category: 'protein' },
  { canonical_name: 'Collagen', synonyms: ['Hydrolyzed Collagen', 'Collagen Peptides', 'Collagen Hydrolysate'], common_names: ['Collagen'], category: 'protein' },
  { canonical_name: 'Rice Protein', synonyms: ['Rice Protein Isolate', 'Rice Protein Concentrate', 'Brown Rice Protein'], common_names: ['Rice Protein'], category: 'protein' },
  { canonical_name: 'Hemp Protein', synonyms: ['Hemp Seed Protein', 'Hemp Protein Powder'], common_names: ['Hemp Protein'], category: 'protein' },

  // ─── Fibers ────────────────────────────────────────────────────────────────
  { canonical_name: 'Potato Fiber', synonyms: ['Potato Fibre', 'Potato Dietary Fiber'], common_names: ['Potato Fiber'], category: 'fiber' },
  { canonical_name: 'Corn Fiber', synonyms: ['Maize Fiber', 'Soluble Corn Fiber', 'Corn Fibre'], common_names: ['Corn Fiber'], category: 'fiber' },
  { canonical_name: 'Chicory Root Fiber', synonyms: ['Inulin', 'Chicory Root Extract', 'Chicory Inulin', 'Oligofructose'], common_names: ['Chicory Root Fiber', 'Inulin'], category: 'fiber' },
  { canonical_name: 'Psyllium Husk', synonyms: ['Psyllium Husk Powder', 'Ispaghula Husk', 'Plantago ovata'], common_names: ['Psyllium Husk'], category: 'fiber' },
  { canonical_name: 'Oat Fiber', synonyms: ['Oat Fibre', 'Oat Beta-Glucan'], common_names: ['Oat Fiber'], category: 'fiber' },
  { canonical_name: 'Bamboo Fiber', synonyms: ['Bamboo Fibre', 'Bamboo Extract Fiber'], common_names: ['Bamboo Fiber'], category: 'fiber' },
  { canonical_name: 'Cellulose', synonyms: ['Microcrystalline Cellulose', 'MCC', 'Powdered Cellulose', 'E460'], common_names: ['Cellulose'], category: 'fiber' },
  { canonical_name: 'Methylcellulose', synonyms: ['E461', 'Methyl Cellulose'], common_names: ['Methylcellulose'], category: 'fiber' },

  // ─── Flours & Starches ─────────────────────────────────────────────────────
  { canonical_name: 'Tapioca Starch', synonyms: ['Tapioca Flour', 'Cassava Starch', 'Cassava Flour', 'Tapioca'], common_names: ['Tapioca Starch', 'Tapioca Flour'], category: 'flour_starch' },
  { canonical_name: 'Rice Flour', synonyms: ['White Rice Flour', 'Rice Powder'], common_names: ['Rice Flour'], category: 'flour_starch' },
  { canonical_name: 'Wheat Flour', synonyms: ['All-Purpose Flour', 'Plain Flour', 'Bread Flour', 'Cake Flour', 'Enriched Wheat Flour'], common_names: ['Wheat Flour', 'Flour'], category: 'flour_starch' },
  { canonical_name: 'Corn Starch', synonyms: ['Cornstarch', 'Maize Starch', 'Corn Flour'], common_names: ['Corn Starch', 'Cornstarch'], category: 'flour_starch' },
  { canonical_name: 'Potato Starch', synonyms: ['Potato Flour', 'Potato Starch Powder'], common_names: ['Potato Starch'], category: 'flour_starch' },
  { canonical_name: 'Arrowroot Starch', synonyms: ['Arrowroot Powder', 'Arrowroot Flour'], common_names: ['Arrowroot'], category: 'flour_starch' },
  { canonical_name: 'Modified Food Starch', synonyms: ['Modified Starch', 'Modified Corn Starch', 'Modified Tapioca Starch'], common_names: ['Modified Food Starch'], category: 'flour_starch' },
  { canonical_name: 'Almond Flour', synonyms: ['Almond Meal', 'Ground Almonds'], common_names: ['Almond Flour'], category: 'flour_starch' },
  { canonical_name: 'Coconut Flour', synonyms: ['Desiccated Coconut Flour'], common_names: ['Coconut Flour'], category: 'flour_starch' },
  { canonical_name: 'Chickpea Flour', synonyms: ['Besan', 'Gram Flour', 'Garbanzo Bean Flour'], common_names: ['Chickpea Flour', 'Besan'], category: 'flour_starch' },
  { canonical_name: 'Soy Flour', synonyms: ['Soya Flour', 'Defatted Soy Flour'], common_names: ['Soy Flour'], category: 'flour_starch' },

  // ─── Oils & Fats ───────────────────────────────────────────────────────────
  { canonical_name: 'Sunflower Oil', synonyms: ['Sunflower Seed Oil', 'Helianthus annuus oil'], common_names: ['Sunflower Oil'], category: 'oil_fat' },
  { canonical_name: 'High Oleic Sunflower Oil', synonyms: ['High Oleic Sunflower Seed Oil', 'HOSO'], common_names: ['High Oleic Sunflower Oil'], category: 'oil_fat' },
  { canonical_name: 'Coconut Oil', synonyms: ['Virgin Coconut Oil', 'VCO', 'Cocos nucifera oil', 'Refined Coconut Oil'], common_names: ['Coconut Oil'], category: 'oil_fat' },
  { canonical_name: 'Palm Oil', synonyms: ['Refined Palm Oil', 'Palm Olein', 'Elaeis guineensis oil'], common_names: ['Palm Oil'], category: 'oil_fat' },
  { canonical_name: 'Olive Oil', synonyms: ['Extra Virgin Olive Oil', 'EVOO', 'Virgin Olive Oil', 'Refined Olive Oil'], common_names: ['Olive Oil'], category: 'oil_fat' },
  { canonical_name: 'Cocoa Butter', synonyms: ['Cacao Butter', 'Theobroma cacao butter'], common_names: ['Cocoa Butter'], category: 'oil_fat' },
  { canonical_name: 'Canola Oil', synonyms: ['Rapeseed Oil', 'Refined Canola Oil'], common_names: ['Canola Oil'], category: 'oil_fat' },
  { canonical_name: 'Soybean Oil', synonyms: ['Soya Bean Oil', 'Soy Oil'], common_names: ['Soybean Oil'], category: 'oil_fat' },
  { canonical_name: 'Avocado Oil', synonyms: ['Persea americana oil', 'Refined Avocado Oil'], common_names: ['Avocado Oil'], category: 'oil_fat' },
  { canonical_name: 'Sesame Oil', synonyms: ['Toasted Sesame Oil', 'Gingelly Oil'], common_names: ['Sesame Oil'], category: 'oil_fat' },
  { canonical_name: 'MCT Oil', synonyms: ['Medium Chain Triglycerides', 'Fractionated Coconut Oil', 'C8 Oil', 'Caprylic Acid Oil'], common_names: ['MCT Oil'], category: 'oil_fat' },
  { canonical_name: 'Shea Butter', synonyms: ['Shea Nut Butter', 'Butyrospermum parkii butter'], common_names: ['Shea Butter'], category: 'oil_fat' },
  { canonical_name: 'Butter', synonyms: ['Unsalted Butter', 'Salted Butter', 'Cultured Butter'], common_names: ['Butter'], category: 'oil_fat' },
  { canonical_name: 'Ghee', synonyms: ['Clarified Butter', 'Anhydrous Milk Fat'], common_names: ['Ghee'], category: 'oil_fat' },

  // ─── Gums & Thickeners ─────────────────────────────────────────────────────
  { canonical_name: 'Guar Gum', synonyms: ['E412', 'Guar Flour', 'Cyamopsis tetragonoloba'], common_names: ['Guar Gum'], category: 'gum_thickener' },
  { canonical_name: 'Gelatin', synonyms: ['Gelatine', 'Hydrolyzed Gelatin', 'Gelatin Powder'], common_names: ['Gelatin'], category: 'gum_thickener' },
  { canonical_name: 'Pectin', synonyms: ['E440', 'Apple Pectin', 'Citrus Pectin', 'Fruit Pectin'], common_names: ['Pectin'], category: 'gum_thickener' },
  { canonical_name: 'Agar', synonyms: ['Agar-Agar', 'E406', 'Kanten'], common_names: ['Agar', 'Agar-Agar'], category: 'gum_thickener' },
  { canonical_name: 'Locust Bean Gum', synonyms: ['E410', 'Carob Bean Gum', 'Carob Gum'], common_names: ['Locust Bean Gum'], category: 'gum_thickener' },
  { canonical_name: 'Gum Arabic', synonyms: ['E414', 'Acacia Gum', 'Acacia senegal'], common_names: ['Gum Arabic'], category: 'gum_thickener' },
  { canonical_name: 'Konjac Glucomannan', synonyms: ['E425', 'Konjac Gum', 'Konjac Flour', 'Konjac'], common_names: ['Konjac'], category: 'gum_thickener' },
  { canonical_name: 'Tara Gum', synonyms: ['E417', 'Caesalpinia spinosa gum'], common_names: ['Tara Gum'], category: 'gum_thickener' },
  { canonical_name: 'Gellan Gum', synonyms: ['E418'], common_names: ['Gellan Gum'], category: 'gum_thickener' },

  // ─── Minerals & Leavening ──────────────────────────────────────────────────
  { canonical_name: 'Sea Salt', synonyms: ['Unrefined Sea Salt', 'Celtic Sea Salt', 'Fleur de Sel', 'Himalayan Pink Salt', 'Rock Salt'], common_names: ['Sea Salt', 'Salt'], category: 'mineral_leavening' },
  { canonical_name: 'Table Salt', synonyms: ['Iodized Salt', 'Sodium Chloride', 'NaCl', 'Refined Salt'], common_names: ['Table Salt', 'Salt'], category: 'mineral_leavening' },
  { canonical_name: 'Sodium Bicarbonate', synonyms: ['Baking Soda', 'Bicarbonate of Soda', 'E500'], common_names: ['Baking Soda', 'Sodium Bicarbonate'], category: 'mineral_leavening' },
  { canonical_name: 'Monocalcium Phosphate', synonyms: ['Calcium Dihydrogen Phosphate', 'E341(i)', 'MCP'], common_names: ['Monocalcium Phosphate'], category: 'mineral_leavening' },
  { canonical_name: 'Baking Powder', synonyms: ['Double Acting Baking Powder', 'Leavening Agent'], common_names: ['Baking Powder'], category: 'mineral_leavening' },
  { canonical_name: 'Cream of Tartar', synonyms: ['Potassium Bitartrate', 'E336', 'Potassium Hydrogen Tartrate'], common_names: ['Cream of Tartar'], category: 'mineral_leavening' },
  { canonical_name: 'Calcium Carbonate', synonyms: ['E170', 'Chalk', 'Limestone'], common_names: ['Calcium Carbonate'], category: 'mineral_leavening' },
  { canonical_name: 'Magnesium Stearate', synonyms: ['E470b', 'Magnesium Salt of Stearic Acid'], common_names: ['Magnesium Stearate'], category: 'mineral_leavening' },

  // ─── Flavors & Cocoa ───────────────────────────────────────────────────────
  { canonical_name: 'Natural Flavors', synonyms: ['Natural Flavouring', 'Natural Flavor', 'Natural Flavours'], common_names: ['Natural Flavors'], category: 'flavor' },
  { canonical_name: 'Vanilla Extract', synonyms: ['Pure Vanilla Extract', 'Vanilla Flavoring', 'Vanilla'], common_names: ['Vanilla Extract', 'Vanilla'], category: 'flavor' },
  { canonical_name: 'Vanillin', synonyms: ['Ethyl Vanillin', 'Synthetic Vanilla', 'Artificial Vanilla'], common_names: ['Vanillin'], category: 'flavor' },
  { canonical_name: 'Cocoa Powder', synonyms: ['Cacao Powder', 'Dutch-Process Cocoa', 'Natural Cocoa Powder', 'Alkalized Cocoa'], common_names: ['Cocoa Powder', 'Cacao Powder'], category: 'flavor' },
  { canonical_name: 'Cocoa Nibs', synonyms: ['Cacao Nibs', 'Raw Cacao Nibs'], common_names: ['Cocoa Nibs', 'Cacao Nibs'], category: 'flavor' },
  { canonical_name: 'Chocolate', synonyms: ['Dark Chocolate', 'Milk Chocolate', 'Chocolate Chips', 'Chocolate Liquor', 'Cocoa Mass'], common_names: ['Chocolate'], category: 'flavor' },
  { canonical_name: 'Cinnamon', synonyms: ['Ground Cinnamon', 'Cinnamomum verum', 'Cassia Cinnamon'], common_names: ['Cinnamon'], category: 'flavor' },
  { canonical_name: 'Turmeric', synonyms: ['Ground Turmeric', 'Curcuma longa', 'Turmeric Powder'], common_names: ['Turmeric'], category: 'flavor' },
  { canonical_name: 'Ginger', synonyms: ['Ground Ginger', 'Ginger Root', 'Ginger Powder', 'Zingiber officinale'], common_names: ['Ginger'], category: 'flavor' },
  { canonical_name: 'Matcha', synonyms: ['Matcha Powder', 'Matcha Green Tea', 'Matcha Tea Powder'], common_names: ['Matcha'], category: 'flavor' },

  // ─── Dairy ─────────────────────────────────────────────────────────────────
  { canonical_name: 'Milk', synonyms: ['Whole Milk', 'Skim Milk', 'Full Cream Milk', 'Low Fat Milk', 'Pasteurized Milk'], common_names: ['Milk'], category: 'dairy' },
  { canonical_name: 'Cream', synonyms: ['Heavy Cream', 'Whipping Cream', 'Light Cream', 'Double Cream', 'Single Cream'], common_names: ['Cream'], category: 'dairy' },
  { canonical_name: 'Cheese', synonyms: ['Cheddar Cheese', 'Mozzarella', 'Parmesan', 'Cream Cheese'], common_names: ['Cheese'], category: 'dairy' },
  { canonical_name: 'Yogurt', synonyms: ['Yoghurt', 'Greek Yogurt', 'Natural Yogurt', 'Plain Yogurt'], common_names: ['Yogurt', 'Yoghurt'], category: 'dairy' },
  { canonical_name: 'Milk Powder', synonyms: ['Skim Milk Powder', 'Whole Milk Powder', 'Nonfat Dry Milk', 'Dried Milk', 'SMP', 'WMP'], common_names: ['Milk Powder'], category: 'dairy' },
  { canonical_name: 'Condensed Milk', synonyms: ['Sweetened Condensed Milk', 'SCM'], common_names: ['Condensed Milk'], category: 'dairy' },
  { canonical_name: 'Evaporated Milk', synonyms: ['Unsweetened Condensed Milk'], common_names: ['Evaporated Milk'], category: 'dairy' },
  { canonical_name: 'Buttermilk', synonyms: ['Cultured Buttermilk', 'Buttermilk Powder'], common_names: ['Buttermilk'], category: 'dairy' },

  // ─── Grains & Seeds ────────────────────────────────────────────────────────
  { canonical_name: 'Oats', synonyms: ['Rolled Oats', 'Steel Cut Oats', 'Oat Flakes', 'Quick Oats', 'Instant Oats', 'Whole Oats'], common_names: ['Oats'], category: 'grain_seed' },
  { canonical_name: 'Chia Seeds', synonyms: ['Salvia hispanica', 'Chia Seed'], common_names: ['Chia Seeds'], category: 'grain_seed' },
  { canonical_name: 'Flax Seeds', synonyms: ['Flaxseed', 'Linseed', 'Ground Flaxseed', 'Flax Seed Meal', 'Milled Flaxseed'], common_names: ['Flax Seeds', 'Flaxseed'], category: 'grain_seed' },
  { canonical_name: 'Quinoa', synonyms: ['White Quinoa', 'Red Quinoa', 'Quinoa Flour'], common_names: ['Quinoa'], category: 'grain_seed' },
  { canonical_name: 'Brown Rice', synonyms: ['Whole Grain Brown Rice', 'Brown Rice Flour'], common_names: ['Brown Rice'], category: 'grain_seed' },
  { canonical_name: 'Sunflower Seeds', synonyms: ['Sunflower Seed Kernels', 'Hulled Sunflower Seeds'], common_names: ['Sunflower Seeds'], category: 'grain_seed' },
  { canonical_name: 'Pumpkin Seeds', synonyms: ['Pepitas', 'Pumpkin Seed Kernels'], common_names: ['Pumpkin Seeds', 'Pepitas'], category: 'grain_seed' },
  { canonical_name: 'Sesame Seeds', synonyms: ['White Sesame Seeds', 'Black Sesame Seeds', 'Toasted Sesame Seeds'], common_names: ['Sesame Seeds'], category: 'grain_seed' },
  { canonical_name: 'Hemp Seeds', synonyms: ['Hemp Hearts', 'Hulled Hemp Seeds', 'Hemp Seed'], common_names: ['Hemp Seeds'], category: 'grain_seed' },
  { canonical_name: 'Millet', synonyms: ['Pearl Millet', 'Foxtail Millet', 'Millet Flour'], common_names: ['Millet'], category: 'grain_seed' },
  { canonical_name: 'Buckwheat', synonyms: ['Buckwheat Flour', 'Buckwheat Groats', 'Soba'], common_names: ['Buckwheat'], category: 'grain_seed' },
  { canonical_name: 'Barley', synonyms: ['Pearl Barley', 'Barley Flour', 'Barley Malt'], common_names: ['Barley'], category: 'grain_seed' },

  // ─── Sugars & Sweeteners ───────────────────────────────────────────────────
  { canonical_name: 'Sugar', synonyms: ['Cane Sugar', 'Sucrose', 'White Sugar', 'Granulated Sugar', 'Refined Sugar'], common_names: ['Sugar'], category: 'sugar_sweetener' },
  { canonical_name: 'Brown Sugar', synonyms: ['Dark Brown Sugar', 'Light Brown Sugar', 'Demerara Sugar', 'Muscovado'], common_names: ['Brown Sugar'], category: 'sugar_sweetener' },
  { canonical_name: 'Honey', synonyms: ['Raw Honey', 'Manuka Honey', 'Wildflower Honey'], common_names: ['Honey'], category: 'sugar_sweetener' },
  { canonical_name: 'Maple Syrup', synonyms: ['Pure Maple Syrup', 'Grade A Maple Syrup'], common_names: ['Maple Syrup'], category: 'sugar_sweetener' },
  { canonical_name: 'Molasses', synonyms: ['Blackstrap Molasses', 'Cane Molasses'], common_names: ['Molasses'], category: 'sugar_sweetener' },
  { canonical_name: 'Coconut Sugar', synonyms: ['Coconut Palm Sugar', 'Coconut Nectar'], common_names: ['Coconut Sugar'], category: 'sugar_sweetener' },
  { canonical_name: 'Agave Syrup', synonyms: ['Agave Nectar', 'Blue Agave Syrup'], common_names: ['Agave Syrup', 'Agave Nectar'], category: 'sugar_sweetener' },
  { canonical_name: 'Dextrose', synonyms: ['D-Glucose', 'Grape Sugar', 'Corn Sugar'], common_names: ['Dextrose'], category: 'sugar_sweetener' },
  { canonical_name: 'Fructose', synonyms: ['Fruit Sugar', 'Levulose', 'D-Fructose'], common_names: ['Fructose'], category: 'sugar_sweetener' },
  { canonical_name: 'Maltodextrin', synonyms: ['Corn Maltodextrin', 'Tapioca Maltodextrin'], common_names: ['Maltodextrin'], category: 'sugar_sweetener' },
  { canonical_name: 'Erythritol', synonyms: ['E968', 'Sugar Alcohol'], common_names: ['Erythritol'], category: 'sugar_sweetener' },
  { canonical_name: 'Stevia', synonyms: ['Steviol Glycosides', 'Stevia Extract', 'Reb A', 'Rebaudioside A', 'E960'], common_names: ['Stevia'], category: 'sugar_sweetener' },
  { canonical_name: 'Monk Fruit Extract', synonyms: ['Luo Han Guo', 'Mogrosides', 'Monk Fruit Sweetener', 'Siraitia grosvenorii'], common_names: ['Monk Fruit', 'Monk Fruit Extract'], category: 'sugar_sweetener' },
  { canonical_name: 'Allulose', synonyms: ['D-Allulose', 'D-Psicose', 'Rare Sugar'], common_names: ['Allulose'], category: 'sugar_sweetener' },

  // ─── Nuts ──────────────────────────────────────────────────────────────────
  { canonical_name: 'Almonds', synonyms: ['Almond', 'Whole Almonds', 'Roasted Almonds', 'Almond Butter', 'Blanched Almonds'], common_names: ['Almonds'], category: 'nut' },
  { canonical_name: 'Cashews', synonyms: ['Cashew', 'Cashew Nuts', 'Cashew Butter', 'Roasted Cashews'], common_names: ['Cashews'], category: 'nut' },
  { canonical_name: 'Peanuts', synonyms: ['Peanut', 'Groundnut', 'Peanut Butter', 'Roasted Peanuts'], common_names: ['Peanuts'], category: 'nut' },
  { canonical_name: 'Walnuts', synonyms: ['Walnut', 'English Walnuts', 'Walnut Pieces'], common_names: ['Walnuts'], category: 'nut' },
  { canonical_name: 'Hazelnuts', synonyms: ['Hazelnut', 'Filbert', 'Hazelnut Paste'], common_names: ['Hazelnuts'], category: 'nut' },
  { canonical_name: 'Macadamia Nuts', synonyms: ['Macadamia', 'Macadamia Nut'], common_names: ['Macadamia Nuts'], category: 'nut' },
  { canonical_name: 'Pistachios', synonyms: ['Pistachio', 'Pistachio Nuts'], common_names: ['Pistachios'], category: 'nut' },
  { canonical_name: 'Pecans', synonyms: ['Pecan', 'Pecan Nuts'], common_names: ['Pecans'], category: 'nut' },

  // ─── Fruits & Vegetables (dried/powdered) ──────────────────────────────────
  { canonical_name: 'Dates', synonyms: ['Medjool Dates', 'Date Paste', 'Date Syrup', 'Dried Dates', 'Deglet Noor Dates'], common_names: ['Dates'], category: 'fruit_veg' },
  { canonical_name: 'Raisins', synonyms: ['Sultanas', 'Dried Grapes', 'Golden Raisins', 'Thompson Seedless Raisins'], common_names: ['Raisins'], category: 'fruit_veg' },
  { canonical_name: 'Cranberries', synonyms: ['Dried Cranberries', 'Craisins', 'Cranberry Powder'], common_names: ['Cranberries'], category: 'fruit_veg' },
  { canonical_name: 'Blueberries', synonyms: ['Dried Blueberries', 'Blueberry Powder', 'Freeze-Dried Blueberries'], common_names: ['Blueberries'], category: 'fruit_veg' },
  { canonical_name: 'Banana', synonyms: ['Banana Powder', 'Dried Banana', 'Banana Flakes', 'Freeze-Dried Banana'], common_names: ['Banana'], category: 'fruit_veg' },
  { canonical_name: 'Apple', synonyms: ['Apple Powder', 'Dried Apple', 'Apple Fiber', 'Apple Juice Concentrate'], common_names: ['Apple'], category: 'fruit_veg' },
  { canonical_name: 'Coconut', synonyms: ['Desiccated Coconut', 'Coconut Flakes', 'Shredded Coconut', 'Coconut Cream', 'Coconut Milk'], common_names: ['Coconut'], category: 'fruit_veg' },
  { canonical_name: 'Lemon', synonyms: ['Lemon Juice', 'Lemon Juice Concentrate', 'Lemon Zest', 'Lemon Powder'], common_names: ['Lemon'], category: 'fruit_veg' },
  { canonical_name: 'Mango', synonyms: ['Dried Mango', 'Mango Powder', 'Mango Puree', 'Freeze-Dried Mango'], common_names: ['Mango'], category: 'fruit_veg' },
  { canonical_name: 'Strawberry', synonyms: ['Dried Strawberry', 'Strawberry Powder', 'Freeze-Dried Strawberry'], common_names: ['Strawberry'], category: 'fruit_veg' },
  { canonical_name: 'Spinach', synonyms: ['Spinach Powder', 'Dried Spinach', 'Spinach Extract'], common_names: ['Spinach'], category: 'fruit_veg' },
  { canonical_name: 'Beetroot', synonyms: ['Beet Powder', 'Beetroot Powder', 'Red Beet', 'Beta vulgaris'], common_names: ['Beetroot'], category: 'fruit_veg' },
  { canonical_name: 'Spirulina', synonyms: ['Spirulina Powder', 'Blue Spirulina', 'Arthrospira platensis'], common_names: ['Spirulina'], category: 'fruit_veg' },

  // ─── Emulsifiers & Processing Aids ─────────────────────────────────────────
  { canonical_name: 'Soy Lecithin', synonyms: ['Lecithin', 'Soya Lecithin', 'E322'], common_names: ['Soy Lecithin', 'Lecithin'], category: 'emulsifier' },
  { canonical_name: 'Sunflower Lecithin', synonyms: ['E322', 'Sunflower Seed Lecithin'], common_names: ['Sunflower Lecithin'], category: 'emulsifier' },
  { canonical_name: 'Mono- and Diglycerides', synonyms: ['E471', 'Glyceryl Monostearate', 'Monoglycerides', 'Diglycerides'], common_names: ['Mono- and Diglycerides'], category: 'emulsifier' },
  { canonical_name: 'Polysorbate 80', synonyms: ['E433', 'Tween 80', 'Polyoxyethylene Sorbitan Monooleate'], common_names: ['Polysorbate 80'], category: 'emulsifier' },

  // ─── Acids & pH Regulators ─────────────────────────────────────────────────
  { canonical_name: 'Lactic Acid', synonyms: ['E270', 'L-Lactic Acid', 'DL-Lactic Acid'], common_names: ['Lactic Acid'], category: 'acid_regulator' },
  { canonical_name: 'Malic Acid', synonyms: ['E296', 'DL-Malic Acid', 'Apple Acid'], common_names: ['Malic Acid'], category: 'acid_regulator' },
  { canonical_name: 'Tartaric Acid', synonyms: ['E334', 'L-Tartaric Acid'], common_names: ['Tartaric Acid'], category: 'acid_regulator' },
  { canonical_name: 'Phosphoric Acid', synonyms: ['E338', 'Orthophosphoric Acid'], common_names: ['Phosphoric Acid'], category: 'acid_regulator' },
  { canonical_name: 'Acetic Acid', synonyms: ['E260', 'Vinegar', 'Glacial Acetic Acid'], common_names: ['Acetic Acid', 'Vinegar'], category: 'acid_regulator' },

  // ─── Vitamins & Minerals (supplements / fortification) ─────────────────────
  { canonical_name: 'Calcium', synonyms: ['Calcium Citrate', 'Calcium Carbonate', 'Calcium Phosphate', 'Tricalcium Phosphate'], common_names: ['Calcium'], category: 'vitamin_mineral' },
  { canonical_name: 'Iron', synonyms: ['Ferrous Sulfate', 'Ferrous Fumarate', 'Ferric Pyrophosphate', 'Iron Bisglycinate'], common_names: ['Iron'], category: 'vitamin_mineral' },
  { canonical_name: 'Zinc', synonyms: ['Zinc Oxide', 'Zinc Gluconate', 'Zinc Citrate', 'Zinc Picolinate'], common_names: ['Zinc'], category: 'vitamin_mineral' },
  { canonical_name: 'Potassium', synonyms: ['Potassium Chloride', 'Potassium Citrate', 'Potassium Gluconate'], common_names: ['Potassium'], category: 'vitamin_mineral' },
  { canonical_name: 'Magnesium', synonyms: ['Magnesium Citrate', 'Magnesium Oxide', 'Magnesium Glycinate', 'Magnesium Bisglycinate'], common_names: ['Magnesium'], category: 'vitamin_mineral' },
  { canonical_name: 'Vitamin D', synonyms: ['Vitamin D3', 'Cholecalciferol', 'Vitamin D2', 'Ergocalciferol'], common_names: ['Vitamin D'], category: 'vitamin_mineral' },
  { canonical_name: 'Vitamin B12', synonyms: ['Cyanocobalamin', 'Methylcobalamin', 'Cobalamin'], common_names: ['Vitamin B12', 'B12'], category: 'vitamin_mineral' },
  { canonical_name: 'Vitamin E', synonyms: ['Alpha-Tocopherol', 'Tocopherols', 'Mixed Tocopherols', 'd-Alpha-Tocopherol', 'E306'], common_names: ['Vitamin E'], category: 'vitamin_mineral' },
  { canonical_name: 'Niacin', synonyms: ['Vitamin B3', 'Nicotinamide', 'Niacinamide', 'Nicotinic Acid'], common_names: ['Niacin', 'Vitamin B3'], category: 'vitamin_mineral' },
  { canonical_name: 'Riboflavin', synonyms: ['Vitamin B2', 'E101'], common_names: ['Riboflavin', 'Vitamin B2'], category: 'vitamin_mineral' },
  { canonical_name: 'Thiamine', synonyms: ['Vitamin B1', 'Thiamine Mononitrate', 'Thiamine Hydrochloride'], common_names: ['Thiamine', 'Vitamin B1'], category: 'vitamin_mineral' },
  { canonical_name: 'Folic Acid', synonyms: ['Vitamin B9', 'Folate', 'Pteroylglutamic Acid', 'Methylfolate'], common_names: ['Folic Acid', 'Folate'], category: 'vitamin_mineral' },

  // ─── Misc Common Ingredients ───────────────────────────────────────────────
  { canonical_name: 'Water', synonyms: ['Purified Water', 'Filtered Water', 'Spring Water', 'Aqua'], common_names: ['Water'], category: 'base' },
  { canonical_name: 'Yeast', synonyms: ["Baker's Yeast", 'Active Dry Yeast', 'Instant Yeast', 'Nutritional Yeast', 'Saccharomyces cerevisiae'], common_names: ['Yeast'], category: 'base' },
  { canonical_name: 'Soy Sauce', synonyms: ['Soya Sauce', 'Shoyu', 'Tamari'], common_names: ['Soy Sauce'], category: 'condiment' },
  { canonical_name: 'Apple Cider Vinegar', synonyms: ['ACV', 'Organic Apple Cider Vinegar', 'Unfiltered Apple Cider Vinegar'], common_names: ['Apple Cider Vinegar'], category: 'condiment' },
  { canonical_name: 'Glycerin', synonyms: ['Glycerol', 'Vegetable Glycerin', 'VG', 'E422'], common_names: ['Glycerin'], category: 'humectant' },
];

async function seedCommonIngredients() {
  console.log('=== Seeding Common Food Ingredients ===\n');
  let seeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const ing of COMMON_INGREDIENTS) {
    // Upsert ingredient
    const { data: ingredient, error: ingError } = await supabase
      .from('ingredients')
      .upsert(
        {
          canonical_name: ing.canonical_name,
          synonyms: ing.synonyms,
          common_names: ing.common_names,
          category: ing.category,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'canonical_name' }
      )
      .select('id')
      .single();

    if (ingError || !ingredient) {
      console.error(`  [fail] ${ing.canonical_name}: ${ingError?.message}`);
      failed++;
      continue;
    }

    // Upsert regulation
    const { error: regError } = await supabase
      .from('ingredient_regulations')
      .upsert(
        {
          ingredient_id: ingredient.id,
          jurisdiction: 'SG',
          regulatory_body: DEFAULT_REGULATION.regulatory_body,
          status: DEFAULT_REGULATION.status,
          product_categories: DEFAULT_REGULATION.product_categories,
          regulation_reference: DEFAULT_REGULATION.regulation_reference,
          conditions: {},
          required_warnings: [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'ingredient_id,jurisdiction,regulatory_body' }
      );

    if (regError) {
      console.error(`  [fail] ${ing.canonical_name} regulation: ${regError.message}`);
      failed++;
      continue;
    }

    console.log(`  [seed] ${ing.canonical_name} (${ing.category})`);
    seeded++;
  }

  console.log(`\n=== Done: ${seeded} seeded, ${skipped} skipped, ${failed} failed (of ${COMMON_INGREDIENTS.length} total) ===`);
}

seedCommonIngredients().catch(console.error);
