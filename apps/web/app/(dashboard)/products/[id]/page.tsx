import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServer } from '@sieve/db/server';
import type { OverallStatus, ComplianceFinding, ComplianceStatistics } from '@sieve/shared';
import { StatusBadge, SeverityBadge } from '@/app/components/status-badge';
import { RunCheckButton } from './run-check-button';

export const dynamic = 'force-dynamic';

async function getProduct(id: string) {
  const supabase = await createSupabaseServer();

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !product) return null;

  const { data: checks } = await supabase
    .from('compliance_checks')
    .select('*')
    .eq('product_id', id)
    .order('checked_at', { ascending: false })
    .limit(1);

  return { product, latestCheck: checks?.[0] ?? null };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProduct(id);

  if (!data) notFound();

  const { product, latestCheck } = data;

  // Extract ingredients from formulation JSON
  const formulation = product.formulation as
    | { ingredients?: { name: string; percentage?: number }[] }
    | null;
  const ingredients = formulation?.ingredients ?? [];

  const findings = (latestCheck?.findings ?? []) as unknown as ComplianceFinding[];
  const statistics = latestCheck?.statistics as ComplianceStatistics | null;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Product Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            <span className="capitalize">{product.category}</span>
            {product.subcategory && (
              <span> / {product.subcategory}</span>
            )}
          </p>
        </div>
        <RunCheckButton productId={product.id} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Target Markets */}
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Target Markets
            </h2>
            {product.target_markets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {product.target_markets.map((market) => (
                  <span
                    key={market}
                    className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700"
                  >
                    {market}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No markets specified</p>
            )}
          </section>

          {/* Ingredients */}
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Ingredients
            </h2>
            {ingredients.length > 0 ? (
              <ul className="space-y-1">
                {ingredients.map((ing, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    {ing.name}
                    {ing.percentage != null && (
                      <span className="ml-1 text-gray-400">
                        ({ing.percentage}%)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No ingredients listed</p>
            )}
          </section>

          {/* Claims */}
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Claims
            </h2>
            {product.claims.length > 0 ? (
              <ul className="space-y-1">
                {product.claims.map((claim, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    {claim}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No claims listed</p>
            )}
          </section>
        </div>

        {/* Right Column — Latest Check Summary */}
        <div>
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Latest Compliance Check
            </h2>

            {latestCheck ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <StatusBadge
                    status={latestCheck.overall_status as OverallStatus}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Score</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {latestCheck.compliance_score != null
                      ? `${latestCheck.compliance_score}%`
                      : '-'}
                  </span>
                </div>

                {statistics && (
                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    <h3 className="text-xs font-medium text-gray-500">
                      Findings by Severity
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {statistics.critical > 0 && (
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity="CRITICAL" />
                          <span className="text-sm text-gray-700">
                            {statistics.critical}
                          </span>
                        </div>
                      )}
                      {statistics.major > 0 && (
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity="MAJOR" />
                          <span className="text-sm text-gray-700">
                            {statistics.major}
                          </span>
                        </div>
                      )}
                      {statistics.minor > 0 && (
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity="MINOR" />
                          <span className="text-sm text-gray-700">
                            {statistics.minor}
                          </span>
                        </div>
                      )}
                      {statistics.info > 0 && (
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity="INFO" />
                          <span className="text-sm text-gray-700">
                            {statistics.info}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {findings.length} total finding
                      {findings.length !== 1 && 's'}
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-400">
                    Checked{' '}
                    {new Date(latestCheck.checked_at).toLocaleDateString()}
                  </p>
                  <Link
                    href={`/products/${product.id}/report`}
                    className="mt-2 inline-block text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    View Full Report &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No compliance checks run yet. Click &ldquo;Run Compliance
                Check&rdquo; to get started.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
