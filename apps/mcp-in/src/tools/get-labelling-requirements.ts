import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { labellingRequirementsSchema, getLabellingRequirements } from '../services/labelling-requirements';
import { ServiceError } from '../services/errors';

export function registerGetLabellingRequirements(server: McpServer) {
  server.tool(
    'get_labelling_requirements',
    'Get mandatory and optional labelling requirements for products in India',
    labellingRequirementsSchema.shape,
    async (args) => {
      try {
        const result = await getLabellingRequirements(args);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        const message = e instanceof ServiceError ? e.message : 'Internal error';
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    }
  );
}
