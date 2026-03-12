export interface JurisdictionConfig {
  code: string;
  name: string;
  baseUrl: string;
  supplementCategory: string;
  categories: string[];
}

const ALL_JURISDICTIONS: JurisdictionConfig[] = [
  {
    code: 'sg',
    name: 'Singapore',
    baseUrl: 'https://sieve-mcp-sg.vercel.app',
    supplementCategory: 'health_supplements',
    categories: ['food', 'cosmetics', 'health_supplements'],
  },
  {
    code: 'eu',
    name: 'EU',
    baseUrl: 'https://sieve-mcp-eu.vercel.app',
    supplementCategory: 'supplement',
    categories: ['food', 'cosmetics', 'supplement'],
  },
  {
    code: 'us',
    name: 'US',
    baseUrl: 'https://sieve-mcp-us.vercel.app',
    supplementCategory: 'dietary_supplements',
    categories: ['food', 'cosmetics', 'dietary_supplements'],
  },
  {
    code: 'jp',
    name: 'Japan',
    baseUrl: 'https://mcp-jp.vercel.app',
    supplementCategory: 'health_supplements',
    categories: ['food', 'cosmetics', 'health_supplements'],
  },
  {
    code: 'au',
    name: 'Australia',
    baseUrl: 'https://sieve-mcp-au.vercel.app',
    supplementCategory: 'supplements',
    categories: ['food', 'cosmetics', 'supplements'],
  },
  {
    code: 'cn',
    name: 'China',
    baseUrl: 'https://sieve-mcp-cn.vercel.app',
    supplementCategory: 'health_food',
    categories: ['food', 'cosmetics', 'health_food'],
  },
  {
    code: 'in',
    name: 'India',
    baseUrl: 'https://mcp-in.vercel.app',
    supplementCategory: 'health_supplements',
    categories: ['food', 'cosmetics', 'health_supplements'],
  },
  {
    code: 'gcc',
    name: 'GCC',
    baseUrl: 'https://sieve-mcp-gcc.vercel.app',
    supplementCategory: 'health_supplements',
    categories: ['food', 'cosmetics', 'health_supplements'],
  },
];

const API_KEY = process.env.MCP_SERVER_SECRET?.trim() ?? '';

if (!API_KEY) {
  throw new Error('MCP_SERVER_SECRET env var is required to run E2E tests');
}

function getActiveJurisdictions(): JurisdictionConfig[] {
  const filter = process.env.TEST_JURISDICTIONS?.trim();
  if (!filter) return ALL_JURISDICTIONS;

  const codes = filter.split(',').map((c) => c.trim().toLowerCase());
  const filtered = ALL_JURISDICTIONS.filter((j) => codes.includes(j.code));

  if (filtered.length === 0) {
    throw new Error(
      `TEST_JURISDICTIONS="${filter}" matched no jurisdictions. Valid codes: ${ALL_JURISDICTIONS.map((j) => j.code).join(', ')}`
    );
  }
  return filtered;
}

export const jurisdictions = getActiveJurisdictions();

export async function apiGet(jurisdiction: JurisdictionConfig, path: string): Promise<Response> {
  return fetch(`${jurisdiction.baseUrl}${path}`, {
    headers: { 'x-api-key': API_KEY },
  });
}

export async function apiPost(
  jurisdiction: JurisdictionConfig,
  path: string,
  body: Record<string, unknown>
): Promise<Response> {
  return fetch(`${jurisdiction.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function unauthGet(jurisdiction: JurisdictionConfig, path: string): Promise<Response> {
  return fetch(`${jurisdiction.baseUrl}${path}`);
}

export async function unauthPost(
  jurisdiction: JurisdictionConfig,
  path: string,
  body: Record<string, unknown> = {}
): Promise<Response> {
  return fetch(`${jurisdiction.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
