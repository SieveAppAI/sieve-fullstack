import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { checkIngredientSchema, checkIngredient } from '../services/check-ingredient';
import { ServiceError } from '../services/errors';

export function registerCheckIngredient(server: McpServer) {
  server.tool(
    'check_ingredient',
    'Check if an ingredient is permitted, restricted, or banned in the United States for a given product category (FDA/FTC regulations)',
    checkIngredientSchema.shape,
    async (args) => {
      try {
        const result = await checkIngredient(args);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
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
