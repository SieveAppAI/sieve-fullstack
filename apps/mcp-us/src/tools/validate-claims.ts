import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { validateClaimsSchema, validateClaims } from '../services/validate-claims';

export function registerValidateClaims(server: McpServer) {
  server.tool(
    'validate_claims',
    'Validate product claims against US FDA and FTC regulations',
    validateClaimsSchema.shape,
    async (args) => {
      const result = await validateClaims(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
