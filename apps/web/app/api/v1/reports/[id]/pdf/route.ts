import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createServiceClient } from '@sieve/db';
import type {
  ComplianceFinding,
  ComplianceStatistics,
  Severity,
  FindingCategory,
} from '@sieve/shared';
import { ReportPdf } from './report-pdf';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: product } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const { data: checks } = await supabase
      .from('compliance_checks')
      .select('*')
      .eq('product_id', id)
      .order('checked_at', { ascending: false })
      .limit(1);

    const check = checks?.[0];
    if (!check) {
      return NextResponse.json(
        { error: 'No compliance check found for this product' },
        { status: 404 },
      );
    }

    // Get findings: prefer check JSON, fall back to compliance_findings table
    const checkFindings = (check.findings ?? []) as unknown as ComplianceFinding[];
    let findings: ComplianceFinding[];

    if (checkFindings.length > 0) {
      findings = checkFindings;
    } else {
      const { data: dbFindings } = await supabase
        .from('compliance_findings')
        .select('*')
        .eq('check_id', check.id)
        .order('created_at', { ascending: true });

      findings = (dbFindings ?? []).map((f) => ({
        severity: f.severity as Severity,
        blocking: f.blocking,
        category: f.category as FindingCategory,
        title: f.title,
        description: f.description,
        ingredient_name: f.ingredient_name,
        regulation_reference: f.regulation_reference,
        regulatory_body: f.regulatory_body,
        recommended_action: f.recommended_action,
        evidence_required: f.evidence_required,
      }));
    }

    const buffer = await renderToBuffer(
      ReportPdf({
        productName: product.name,
        jurisdiction: check.jurisdiction,
        overallStatus: check.overall_status,
        complianceScore: check.compliance_score,
        findings,
        statistics: check.statistics as ComplianceStatistics | null,
        checkedAt: check.checked_at,
        dataVersion: check.data_version,
      }),
    );

    const filename = `sieve-report-${product.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
