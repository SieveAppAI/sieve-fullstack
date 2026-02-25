import type { Severity, ComplianceStatistics } from '../types/compliance';

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  CRITICAL: 25,
  MAJOR: 10,
  MINOR: 3,
  INFO: 0,
};

/**
 * Calculate compliance score from findings statistics.
 * Score = max(0, 100 - sum(count * weight))
 */
export function calculateComplianceScore(stats: ComplianceStatistics): number {
  const deductions =
    stats.critical * SEVERITY_WEIGHTS.CRITICAL +
    stats.major * SEVERITY_WEIGHTS.MAJOR +
    stats.minor * SEVERITY_WEIGHTS.MINOR +
    stats.info * SEVERITY_WEIGHTS.INFO;

  return Math.max(0, 100 - deductions);
}
