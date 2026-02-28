import { createServiceClient } from '@sieve/db';
import { JURISDICTIONS } from '@sieve/shared';

export const dynamic = 'force-dynamic';

async function getStats() {
  const supabase = createServiceClient();

  const [
    ingredients,
    regulations,
    labelling,
    claims,
    importReqs,
    sources,
    embeddings,
  ] = await Promise.all([
    supabase.from('ingredient_regulations').select('*', { count: 'exact', head: true }),
    supabase.from('regulatory_sources').select('*', { count: 'exact', head: true }),
    supabase.from('labelling_requirements').select('*', { count: 'exact', head: true }),
    supabase.from('claims_rules').select('*', { count: 'exact', head: true }),
    supabase.from('import_requirements').select('*', { count: 'exact', head: true }),
    supabase.from('regulatory_sources').select('*', { count: 'exact', head: true }).eq('scrape_status', 'structured'),
    supabase.from('regulatory_embeddings').select('*', { count: 'exact', head: true }),
  ]);

  return [
    { label: 'Ingredients', count: ingredients.count ?? 0 },
    { label: 'Regulations', count: regulations.count ?? 0 },
    { label: 'Labelling Rules', count: labelling.count ?? 0 },
    { label: 'Claims Rules', count: claims.count ?? 0 },
    { label: 'Import Requirements', count: importReqs.count ?? 0 },
    { label: 'Structured Sources', count: sources.count ?? 0 },
    { label: 'Embeddings', count: embeddings.count ?? 0 },
  ];
}

async function getRecentChanges() {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('regulatory_source_changes')
    .select('id, change_summary, detected_at, processed, source_id, regulatory_sources(title, url)')
    .order('detected_at', { ascending: false })
    .limit(10);

  return data ?? [];
}

export default async function SettingsPage() {
  const [stats, changes] = await Promise.all([getStats(), getRecentChanges()]);

  const jurisdictions = Object.values(JURISDICTIONS);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Regulatory data overview and system configuration.
        </p>
      </div>

      {/* Regulatory Data Stats */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Regulatory Data
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">
                {stat.count.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Jurisdictions */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Supported Jurisdictions
        </h2>
        <div className="rounded-lg border border-gray-200 bg-white">
          <ul className="divide-y divide-gray-100">
            {jurisdictions.map((j) => (
              <li key={j.code} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900">{j.name}</p>
                  <p className="text-sm text-gray-500">{j.code}</p>
                </div>
                <div className="flex gap-2">
                  {j.regulatory_bodies.map((body) => (
                    <span
                      key={body}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
                    >
                      {body}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recent Regulatory Changes */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Recent Regulatory Changes
        </h2>
        {changes.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">
              No regulatory changes detected yet.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white">
            <ul className="divide-y divide-gray-100">
              {changes.map((change) => {
                const source = change.regulatory_sources as
                  | { title: string | null; url: string }
                  | null;
                return (
                  <li key={change.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">
                          {source?.title ?? 'Unknown source'}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {change.change_summary}
                        </p>
                        {source?.url && (
                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            {source.url}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            change.processed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {change.processed ? 'Processed' : 'Pending'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(change.detected_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
