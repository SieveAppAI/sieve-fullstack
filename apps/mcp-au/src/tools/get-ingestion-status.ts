import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getIngestionStatus } from '../services/ingestion-status';
import { ServiceError } from '../services/errors';

export function registerGetIngestionStatus(server: McpServer) {
  server.tool(
    'get_ingestion_status',
    'Get the status of the Australia and New Zealand regulatory data ingestion pipeline',
    {},
    async () => {
      try {
        const result = await getIngestionStatus();
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
