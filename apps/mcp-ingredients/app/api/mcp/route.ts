import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerResolveIngredients } from '@/src/tools/resolve-ingredients';
import { registerSearchIngredient } from '@/src/tools/search-ingredient';
import { registerAddSynonym } from '@/src/tools/add-synonym';

export const maxDuration = 60;

function createServer() {
  const server = new McpServer({
    name: 'taama-ingredients',
    version: '0.1.0',
  });

  registerResolveIngredients(server);
  registerSearchIngredient(server);
  registerAddSynonym(server);

  return server;
}

async function handleMCP(request: Request): Promise<Response> {
  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function POST(request: Request) {
  return handleMCP(request);
}

export async function GET(request: Request) {
  return handleMCP(request);
}

export async function DELETE(request: Request) {
  return handleMCP(request);
}
