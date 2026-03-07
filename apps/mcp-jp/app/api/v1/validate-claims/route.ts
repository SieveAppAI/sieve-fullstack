import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/src/lib/auth';
import { validateClaimsSchema, validateClaims } from '@/src/services/validate-claims';

export async function POST(request: Request) {
  const authError = authenticateApiKey(request);
  if (authError) return authError;

  const body = await request.json();
  const parsed = validateClaimsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const result = await validateClaims(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
