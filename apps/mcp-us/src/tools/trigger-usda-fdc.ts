import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { triggerUsdaFdcSchema, triggerUsdaFdc } from '../services/trigger-usda-fdc';

export function registerTriggerUsdaFdc(server: McpServer) {
  server.tool(
    'trigger_usda_fdc_ingestion',
    'Ingest nutrient composition data from the USDA FoodData Central API for nutrition claims validation',
    triggerUsdaFdcSchema.shape,
    async (args) => {
      const result = await triggerUsdaFdc(args);

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
