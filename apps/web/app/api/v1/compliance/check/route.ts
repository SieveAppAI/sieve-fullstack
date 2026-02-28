import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, type Json } from '@sieve/db';
import type {
  ComplianceFinding,
  ComplianceReport,
  ComplianceStatistics,
  OverallStatus,
  Severity,
  FindingCategory,
} from '@sieve/shared';
import { calculateComplianceScore, JURISDICTIONS } from '@sieve/shared';

export const maxDuration = 120;

const MCP_SG_SERVER_URL =
  process.env.MCP_SG_SERVER_URL?.trim() ??
  'https://sieve-mcp-sg.vercel.app/api/mcp';

// ---------------------------------------------------------------------------
// MCP transport
// ---------------------------------------------------------------------------

async function callMcpTool(
  serverUrl: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `MCP server responded with ${response.status}: ${await response.text()}`,
    );
  }

  const json = await response.json();

  // Extract the parsed content from MCP response envelope
  const content = json?.result?.content;
  if (content?.[0]?.type === 'text') {
    return JSON.parse(content[0].text);
  }

  return json?.result ?? json;
}

function getMcpServerUrl(jurisdiction: string): string {
  const serverMap: Record<string, string> = {
    SG: MCP_SG_SERVER_URL,
  };

  const url = serverMap[jurisdiction];
  if (!url) {
    throw new Error(`No MCP server configured for jurisdiction: ${jurisdiction}`);
  }
  return url;
}

// ---------------------------------------------------------------------------
// Finding mappers
// ---------------------------------------------------------------------------

interface IngredientCheckMcpResult {
  ingredient: string;
  status: string;
  max_concentration_pct: number | null;
  conditions: string[];
  required_warnings: string[];
  regulation_reference: string | null;
  annex_reference: string | null;
  product_categories: string[];
  jurisdiction: string;
}

interface ClaimValidationItem {
  claim: string;
  status: string;
  conditions: Record<string, unknown> | null;
  regulation_reference: string | null;
  reason: string | null;
}

interface ClaimsValidationMcpResult {
  jurisdiction: string;
  results: ClaimValidationItem[];
}

interface LabellingElementItem {
  element: string;
  mandatory: boolean;
  description: string;
  regulation_reference: string | null;
}

interface LabellingMcpResult {
  elements: LabellingElementItem[];
}

interface ImportRequirementItem {
  requirement: string;
  requirement_type: string | null;
  regulatory_body: string | null;
  documents_required: string[];
  regulation_reference: string | null;
}

interface ImportMcpResult {
  requirements: ImportRequirementItem[];
}

function mapIngredientFinding(
  result: IngredientCheckMcpResult,
): ComplianceFinding | null {
  const { status, ingredient } = result;

  if (status === 'permitted') return null;

  if (status === 'banned') {
    return {
      severity: 'CRITICAL' as Severity,
      blocking: true,
      category: 'banned_ingredient' as FindingCategory,
      title: `Banned ingredient: ${ingredient}`,
      description: `${ingredient} is banned in this jurisdiction.`,
      ingredient_name: ingredient,
      regulation_reference: result.regulation_reference,
      regulatory_body: null,
      recommended_action: `Remove ${ingredient} from the formulation.`,
      evidence_required: null,
    };
  }

  // restricted or permitted_with_limits
  const conditions = result.conditions?.length
    ? result.conditions.join('; ')
    : null;
  const warnings = result.required_warnings?.length
    ? result.required_warnings.join('; ')
    : null;
  const maxConc = result.max_concentration_pct;
  const descParts: string[] = [];
  if (maxConc !== null) descParts.push(`Max concentration: ${maxConc}%`);
  if (conditions) descParts.push(`Conditions: ${conditions}`);
  if (warnings) descParts.push(`Required warnings: ${warnings}`);

  return {
    severity: 'MAJOR' as Severity,
    blocking: false,
    category: 'restricted_ingredient' as FindingCategory,
    title: `Restricted ingredient: ${ingredient}`,
    description: descParts.join('. ') || `${ingredient} is restricted.`,
    ingredient_name: ingredient,
    regulation_reference: result.regulation_reference,
    regulatory_body: null,
    recommended_action: `Verify ${ingredient} usage complies with the stated conditions and limits.`,
    evidence_required: null,
  };
}

function mapClaimsFindings(
  result: ClaimsValidationMcpResult,
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];

  for (const item of result.results ?? []) {
    if (item.status === 'permitted') continue;

    let severity: Severity;
    let blocking = false;

    if (item.status === 'prohibited') {
      severity = 'MAJOR';
      blocking = true;
    } else if (item.status === 'conditional') {
      severity = 'MINOR';
    } else {
      // unknown
      severity = 'INFO';
    }

    findings.push({
      severity,
      blocking,
      category: 'claims' as FindingCategory,
      title: `Claim ${item.status}: "${item.claim}"`,
      description: item.reason,
      ingredient_name: null,
      regulation_reference: item.regulation_reference,
      regulatory_body: null,
      recommended_action:
        item.status === 'prohibited'
          ? `Remove this claim from the product.`
          : item.status === 'conditional'
            ? `Review conditions before using this claim.`
            : `Verify this claim can be substantiated.`,
      evidence_required: null,
    });
  }

  return findings;
}

function mapLabellingFindings(
  result: LabellingMcpResult,
): ComplianceFinding[] {
  return (result.elements ?? [])
    .filter((el) => el.mandatory)
    .map((el) => ({
      severity: 'MINOR' as Severity,
      blocking: false,
      category: 'labelling' as FindingCategory,
      title: `Labelling required: ${el.element}`,
      description: el.description,
      ingredient_name: null,
      regulation_reference: el.regulation_reference,
      regulatory_body: null,
      recommended_action: `Ensure "${el.element}" is present on the product label.`,
      evidence_required: null,
    }));
}

function mapImportFindings(result: ImportMcpResult): ComplianceFinding[] {
  return (result.requirements ?? []).map((req) => ({
    severity: 'INFO' as Severity,
    blocking: false,
    category: 'import' as FindingCategory,
    title: `Import requirement: ${req.requirement}`,
    description: req.documents_required?.length
      ? `Documents needed: ${req.documents_required.join(', ')}`
      : null,
    ingredient_name: null,
    regulation_reference: req.regulation_reference,
    regulatory_body: req.regulatory_body,
    recommended_action: `Prepare the required documentation for import.`,
    evidence_required: req.documents_required?.join(', ') ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { product_id, jurisdictions } = body as {
      product_id: string;
      jurisdictions?: string[];
    };

    if (!product_id) {
      return NextResponse.json(
        { error: 'Missing required field: product_id' },
        { status: 400 },
      );
    }

    // 1. Fetch product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single();

    if (productError) {
      if (productError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: productError.message },
        { status: 500 },
      );
    }

    // 2. Extract ingredients
    const formulation = product.formulation as {
      ingredients?: { name: string }[];
    } | null;
    const ingredientNames =
      formulation?.ingredients?.map((i) => i.name) ?? [];

    if (ingredientNames.length === 0) {
      return NextResponse.json(
        { error: 'Product has no ingredients in formulation' },
        { status: 400 },
      );
    }

    // 3. Determine jurisdictions to check
    const targetJurisdictions =
      jurisdictions?.length ? jurisdictions : product.target_markets;

    if (!targetJurisdictions?.length) {
      return NextResponse.json(
        { error: 'No target jurisdictions specified' },
        { status: 400 },
      );
    }

    // Run compliance check for each jurisdiction and collect reports
    const reports: ComplianceReport[] = [];

    for (const jurisdiction of targetJurisdictions) {
      // Validate jurisdiction is supported
      if (!(jurisdiction in JURISDICTIONS)) {
        reports.push({
          product_id,
          jurisdiction,
          overall_status: 'INSUFFICIENT_DATA',
          compliance_score: 0,
          readiness_score: 0,
          findings: [],
          statistics: {
            total_checks: 0,
            critical: 0,
            major: 0,
            minor: 0,
            info: 0,
          },
          data_version: 'unsupported',
          checked_at: new Date().toISOString(),
        });
        continue;
      }

      const serverUrl = getMcpServerUrl(jurisdiction);

      // 4. Call MCP tools in parallel
      const [ingredientResults, claimsResult, labellingResult, importResult] =
        await Promise.all([
          // a. check_ingredient for each ingredient
          Promise.allSettled(
            ingredientNames.map((ingredient) =>
              callMcpTool(serverUrl, 'check_ingredient', {
                ingredient,
                product_category: product.category,
              }),
            ),
          ),
          // b. validate_claims
          callMcpTool(serverUrl, 'validate_claims', {
            claims: product.claims ?? [],
            product_category: product.category,
          }).catch(() => null),
          // c. get_labelling_requirements
          callMcpTool(serverUrl, 'get_labelling_requirements', {
            product_category: product.category,
          }).catch(() => null),
          // d. get_import_requirements
          callMcpTool(serverUrl, 'get_import_requirements', {
            product_category: product.category,
          }).catch(() => null),
        ]);

      // 5. Aggregate findings
      const findings: ComplianceFinding[] = [];

      // Ingredient findings
      for (const settled of ingredientResults) {
        if (settled.status === 'fulfilled' && settled.value) {
          const finding = mapIngredientFinding(
            settled.value as IngredientCheckMcpResult,
          );
          if (finding) findings.push(finding);
        }
      }

      // Claims findings
      if (claimsResult) {
        findings.push(
          ...mapClaimsFindings(claimsResult as ClaimsValidationMcpResult),
        );
      }

      // Labelling findings
      if (labellingResult) {
        findings.push(
          ...mapLabellingFindings(labellingResult as LabellingMcpResult),
        );
      }

      // Import findings
      if (importResult) {
        findings.push(
          ...mapImportFindings(importResult as ImportMcpResult),
        );
      }

      // 6. Calculate statistics
      const statistics: ComplianceStatistics = {
        total_checks: findings.length,
        critical: findings.filter((f) => f.severity === 'CRITICAL').length,
        major: findings.filter((f) => f.severity === 'MAJOR').length,
        minor: findings.filter((f) => f.severity === 'MINOR').length,
        info: findings.filter((f) => f.severity === 'INFO').length,
      };

      // 7. Calculate compliance score
      const complianceScore = calculateComplianceScore(statistics);

      // 8. Determine overall status
      let overallStatus: OverallStatus;
      if (statistics.critical > 0) {
        overallStatus = 'NON_COMPLIANT';
      } else if (statistics.major > 0) {
        overallStatus = 'NEEDS_REVIEW';
      } else {
        overallStatus = 'COMPLIANT';
      }

      // Readiness: score inversely proportional to blocking findings
      const blockingCount = findings.filter((f) => f.blocking).length;
      const readinessScore = blockingCount > 0 ? Math.max(0, 100 - blockingCount * 30) : complianceScore;

      const checkedAt = new Date().toISOString();
      const dataVersion = `v1-${jurisdiction.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`;

      // 9. Store compliance check
      const { error: insertError } = await supabase
        .from('compliance_checks')
        .insert({
          product_id,
          jurisdiction,
          overall_status: overallStatus,
          compliance_score: complianceScore,
          readiness_score: readinessScore,
          findings: findings as unknown as Json,
          statistics: statistics as unknown as Json,
          data_version: dataVersion,
          checked_at: checkedAt,
        });

      if (insertError) {
        console.error('Failed to store compliance check:', insertError);
      }

      // 10. Build report
      const report: ComplianceReport = {
        product_id,
        jurisdiction,
        overall_status: overallStatus,
        compliance_score: complianceScore,
        readiness_score: readinessScore,
        findings,
        statistics,
        data_version: dataVersion,
        checked_at: checkedAt,
      };

      reports.push(report);
    }

    // Return single report if only one jurisdiction, otherwise array
    if (reports.length === 1) {
      return NextResponse.json({ report: reports[0] });
    }

    return NextResponse.json({ reports });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
