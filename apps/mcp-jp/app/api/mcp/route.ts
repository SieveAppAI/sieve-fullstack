import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerCheckIngredient } from '@/src/tools/check-ingredient';
import { registerValidateClaims } from '@/src/tools/validate-claims';
import { registerGetLabellingRequirements } from '@/src/tools/get-labelling-requirements';
import { registerGetImportRequirements } from '@/src/tools/get-import-requirements';
import { registerGetRegulationUpdate } from '@/src/tools/get-regulation-update';
import { registerSearchRegulations } from '@/src/tools/search-regulations';
import { registerTriggerScrape } from '@/src/tools/trigger-scrape';
import { registerGetIngestionStatus } from '@/src/tools/get-ingestion-status';

export const maxDuration = 300;

function createServer() {
  const server = new McpServer({
    name: 'taama-jp',
    version: '0.1.0',
  });

  registerCheckIngredient(server);
  registerValidateClaims(server);
  registerGetLabellingRequirements(server);
  registerGetImportRequirements(server);
  registerGetRegulationUpdate(server);
  registerSearchRegulations(server);
  registerTriggerScrape(server);
  registerGetIngestionStatus(server);

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
