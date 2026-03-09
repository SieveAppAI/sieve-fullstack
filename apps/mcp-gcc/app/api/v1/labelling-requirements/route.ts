import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/src/lib/auth';
import { labellingRequirementsSchema, getLabellingRequirements } from '@/src/services/labelling-requirements';
import { ServiceError } from '@/src/services/errors';

export async function GET(request: Request) {
  const authError = authenticateApiKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const product_category = searchParams.get('product_category');

  const parsed = labellingRequirementsSchema.safeParse({ product_category });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const result = await getLabellingRequirements(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof ServiceError ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
