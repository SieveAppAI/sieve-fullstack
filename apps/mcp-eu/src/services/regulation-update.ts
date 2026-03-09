import { z } from 'zod';
import { createServiceClient } from '@sieve/db';
import { ServiceError } from './errors';

export const regulationUpdateSchema = z.object({
  since: z.string().optional().describe('ISO date to get changes since'),
});

export type RegulationUpdateArgs = z.infer<typeof regulationUpdateSchema>;

export async function getRegulationUpdate(args: RegulationUpdateArgs) {
  const { since } = args;
  const supabase = createServiceClient();

  let query = supabase
    .from('regulatory_source_changes')
    .select(
      `
      *,
      regulatory_sources!inner(url, regulatory_body, jurisdiction)
    `
    )
    .eq('regulatory_sources.jurisdiction', 'EU')
    .order('detected_at', { ascending: false })
    .limit(50);

  if (since) {
    query = query.gte('detected_at', since);
  }

  const { data: changes, error } = await query;

  if (error) {
    throw new ServiceError(error.message);
  }

  return {
    jurisdiction: 'EU',
    since: since ?? null,
    changes: (changes ?? []).map((c) => {
      const source = c.regulatory_sources as Record<string, unknown>;
      return {
        source_url: source?.url ?? null,
        change_summary: c.change_summary,
        detected_at: c.detected_at,
        affected_categories: [],
      };
    }),
  };
}
