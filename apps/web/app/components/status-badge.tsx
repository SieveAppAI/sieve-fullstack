import type { OverallStatus, Severity } from '@sieve/shared';

const statusColors: Record<OverallStatus, string> = {
  COMPLIANT: 'bg-green-100 text-green-800',
  NON_COMPLIANT: 'bg-red-100 text-red-800',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800',
  INSUFFICIENT_DATA: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<OverallStatus, string> = {
  COMPLIANT: 'Compliant',
  NON_COMPLIANT: 'Non-Compliant',
  NEEDS_REVIEW: 'Needs Review',
  INSUFFICIENT_DATA: 'Insufficient Data',
};

export function StatusBadge({ status }: { status: OverallStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

const severityColors: Record<Severity, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  MAJOR: 'bg-orange-100 text-orange-800',
  MINOR: 'bg-yellow-100 text-yellow-800',
  INFO: 'bg-blue-100 text-blue-800',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${severityColors[severity] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {severity}
    </span>
  );
}
