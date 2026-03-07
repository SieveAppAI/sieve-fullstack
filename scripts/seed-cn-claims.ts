/**
 * Seed China's 24 permitted health function claims into the claims_rules table.
 *
 * These are the only health claims allowed for "Blue Hat" registered health food products
 * in China, as defined by SAMR (formerly CFDA/SFDA).
 *
 * Run: npx tsx scripts/seed-cn-claims.ts
 */
import { createServiceClient } from '@sieve/db';

const CN_HEALTH_CLAIMS = [
  { en: 'Enhances immunity', zh: '增强免疫力' },
  { en: 'Assists in lowering blood lipids', zh: '辅助降血脂' },
  { en: 'Assists in lowering blood glucose', zh: '辅助降血糖' },
  { en: 'Antioxidant', zh: '抗氧化' },
  { en: 'Assists in improving memory', zh: '辅助改善记忆' },
  { en: 'Relieves visual fatigue', zh: '缓解视疲劳' },
  { en: 'Promotes lead excretion', zh: '促进排铅' },
  { en: 'Clears throat', zh: '清咽' },
  { en: 'Assists in lowering blood pressure', zh: '辅助降血压' },
  { en: 'Aids sleep', zh: '改善睡眠' },
  { en: 'Promotes lactation', zh: '促进泌乳' },
  { en: 'Relieves physical fatigue', zh: '缓解体力疲劳' },
  { en: 'Improves hypoxia tolerance', zh: '提高缺氧耐受力' },
  { en: 'Assists in protection against radiation hazards', zh: '辅助防护放射性危害' },
  { en: 'Supports weight management', zh: '减肥' },
  { en: 'Promotes growth and development', zh: '促进生长发育' },
  { en: 'Supplements calcium', zh: '增加骨密度' },
  { en: 'Improves nutritional anaemia', zh: '改善营养性贫血' },
  { en: 'Assists in protection against chemical liver injury', zh: '辅助保护化学性肝损伤' },
  { en: 'Removes acne', zh: '祛痤疮' },
  { en: 'Removes chloasma', zh: '祛黄褐斑' },
  { en: 'Improves skin moisture', zh: '改善皮肤水份' },
  { en: 'Improves skin oil content', zh: '改善皮肤油份' },
  { en: 'Regulates intestinal flora', zh: '调节肠道菌群' },
  { en: 'Promotes digestion', zh: '促进消化' },
  { en: 'Supports bowel regularity', zh: '通便' },
  { en: 'Protects gastric mucosa', zh: '对胃粘膜有辅助保护功能' },
];

async function main() {
  const supabase = createServiceClient();
  let inserted = 0;
  let skipped = 0;

  for (const claim of CN_HEALTH_CLAIMS) {
    const { error } = await supabase.from('claims_rules').upsert(
      {
        jurisdiction: 'CN',
        regulatory_body: 'SAMR',
        claim_text: claim.en,
        claim_type: 'health',
        status: 'permitted',
        product_categories: ['health_food'],
        conditions: {
          requires_blue_hat: true,
          original_text_zh: claim.zh,
        },
        regulation_reference: 'SAMR Permitted Health Function Claims for Health Food',
      },
      { onConflict: 'jurisdiction,claim_text,claim_type' }
    );

    if (error) {
      console.error(`Failed to insert claim "${claim.en}":`, error.message);
    } else {
      inserted++;
    }
  }

  console.log(`Done. Inserted/updated: ${inserted}, Skipped: ${skipped}`);
}

main().catch(console.error);
