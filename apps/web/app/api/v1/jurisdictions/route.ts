import { NextResponse } from 'next/server';
import { JURISDICTIONS } from '@sieve/shared';

export async function GET() {
  return NextResponse.json({ jurisdictions: JURISDICTIONS });
}
