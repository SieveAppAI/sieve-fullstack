import { NextRequest, NextResponse } from 'next/server';
import { ingestAllEcfrParts } from '@/src/ingestion/ecfr';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await ingestAllEcfrParts();

  return NextResponse.json({ result });
}
