import { NextRequest, NextResponse } from 'next/server';
import { ingestOpenFdaSubstances, ingestOpenFdaEnforcement, ingestOpenFdaCaers } from '@/src/ingestion/openfda';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const substanceResult = await ingestOpenFdaSubstances();
  const enforcementResult = await ingestOpenFdaEnforcement({ daysSince: 30 });
  const caersResult = await ingestOpenFdaCaers({ daysSince: 30 });

  return NextResponse.json({
    results: [substanceResult, enforcementResult, caersResult],
  });
}
