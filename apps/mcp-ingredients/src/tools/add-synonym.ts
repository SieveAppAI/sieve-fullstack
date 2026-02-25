import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@sieve/db';

export function registerAddSynonym(server: McpServer) {
  server.tool(
    'add_synonym',
    'Add a new synonym to an existing ingredient',
    {
      canonical_name: z
        .string()
        .describe('Canonical ingredient name to add synonym to'),
      new_synonym: z.string().describe('New synonym to add'),
    },
    async ({ canonical_name, new_synonym }) => {
      const supabase = createServiceClient();

      const { data: ingredient, error: findError } = await supabase
        .from('ingredients')
        .select('id, synonyms')
        .ilike('canonical_name', canonical_name.trim())
        .limit(1)
        .single();

      if (findError || !ingredient) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: `Ingredient "${canonical_name}" not found`,
              }),
            },
          ],
          isError: true,
        };
      }

      const existingSynonyms: string[] = ingredient.synonyms ?? [];
      const normalizedNew = new_synonym.trim().toLowerCase();

      if (existingSynonyms.some((s) => s.toLowerCase() === normalizedNew)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                message: `Synonym "${new_synonym}" already exists`,
              }),
            },
          ],
        };
      }

      const { error: updateError } = await supabase
        .from('ingredients')
        .update({
          synonyms: [...existingSynonyms, new_synonym.trim()],
          updated_at: new Date().toISOString(),
        })
        .eq('id', ingredient.id);

      if (updateError) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: updateError.message }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              message: `Added synonym "${new_synonym}" to "${canonical_name}"`,
            }),
          },
        ],
      };
    }
  );
}
