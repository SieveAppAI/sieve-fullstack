import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { searchRegulationsSchema, searchRegulations } from '../services/search-regulations';

export function registerSearchRegulations(server: McpServer) {
  server.tool(
    'search_regulations',
    'Semantic search over China regulatory content (SAMR, NHC, CFSA, NMPA, GACC) using vector similarity',
    searchRegulationsSchema.shape,
    async (args) => {
      const result = await searchRegulations(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
