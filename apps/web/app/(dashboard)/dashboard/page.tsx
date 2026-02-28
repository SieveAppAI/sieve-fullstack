import Link from 'next/link';
import { createServiceClient } from '@sieve/db';
import type { OverallStatus } from '@sieve/shared';
import { StatusBadge } from '@/app/components/status-badge';

export const dynamic = 'force-dynamic';

async function getProducts() {
  const supabase = createServiceClient();

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  if (!products || products.length === 0) return { products: [], checks: [] };

  const productIds = products.map((p) => p.id);
  const { data: checks, error: checksError } = await supabase
    .from('compliance_checks')
    .select('*')
    .in('product_id', productIds)
    .order('checked_at', { ascending: false });

  if (checksError) throw checksError;

  return { products, checks: checks ?? [] };
}

export default async function DashboardPage() {
  const { products, checks } = await getProducts();

  // Build a map of product_id -> latest check
  const latestCheckMap = new Map<
    string,
    (typeof checks)[number]
  >();
  for (const check of checks) {
    if (check.product_id && !latestCheckMap.has(check.product_id)) {
      latestCheckMap.set(check.product_id, check);
    }
  }

  // Compute stats
  const total = products.length;
  let compliant = 0;
  let nonCompliant = 0;
  let needsReview = 0;

  for (const product of products) {
    const check = latestCheckMap.get(product.id);
    if (!check) {
      needsReview++;
      continue;
    }
    switch (check.overall_status) {
      case 'COMPLIANT':
        compliant++;
        break;
      case 'NON_COMPLIANT':
        nonCompliant++;
        break;
      default:
        needsReview++;
    }
  }

  const stats = [
    { label: 'Total Products', value: total, color: 'text-gray-900' },
    { label: 'Compliant', value: compliant, color: 'text-green-600' },
    { label: 'Non-Compliant', value: nonCompliant, color: 'text-red-600' },
    { label: 'Needs Review', value: needsReview, color: 'text-amber-600' },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Product Portfolio
        </h1>
        <Link
          href="/products/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          New Assessment
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 bg-white p-5"
          >
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className={`mt-1 text-3xl font-semibold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Products Table */}
      {products.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No products yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first product assessment.
          </p>
          <Link
            href="/products/new"
            className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            New Assessment
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Markets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Checked
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => {
                const check = latestCheckMap.get(product.id);
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      <Link
                        href={`/products/${product.id}`}
                        className="hover:underline"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-500">
                      {product.category}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {product.target_markets.join(', ') || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {check ? (
                        <StatusBadge
                          status={check.overall_status as OverallStatus}
                        />
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          Not Checked
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {check?.compliance_score != null
                        ? `${check.compliance_score}%`
                        : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {check
                        ? new Date(check.checked_at).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <Link
                        href={`/products/${product.id}`}
                        className="font-medium text-gray-600 hover:text-gray-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
