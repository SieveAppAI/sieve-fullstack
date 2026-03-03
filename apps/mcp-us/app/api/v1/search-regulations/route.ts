import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/src/lib/auth';
import { searchRegulationsSchema, searchRegulations } from '@/src/services/search-regulations';

export async function GET(request: Request) {
  const authError = authenticateApiKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;

  const parsed = searchRegulationsSchema.safeParse({ query, limit });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const result = await searchRegulations(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
