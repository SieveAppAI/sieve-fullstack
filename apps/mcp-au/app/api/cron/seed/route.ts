import { NextRequest, NextResponse } from 'next/server';
import { seedAUNZSources } from '@/src/ingestion/seed';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await seedAUNZSources();
  return NextResponse.json(result);
}
