import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/src/lib/auth';
import { regulationUpdateSchema, getRegulationUpdate } from '@/src/services/regulation-update';
import { ServiceError } from '@/src/services/errors';

export async function GET(request: Request) {
  const authError = authenticateApiKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since') ?? undefined;

  const parsed = regulationUpdateSchema.safeParse({ since });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const result = await getRegulationUpdate(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof ServiceError ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
