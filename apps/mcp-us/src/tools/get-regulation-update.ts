import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { regulationUpdateSchema, getRegulationUpdate } from '../services/regulation-update';
import { ServiceError } from '../services/errors';

export function registerGetRegulationUpdate(server: McpServer) {
  server.tool(
    'get_regulation_update',
    'Get recent regulatory changes detected in US FDA and FTC regulations',
    regulationUpdateSchema.shape,
    async (args) => {
      try {
        const result = await getRegulationUpdate(args);
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
