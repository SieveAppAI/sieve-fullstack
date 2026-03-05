import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { triggerEcfrSchema, triggerEcfr } from '../services/trigger-ecfr';

export function registerTriggerEcfr(server: McpServer) {
  server.tool(
    'trigger_ecfr_ingestion',
    'Ingest regulatory text from the eCFR API (Title 21 CFR parts for FDA food, supplement, and cosmetics regulations)',
    triggerEcfrSchema.shape,
    async (args) => {
      const result = await triggerEcfr(args);

      if (result && 'error' in result && typeof result.error === 'string') {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          isError: true,
        };
      }

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );
}
