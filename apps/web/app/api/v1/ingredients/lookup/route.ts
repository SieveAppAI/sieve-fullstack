import { NextRequest, NextResponse } from 'next/server';

const MCP_INGREDIENTS_SERVER_URL =
  process.env.MCP_INGREDIENTS_SERVER_URL?.trim() ??
  'https://sieve-mcp-ingredients.vercel.app/api/mcp';

async function callMcpTool(
  serverUrl: string,
  toolName: string,
  args: Record<string, unknown>,
) {
  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `MCP server responded with ${response.status}: ${await response.text()}`,
    );
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter: q' },
        { status: 400 },
      );
    }

    const result = await callMcpTool(
      MCP_INGREDIENTS_SERVER_URL,
      'search_ingredient',
      { query },
    );

    // MCP result content is in result.result.content
    const content = result?.result?.content;
    if (content?.[0]?.type === 'text') {
      const ingredients = JSON.parse(content[0].text);
      return NextResponse.json({ ingredients });
    }

    return NextResponse.json({ ingredients: [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
