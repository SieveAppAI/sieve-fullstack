import { createServiceClient, type Json } from '@sieve/db';

export function logAudit(
  action: string,
  productId: string | null,
  details?: Record<string, unknown>,
) {
  try {
    const supabase = createServiceClient();

    void supabase
      .from('audit_log')
      .insert({
        action,
        product_id: productId,
        user_id: null,
        details: (details as Json) ?? null,
      })
      .then(({ error }) => {
        if (error) console.error('Audit log failed:', error.message);
      });
  } catch {
    // Never break primary operations
  }
}
