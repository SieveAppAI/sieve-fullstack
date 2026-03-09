import { NextRequest, NextResponse } from 'next/server';
import { runBulkDownload } from '@/src/ingestion/ingest-bulk';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await runBulkDownload();
  return NextResponse.json({ status: 'ok', results });
}
