import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { checkIngredientSchema, checkIngredient } from '../services/check-ingredient';
import { ServiceError } from '../services/errors';

export function registerCheckIngredient(server: McpServer) {
  server.tool(
    'check_ingredient',
    'Check if an ingredient is permitted, restricted, or banned in Japan for a given product category',
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
