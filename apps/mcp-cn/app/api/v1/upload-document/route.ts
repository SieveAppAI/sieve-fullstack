import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/src/lib/auth';
import { extractPdfWithClaudeVision } from '@/src/ingestion/extract-pdf';
import { storeStructuredData, storeRegulatoryPage } from '@/src/ingestion/store';
import { createHash } from 'crypto';
import type { RegulatoryBody } from '@sieve/shared';

export const maxDuration = 300;

export async function POST(request: Request) {
  const authError = authenticateApiKey(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sourceUrl = formData.get('source_url') as string | null;
    const regulatoryBody = formData.get('regulatory_body') as string | null;
    const documentType = formData.get('document_type') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (!regulatoryBody) {
      return NextResponse.json({ error: 'regulatory_body is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentHash = createHash('sha256').update(buffer).digest('hex');

    // Store as a regulatory source entry
    await storeRegulatoryPage({
      url: sourceUrl ?? `upload://${file.name}`,
      title: description ?? file.name,
      content_text: `[Uploaded document: ${file.name}]`,
      published_date: null,
      domain: 'upload',
      regulatory_body: regulatoryBody as RegulatoryBody,
      content_type: 'pdf',
      scraped_at: new Date().toISOString(),
      content_hash: contentHash,
    });

    // Extract with Claude Vision
    const pdfBase64 = buffer.toString('base64');
    const result = await extractPdfWithClaudeVision(
      pdfBase64,
      regulatoryBody,
      documentType ?? 'mixed',
      description ?? file.name,
    );

    // Store structured data
    await storeStructuredData(
      sourceUrl ?? `upload://${file.name}`,
      result.structured_data,
    );

    return NextResponse.json({
      status: 'ok',
      file_name: file.name,
      content_hash: contentHash,
      structured_type: result.structured_data.type,
      entries_count:
        result.structured_data.entries?.length ??
        result.structured_data.ingredient_regulations?.length ??
        0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
