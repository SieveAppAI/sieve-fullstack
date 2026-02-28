import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type {
  ComplianceFinding,
  ComplianceStatistics,
  FindingCategory,
  Severity,
} from '@sieve/shared';

const colors = {
  CRITICAL: '#DC2626',
  MAJOR: '#EA580C',
  MINOR: '#CA8A04',
  INFO: '#2563EB',
} satisfies Record<Severity, string>;

const categoryLabels: Record<FindingCategory, string> = {
  banned_ingredient: 'Banned Ingredients',
  restricted_ingredient: 'Restricted Ingredients',
  labelling: 'Labelling',
  claims: 'Claims',
  allergen: 'Allergens',
  import: 'Import Requirements',
  registration: 'Registration',
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#6B7280' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    padding: 12,
    border: '1 solid #E5E7EB',
    borderRadius: 6,
  },
  summaryLabel: { fontSize: 9, color: '#6B7280', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, marginTop: 16 },
  findingRow: {
    padding: 10,
    borderBottom: '1 solid #F3F4F6',
  },
  findingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  findingTitle: { fontSize: 10, fontWeight: 'bold' },
  findingDesc: { fontSize: 9, color: '#4B5563', marginBottom: 2 },
  findingRef: { fontSize: 8, color: '#9CA3AF' },
  findingAction: {
    fontSize: 9,
    color: '#374151',
    marginTop: 4,
    padding: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  footer: { marginTop: 24, fontSize: 8, color: '#9CA3AF' },
  noFindings: { padding: 20, textAlign: 'center', color: '#6B7280' },
});

interface ReportPdfProps {
  productName: string;
  jurisdiction: string;
  overallStatus: string;
  complianceScore: number | null;
  findings: ComplianceFinding[];
  statistics: ComplianceStatistics | null;
  checkedAt: string;
  dataVersion: string | null;
}

export function ReportPdf({
  productName,
  jurisdiction,
  overallStatus,
  complianceScore,
  findings,
  statistics,
  checkedAt,
  dataVersion,
}: ReportPdfProps) {
  const grouped = new Map<FindingCategory, ComplianceFinding[]>();
  for (const finding of findings) {
    const cat = finding.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(finding);
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Compliance Report</Text>
          <Text style={styles.subtitle}>
            {productName} — {jurisdiction}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Overall Status</Text>
            <Text style={styles.summaryValue}>{overallStatus}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Compliance Score</Text>
            <Text style={styles.summaryValue}>
              {complianceScore != null ? `${complianceScore}%` : '-'}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Findings</Text>
            <Text style={styles.summaryValue}>{findings.length}</Text>
            {statistics && (
              <Text style={{ fontSize: 8, color: '#6B7280', marginTop: 2 }}>
                {[
                  statistics.critical > 0 && `${statistics.critical} critical`,
                  statistics.major > 0 && `${statistics.major} major`,
                  statistics.minor > 0 && `${statistics.minor} minor`,
                  statistics.info > 0 && `${statistics.info} info`,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            )}
          </View>
        </View>

        {findings.length === 0 ? (
          <Text style={styles.noFindings}>No findings for this compliance check.</Text>
        ) : (
          Array.from(grouped.entries()).map(([category, catFindings]) => (
            <View key={category} wrap={false}>
              <Text style={styles.sectionTitle}>
                {categoryLabels[category] ?? category} ({catFindings.length})
              </Text>
              {catFindings.map((finding, i) => (
                <View key={i} style={styles.findingRow}>
                  <View style={styles.findingHeader}>
                    <Text
                      style={[
                        styles.severityBadge,
                        { backgroundColor: colors[finding.severity] },
                      ]}
                    >
                      {finding.severity}
                    </Text>
                    <Text style={styles.findingTitle}>{finding.title}</Text>
                  </View>
                  {finding.description && (
                    <Text style={styles.findingDesc}>{finding.description}</Text>
                  )}
                  {finding.regulation_reference && (
                    <Text style={styles.findingRef}>
                      Ref: {finding.regulation_reference}
                    </Text>
                  )}
                  {finding.recommended_action && (
                    <Text style={styles.findingAction}>
                      Action: {finding.recommended_action}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ))
        )}

        <Text style={styles.footer}>
          Report generated {new Date(checkedAt).toLocaleString()}
          {dataVersion && ` · Data version: ${dataVersion}`}
          {'\n'}Powered by Sieve AI
        </Text>
      </Page>
    </Document>
  );
}
