import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { importRequirementsSchema, getImportRequirements } from '../services/import-requirements';
import { ServiceError } from '../services/errors';

export function registerGetImportRequirements(server: McpServer) {
  server.tool(
    'get_import_requirements',
    'Get import requirements for products entering India',
    importRequirementsSchema.shape,
    async (args) => {
      try {
        const result = await getImportRequirements(args);
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
