import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/src/lib/auth';
import { parseExcelData } from '@/src/ingestion/parse-excel';
import * as XLSX from 'xlsx';

export const maxDuration = 300;

const VALID_SOURCE_TYPES = ['eafus', 'gras_notices', 'ndi_notifications', 'prop65_chemicals'] as const;

export async function POST(request: Request) {
  const authError = authenticateApiKey(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sourceType = formData.get('source_type') as string | null;
    const regulatoryBody = formData.get('regulatory_body') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (!sourceType || !VALID_SOURCE_TYPES.includes(sourceType as typeof VALID_SOURCE_TYPES[number])) {
      return NextResponse.json(
        { error: `source_type must be one of: ${VALID_SOURCE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: 'No sheets found in Excel file' }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]!);

    const result = await parseExcelData(
      rows,
      sourceType as typeof VALID_SOURCE_TYPES[number],
      regulatoryBody ?? undefined
    );

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
