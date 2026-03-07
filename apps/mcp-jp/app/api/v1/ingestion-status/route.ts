import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/src/lib/auth';
import { getIngestionStatus } from '@/src/services/ingestion-status';
import { ServiceError } from '@/src/services/errors';

export async function GET(request: Request) {
  const authError = authenticateApiKey(request);
  if (authError) return authError;

  try {
    const result = await getIngestionStatus();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof ServiceError ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
