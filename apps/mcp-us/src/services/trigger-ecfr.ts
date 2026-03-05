import { z } from 'zod';
import {
  ingestAllEcfrParts,
  ingestEcfrPart,
  type EcfrIngestionResult,
} from '../ingestion/ecfr';

export const triggerEcfrSchema = z.object({
  mode: z
    .enum(['all', 'specific'])
    .describe('Ingest all eCFR parts or a specific title/part'),
  title: z
    .number()
    .optional()
    .describe('CFR title number (required if mode is "specific")'),
  part: z
    .number()
    .optional()
    .describe('CFR part number (required if mode is "specific")'),
});

export type TriggerEcfrArgs = z.infer<typeof triggerEcfrSchema>;

export async function triggerEcfr(args: TriggerEcfrArgs) {
  const { mode, title, part } = args;

  if (mode === 'specific') {
    if (!title || !part) {
      return { error: 'title and part are required when mode is "specific"' };
    }
    const result = await ingestEcfrPart(title, part);
    return { result };
  }

  const result: EcfrIngestionResult = await ingestAllEcfrParts();
  return { result };
}
