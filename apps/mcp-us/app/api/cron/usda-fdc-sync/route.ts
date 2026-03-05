import { NextRequest, NextResponse } from 'next/server';
import { ingestUsdaFdcNutrients } from '@/src/ingestion/usda-fdc';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await ingestUsdaFdcNutrients({ mode: 'full', maxRecords: 5000 });

  return NextResponse.json({ result });
}
