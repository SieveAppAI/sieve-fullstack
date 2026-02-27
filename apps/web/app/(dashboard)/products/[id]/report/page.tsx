import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServer } from '@sieve/db/server';
import type {
  OverallStatus,
  Severity,
  FindingCategory,
  ComplianceFinding,
  ComplianceStatistics,
} from '@sieve/shared';
import { StatusBadge, SeverityBadge } from '@/app/components/status-badge';

export const dynamic = 'force-dynamic';

async function getReport(productId: string) {
  const supabase = await createSupabaseServer();

  const { data: product } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', productId)
    .single();

  if (!product) return null;

  const { data: checks } = await supabase
    .from('compliance_checks')
    .select('*')
    .eq('product_id', productId)
    .order('checked_at', { ascending: false })
    .limit(1);

  const check = checks?.[0];
  if (!check) return null;

  // Also fetch normalized findings from compliance_findings table
  const { data: dbFindings } = await supabase
    .from('compliance_findings')
    .select('*')
    .eq('check_id', check.id)
    .order('created_at', { ascending: true });

  return { product, check, dbFindings: dbFindings ?? [] };
}

const categoryLabels: Record<FindingCategory, string> = {
  banned_ingredient: 'Banned Ingredients',
  restricted_ingredient: 'Restricted Ingredients',
  labelling: 'Labelling',
  claims: 'Claims',
  allergen: 'Allergens',
  import: 'Import Requirements',
  registration: 'Registration',
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getReport(id);

  if (!data) notFound();

  const { product, check, dbFindings } = data;
  const statistics = check.statistics as ComplianceStatistics | null;

  // Use findings from the check JSON, fall back to normalized DB findings
  const checkFindings = (check.findings ?? []) as unknown as ComplianceFinding[];
  const findings: ComplianceFinding[] =
    checkFindings.length > 0
      ? checkFindings
      : dbFindings.map((f) => ({
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

  // Group findings by category
  const grouped = new Map<FindingCategory, ComplianceFinding[]>();
  for (const finding of findings) {
    const cat = finding.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(finding);
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/products/${product.id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to Product
        </Link>
      </div>

      {/* Report Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Compliance Report
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {product.name} &mdash; {check.jurisdiction}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Overall Status</p>
          <div className="mt-2">
            <StatusBadge status={check.overall_status as OverallStatus} />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Compliance Score</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {check.compliance_score != null ? `${check.compliance_score}%` : '-'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Findings</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {findings.length}
          </p>
          {statistics && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {statistics.critical > 0 && (
                <span className="text-red-600">
                  {statistics.critical} critical
                </span>
              )}
              {statistics.major > 0 && (
                <span className="text-orange-600">
                  {statistics.major} major
                </span>
              )}
              {statistics.minor > 0 && (
                <span className="text-yellow-600">
                  {statistics.minor} minor
                </span>
              )}
              {statistics.info > 0 && (
                <span className="text-blue-600">{statistics.info} info</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Findings grouped by category */}
      {findings.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">
            No findings for this compliance check.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([category, catFindings]) => (
            <section
              key={category}
              className="rounded-lg border border-gray-200 bg-white"
            >
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-900">
                  {categoryLabels[category] ?? category}
                </h2>
                <p className="text-xs text-gray-400">
                  {catFindings.length} finding
                  {catFindings.length !== 1 && 's'}
                </p>
              </div>

              <ul className="divide-y divide-gray-100">
                {catFindings.map((finding, i) => (
                  <li key={i} className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <SeverityBadge severity={finding.severity} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">
                          {finding.title}
                        </p>
                        {finding.description && (
                          <p className="mt-1 text-sm text-gray-600">
                            {finding.description}
                          </p>
                        )}
                        {finding.regulation_reference && (
                          <p className="mt-1 text-xs text-gray-400">
                            Ref: {finding.regulation_reference}
                          </p>
                        )}
                        {finding.recommended_action && (
                          <div className="mt-2 rounded-md bg-gray-50 p-3">
                            <p className="text-xs font-medium text-gray-500">
                              Recommended Action
                            </p>
                            <p className="mt-0.5 text-sm text-gray-700">
                              {finding.recommended_action}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-400">
        Report generated {new Date(check.checked_at).toLocaleString()}
        {check.data_version && <> &middot; Data version: {check.data_version}</>}
      </div>
    </div>
  );
}
