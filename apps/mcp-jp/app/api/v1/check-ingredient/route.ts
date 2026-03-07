import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/src/lib/auth';
import { checkIngredientSchema, checkIngredient } from '@/src/services/check-ingredient';
import { ServiceError } from '@/src/services/errors';

export async function POST(request: Request) {
  const authError = authenticateApiKey(request);
  if (authError) return authError;

  const body = await request.json();
  const parsed = checkIngredientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const result = await checkIngredient(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof ServiceError ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
