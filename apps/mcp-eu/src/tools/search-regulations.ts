import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { searchRegulationsSchema, searchRegulations } from '../services/search-regulations';

export function registerSearchRegulations(server: McpServer) {
  server.tool(
    'search_regulations',
    'Semantic search over EU regulatory content (EC, EFSA, ECHA, EUR-Lex) using vector similarity',
    searchRegulationsSchema.shape,
    async (args) => {
      const result = await searchRegulations(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
