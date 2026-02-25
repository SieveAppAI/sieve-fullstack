export type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';

export type FindingCategory =
  | 'banned_ingredient'
  | 'restricted_ingredient'
  | 'labelling'
  | 'claims'
  | 'allergen'
  | 'import'
  | 'registration';

export type OverallStatus =
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'NEEDS_REVIEW'
  | 'INSUFFICIENT_DATA';

export interface ComplianceFinding {
  severity: Severity;
  blocking: boolean;
  category: FindingCategory;
  title: string;
  description: string | null;
  ingredient_name: string | null;
  regulation_reference: string | null;
  regulatory_body: string | null;
  recommended_action: string | null;
  evidence_required: string | null;
}

export interface ComplianceStatistics {
  total_checks: number;
  critical: number;
  major: number;
  minor: number;
  info: number;
}

export interface ComplianceReport {
  product_id: string;
  jurisdiction: string;
  overall_status: OverallStatus;
  compliance_score: number;
  readiness_score: number;
  findings: ComplianceFinding[];
  statistics: ComplianceStatistics;
  data_version: string;
  checked_at: string;
}
