const BASE_URL = (process.env.TEST_BASE_URL || 'http://localhost:3003').replace(/\/$/, '');
const API_KEY = process.env.MCP_SERVER_SECRET?.trim() ?? '';
const CRON_SECRET = process.env.CRON_SECRET?.trim() ?? '';

if (!API_KEY) {
  throw new Error('MCP_SERVER_SECRET env var is required to run E2E tests');
}

export { BASE_URL, API_KEY, CRON_SECRET };

export async function apiGet(path: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    headers: { 'x-api-key': API_KEY },
  });
}

export async function apiPost(
  path: string,
  body: Record<string, unknown>
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function publicGet(path: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`);
}

export async function unauthGet(path: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`);
}

export async function unauthPost(
  path: string,
  body: Record<string, unknown> = {}
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function cronGet(
  path: string,
  bearer?: string
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (bearer !== undefined) {
    headers['Authorization'] = `Bearer ${bearer}`;
  }
  return fetch(`${BASE_URL}${path}`, { headers });
}
