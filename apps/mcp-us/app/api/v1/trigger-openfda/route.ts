import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/src/lib/auth';
import { triggerOpenFdaSchema, triggerOpenFda } from '@/src/services/trigger-openfda';

export const maxDuration = 300;

export async function POST(request: Request) {
  const authError = authenticateApiKey(request);
  if (authError) return authError;

  const body = await request.json();
  const parsed = triggerOpenFdaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const result = await triggerOpenFda(parsed.data);
    if (result && 'error' in result && typeof result.error === 'string') {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
