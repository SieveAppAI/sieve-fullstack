import { NextResponse } from 'next/server';

export function authenticateApiKey(request: Request): NextResponse | null {
  const apiKey = request.headers.get('x-api-key');
  const secret = process.env.MCP_SERVER_SECRET?.trim();

  if (!secret || apiKey !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
