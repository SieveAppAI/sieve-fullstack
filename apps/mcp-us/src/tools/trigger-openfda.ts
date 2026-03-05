import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  triggerOpenFdaSchema,
  triggerOpenFda,
} from '../services/trigger-openfda';

export function registerTriggerOpenFda(server: McpServer) {
  server.tool(
    'trigger_openfda_ingestion',
    'Ingest structured regulatory data from the OpenFDA API (substances with CFR codes and food enforcement recalls)',
    triggerOpenFdaSchema.shape,
    async (args) => {
      const result = await triggerOpenFda(args);

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
