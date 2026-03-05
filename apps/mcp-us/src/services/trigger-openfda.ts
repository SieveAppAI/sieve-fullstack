import { z } from 'zod';
import {
  ingestOpenFdaSubstances,
  ingestOpenFdaEnforcement,
  ingestOpenFdaCaers,
  type OpenFdaIngestionResult,
} from '../ingestion/openfda';

export const triggerOpenFdaSchema = z.object({
  mode: z
    .enum(['substances', 'enforcement', 'caers', 'both', 'all'])
    .describe('Which OpenFDA data source to ingest'),
  max_records: z
    .number()
    .optional()
    .describe('Max records to fetch (for safe test runs)'),
  days_since: z
    .number()
    .optional()
    .describe('Enforcement: fetch recalls from last N days (default 30)'),
});

export type TriggerOpenFdaArgs = z.infer<typeof triggerOpenFdaSchema>;

export async function triggerOpenFda(args: TriggerOpenFdaArgs) {
  const { mode, max_records, days_since } = args;
  const results: OpenFdaIngestionResult[] = [];

  if (mode === 'substances' || mode === 'both' || mode === 'all') {
    results.push(
      await ingestOpenFdaSubstances({ maxRecords: max_records })
    );
  }

  if (mode === 'enforcement' || mode === 'both' || mode === 'all') {
    results.push(
      await ingestOpenFdaEnforcement({
        daysSince: days_since,
        maxRecords: max_records,
      })
    );
  }

  if (mode === 'caers' || mode === 'all') {
    results.push(
      await ingestOpenFdaCaers({
        daysSince: days_since,
        maxRecords: max_records,
      })
    );
  }

  return { results };
}
