import { z } from 'zod';
import {
  ingestUsdaFdcNutrients,
  type UsdaFdcIngestionResult,
} from '../ingestion/usda-fdc';

export const triggerUsdaFdcSchema = z.object({
  mode: z
    .enum(['full', 'search'])
    .describe('Full paginated ingestion or targeted search'),
  query: z
    .string()
    .optional()
    .describe('Search query (required if mode is "search")'),
  max_records: z
    .number()
    .optional()
    .describe('Max records to fetch (default 1000)'),
});

export type TriggerUsdaFdcArgs = z.infer<typeof triggerUsdaFdcSchema>;

export async function triggerUsdaFdc(args: TriggerUsdaFdcArgs) {
  const { mode, query, max_records } = args;

  if (mode === 'search' && !query) {
    return { error: 'query is required when mode is "search"' };
  }

  const result: UsdaFdcIngestionResult = await ingestUsdaFdcNutrients({
    mode,
    query,
    maxRecords: max_records,
  });

  return { result };
}
