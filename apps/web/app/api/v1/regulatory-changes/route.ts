import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@sieve/db';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100);
    const since = searchParams.get('since');

    let query = supabase
      .from('regulatory_source_changes')
      .select('id, source_id, change_summary, detected_at, processed, old_content_hash, new_content_hash, regulatory_sources(title, url, regulatory_body)')
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (since) {
      query = query.gte('detected_at', since);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ changes: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
