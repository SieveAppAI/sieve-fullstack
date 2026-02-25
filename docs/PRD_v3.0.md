# Product Requirements Document: Sieve AI — Global Regulatory Compliance Platform

**Version:** 3.0
**Author:** Aditya
**Date:** February 25, 2026
**Changes in v3.0:** Added Browser Use as Tier 2 ingestion layer, Claude Agent SDK for agentic orchestration, updated architecture diagrams, cost estimates, and rollout plan.
**Status:** Draft

---

## 1. Executive Summary

Sieve AI is an AI-powered regulatory compliance platform that enables CPG, supplement, and beauty/skincare brands — as well as retailers and marketplaces — to instantly verify product compliance against local jurisdiction laws, food and nutrition guidelines, and cosmetic safety regulations.

The platform combines a **three-tier data ingestion engine** — Exa.ai (HTML scraping), Browser Use (JS-rendered pages + interactive portals), and Claude Vision (PDF extraction) — that continuously scrapes and structures regulatory content from government sources, with an AI compliance engine that evaluates products across multiple dimensions. The **Claude Agent SDK** powers long-running agentic workflows including multi-step compliance orchestration, regulatory change analysis, and autonomous data pipeline management. Built on Vercel (frontend + serverless functions) and Supabase (database + auth + cron), Sieve AI starts with Singapore regulations and expands jurisdiction-by-jurisdiction.

The core workflow follows: **Assess → Monitor → Act.**

---

## 2. Product Overview & Value Tracking

### 2.1 Platform Capabilities

Sieve AI is an AI food compliance scanner currently covering FDA (US), EFSA (EU), SFA (Singapore), CFIA (Canada), and FSANZ (Australia/NZ). The platform's feature set spans five core areas:

**Feature Areas:**

| Feature Area | Capabilities |
|---|---|
| **Product & Docs Scanner** | Upload packaging artwork (PDF/JPG), multi-angle product images; auto-extract product name, net content, ingredient list, nutrition panel, claims; detect language on packaging; flag missing/unreadable sections; bulk upload (~10 SKUs) with parallel processing |
| **AI Claim & Packaging Detection** | Detect and classify all claims on packaging (nutrition, health, certification, marketing); detect meat/animal-derived ingredients automatically |
| **Compliance Report** | Dynamic PDF compliance report per product; organized by category (basic labelling, other labelling, import requirements); per-element compliance classification; compliance score (%) for risk prioritization; readiness score per product per market; blocking vs non-blocking severity; ingredient limit flags with legal references; import requirement flags (health certificates, source confirmation) |
| **Action Playbook** | Recommended compliance actions with regulation citations; relabelling/sticker guidance; prioritized fixes list; push items for further review; explain why claims fail + evidence required; meat content documentation requirements; mark issues as resolved |
| **Workspace & Collab** | Single product page/workspace for all docs, reviews, scores, fixes; full audit log per product |

### 2.2 Customer Value Propositions (by persona)

| Persona | Key Value Drivers |
|---|---|
| **Retailers** | Audit-ready traceability; automatic approval invalidation on data changes; early claim-to-documentation gap detection; risk-based review prioritization; platform-based SKU scoring at scale (50K+ SKUs); regulation-linked compliance decisions; supplier remediation through structured requests |
| **Brands** | Market scenario simulation (6 scenarios → 1); actionable fix guidance tied to regulation; compliance workflow efficiency; market readiness scoring (go/no-go signal); severity-based issue prioritization |
| **General** | Sustained ongoing value through retention; easy SKU and market expansion; habit-forming compliance workflows; guided onboarding to first SKU review; fast time-to-value |

### 2.3 Target KPIs

| Metric | Current → Target |
|---|---|
| Time to reconstruct compliance decision | 90 → 5 minutes |
| Critical data changes triggering re-review | → 100% |
| SKUs reviewed and scored through platform | → 85% of 50,000 |
| Time from first review to market launch | 75 → 30 days |
| Free-to-paid conversion rate | 6% → 14% |

### 2.4 Platform Expansion (This PRD)

This PRD defines the next evolution of Sieve AI's backend infrastructure, specifically:

| Dimension | Current State | Target State |
|---|---|---|
| Product categories | Food & beverage (primary), supplements | CPG + Supplements + **Beauty/Skincare** (equal depth) |
| Delivery model | SaaS web app | SaaS web app + **MCP Server** (AI-native) + **REST API** |
| Cosmetics depth | Limited | Full **ASEAN Cosmetic Directive** (Annexes II-VII) |
| Data freshness | Monitored regularly | **Three-tier ingestion** — Exa.ai (HTML) + Browser Use (JS/portals) + Claude Vision (PDFs) — with cron + change detection |
| Regulatory data pipeline | Manual curation | **Automated ingestion** via Exa.ai + Browser Use + Claude Vision |
| Infrastructure | Current stack | **Vercel + Supabase** (scalable, serverless) |
| AI backbone | Proprietary | **Claude Vision** (unified extraction, structuring, compliance reasoning) |
| Agent orchestration | N/A | **Claude Agent SDK** — agentic compliance workflows, multi-step pipeline management |
| Ingredient matching | 99.7% accuracy | Multi-layer matching (CAS + INCI + synonym + fuzzy) with confidence scores |

---

## 3. Product Architecture

### 3.1 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js on Vercel | Product dashboard, compliance reports, onboarding |
| **Backend** | Vercel Serverless Functions (Edge + Node.js) | API routes, compliance engine orchestrator |
| **Database** | Supabase (PostgreSQL) — single shared instance | Regulatory data, products, compliance results, user data |
| **Auth** | Supabase Auth | User management, team workspaces |
| **Storage** | Supabase Storage | Product artwork uploads (PDF, JPG, PNG), cached regulatory PDFs |
| **Cron / Scheduling** | Supabase pg_cron + Vercel Cron | Per-jurisdiction data refresh, change detection |
| **Data Ingestion (Tier 1)** | Exa.ai API (Search + Contents + Crawl) | Scrape static HTML regulatory pages, discover URLs |
| **Data Ingestion (Tier 2)** | Browser Use (AI browser automation) | JS-rendered pages (SSO), interactive portals (HSA PRISM), anti-bot bypass, CAPTCHA solving, dynamic PDF link resolution |
| **PDF Ingestion (Tier 3)** | Anthropic Claude Vision API | Extract structured data from regulatory PDFs |
| **AI Processing** | Anthropic Claude API (unified provider) | Packaging OCR/extraction, compliance reasoning, regulatory data structuring |
| **Agent Orchestration** | Claude Agent SDK (Python/TypeScript) | Long-running agentic workflows: multi-step compliance checks, regulatory change analysis, autonomous pipeline management, sub-agent coordination |
| **Vector Store** | Supabase pgvector | Semantic search over regulatory content |
| **MCP Servers** | TypeScript MCP SDK on Vercel (one per jurisdiction + orchestrator) | Modular compliance tools per jurisdiction |
| **Realtime** | Supabase Realtime | Live compliance status updates |

### 3.2 Multi-MCP-Server Architecture

Each jurisdiction's regulatory data ingestion and compliance checking is deployed as a **standalone MCP server**. A central **Compliance Engine Orchestrator** composes these jurisdiction servers to run multi-market checks, scoring, and reporting.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                      │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Web App  │  │ MCP Client │  │ REST API │  │ Webhook           │  │
│  │ (Next.js)│  │ (Claude)   │  │ Partners │  │ Subscribers       │  │
│  └────┬─────┘  └─────┬──────┘  └────┬─────┘  └────────┬──────────┘  │
└───────┼──────────────┼──────────────┼──────────────────┼─────────────┘
        │              │              │                  │
        ▼              ▼              ▼                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│               SIEVE AI — COMPLIANCE ENGINE ORCHESTRATOR               │
│               (Vercel — sieve-compliance-engine)                      │
│                                                                        │
│  Responsibilities:                                                     │
│  • Multi-jurisdiction compliance checks (fan-out to jurisdiction MCP) │
│  • Compliance scoring & report generation                              │
│  • Product management, audit log, workspace                           │
│  • User-facing API routes (/api/v1/*)                                 │
│  • Artwork upload → Claude Vision extraction                          │
│                                                                        │
│  MCP Tools exposed:                                                    │
│  • check_product_compliance (multi-jurisdiction orchestration)        │
│  • classify_product                                                    │
│  • list_jurisdictions                                                  │
│  • generate_compliance_report                                          │
│                                                                        │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ Score       │ │ Report       │ │ Product      │ │ Artwork      │ │
│  │ Calculator  │ │ Generator    │ │ Classifier   │ │ Extractor    │ │
│  └─────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │
└───────────┬──────────────┬──────────────┬──────────────┬─────────────┘
            │              │              │              │
     ┌──────▼──────┐ ┌────▼────┐ ┌──────▼──────┐ ┌────▼────┐
     │  Call SG    │ │ Call MY │ │  Call US    │ │ Call EU │  ...
     │  MCP Server │ │ MCP Srv │ │  MCP Server │ │ MCP Srv │
     └──────┬──────┘ └────┬────┘ └──────┬──────┘ └────┬────┘
            │              │              │              │
            ▼              ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────────────┐
│              JURISDICTION MCP SERVERS (one per country)                │
│                                                                        │
│  ┌─────────────────────┐  ┌─────────────────────┐                    │
│  │  sieve-sg-regulations│  │  sieve-my-regulations│  ...              │
│  │  (Vercel deployment) │  │  (Vercel deployment) │                    │
│  │                      │  │                      │                    │
│  │  MCP Tools:          │  │  MCP Tools:          │                    │
│  │  • check_ingredient  │  │  • check_ingredient  │                    │
│  │  • validate_claims   │  │  • validate_claims   │                    │
│  │  • get_labelling_reqs│  │  • get_labelling_reqs│                    │
│  │  • get_import_reqs   │  │  • get_import_reqs   │                    │
│  │  • get_regulation_   │  │  • get_regulation_   │                    │
│  │    update            │  │    update            │                    │
│  │  • search_regulations│  │  • search_regulations│                    │
│  │                      │  │                      │                    │
│  │  Data Ingestion:     │  │  Data Ingestion:     │                    │
│  │  • Exa.ai scraper    │  │  • Exa.ai scraper    │                    │
│  │    (SFA, HSA, SSO)   │  │    (NPRA, MOH, etc.) │                    │
│  │  • Browser Use       │  │  • Browser Use       │                    │
│  │    (JS pages, portals│  │    (JS pages, portals│                    │
│  │     CAPTCHA bypass)  │  │     CAPTCHA bypass)  │                    │
│  │  • Claude Vision     │  │  • Claude Vision     │                    │
│  │    (PDF extraction)  │  │    (PDF extraction)  │                    │
│  │  • Claude Agent SDK  │  │  • Claude Agent SDK  │                    │
│  │    (agentic pipeline │  │    (agentic pipeline │                    │
│  │     orchestration)   │  │     orchestration)   │                    │
│  │  • Cron: daily/      │  │  • Cron: daily/      │                    │
│  │    weekly/monthly    │  │    weekly/monthly    │                    │
│  │  • Change detection  │  │  • Change detection  │                    │
│  └──────────┬───────────┘  └──────────┬───────────┘                    │
└─────────────┼──────────────────────────┼─────────────────────────────┘
              │                          │
              ▼                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    SHARED SUPABASE INSTANCE                            │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  SHARED TABLES (cross-jurisdiction)                              │  │
│  │  • ingredients (canonical names, CAS, INCI, synonyms)           │  │
│  │  • allergens (per jurisdiction, but shared schema)               │  │
│  │  • products (user products)                                      │  │
│  │  • compliance_checks (results from orchestrator)                 │  │
│  │  • compliance_findings (individual findings)                     │  │
│  │  • audit_log                                                     │  │
│  │  • auth.users / teams                                            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  JURISDICTION-SCOPED TABLES (partitioned by jurisdiction col)    │  │
│  │  • regulatory_sources        (jurisdiction = 'SG' | 'MY' | ...) │  │
│  │  • ingredient_regulations    (jurisdiction-scoped)               │  │
│  │  • labelling_requirements    (jurisdiction-scoped)               │  │
│  │  • claims_rules              (jurisdiction-scoped)               │  │
│  │  • import_requirements       (jurisdiction-scoped)               │  │
│  │  • regulatory_source_changes (jurisdiction-scoped)               │  │
│  │  • regulatory_embeddings     (jurisdiction-scoped)               │  │
│  │  • scrape_schedule           (jurisdiction-scoped)               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────────┐ │
│  │  pgvector    │  │  Supabase    │  │  Supabase Auth              │ │
│  │  (embeddings)│  │  Storage     │  │  (users, teams, RBAC)       │ │
│  └──────────────┘  └──────────────┘  └─────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  pg_cron Jobs (per jurisdiction)                                  │ │
│  │  • SG: Daily change check, weekly re-scrape, monthly re-embed    │ │
│  │  • MY: Daily change check, weekly re-scrape, monthly re-embed    │ │
│  │  • US: Daily change check, weekly re-scrape, monthly re-embed    │ │
│  │  • ...                                                            │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3 MCP Server Decomposition

#### 3.3.1 Server Inventory

| Server | Repo | Vercel Deployment | Responsibility |
|---|---|---|---|
| `sieve-compliance-engine` | `sieve-ai/compliance-engine` | `sieve-engine.vercel.app` | Orchestrator: multi-jurisdiction checks, scoring, reporting, product management, artwork extraction |
| `sieve-sg-regulations` | `sieve-ai/sg-regulations` | `sieve-sg.vercel.app` | Singapore: SFA, HSA, NEA data ingestion + compliance tools |
| `sieve-my-regulations` | `sieve-ai/my-regulations` | `sieve-my.vercel.app` | Malaysia: NPRA, NPCB, MOH (Phase 2) |
| `sieve-us-regulations` | `sieve-ai/us-regulations` | `sieve-us.vercel.app` | United States: FDA, FTC (Phase 3) |
| `sieve-eu-regulations` | `sieve-ai/eu-regulations` | `sieve-eu.vercel.app` | European Union: EC, EFSA (Phase 3) |
| `sieve-th-regulations` | `sieve-ai/th-regulations` | `sieve-th.vercel.app` | Thailand: Thai FDA (Phase 2) |
| `sieve-id-regulations` | `sieve-ai/id-regulations` | `sieve-id.vercel.app` | Indonesia: BPOM (Phase 2) |
| `sieve-ph-regulations` | `sieve-ai/ph-regulations` | `sieve-ph.vercel.app` | Philippines: FDA Philippines (Phase 2) |
| `sieve-au-regulations` | `sieve-ai/au-regulations` | `sieve-au.vercel.app` | Australia/NZ: TGA, FSANZ (Phase 4) |
| `sieve-ingredients` | `sieve-ai/ingredients` | `sieve-ingredients.vercel.app` | Shared: canonical ingredient database, fuzzy matching, synonym resolution |

#### 3.3.2 Jurisdiction MCP Server — Standard Interface

Every jurisdiction server implements the same MCP tool interface. This is the contract:

```typescript
// shared/jurisdiction-server-interface.ts

// Every jurisdiction MCP server MUST expose these tools:

interface JurisdictionMCPServer {
  // Core compliance tools
  check_ingredient(input: {
    ingredient: string;           // name, INCI, or CAS
    cas_number?: string;
    product_category?: 'food' | 'supplement' | 'cosmetic';
    concentration_pct?: number;
  }): Promise<IngredientCheckResult>;

  validate_claims(input: {
    claims: string[];
    product_category: 'food' | 'supplement' | 'cosmetic';
    nutrition_info?: NutritionInfo;
  }): Promise<ClaimsValidationResult>;

  get_labelling_requirements(input: {
    product_category: 'food' | 'supplement' | 'cosmetic';
    subcategory?: string;
  }): Promise<LabellingRequirementsResult>;

  get_import_requirements(input: {
    product_category: 'food' | 'supplement' | 'cosmetic';
    origin_country?: string;
  }): Promise<ImportRequirementsResult>;

  get_regulation_update(input: {
    since?: string;               // ISO date
    category?: string;
  }): Promise<RegulationUpdateResult>;

  search_regulations(input: {
    query: string;                // semantic search over regulatory content
    limit?: number;
  }): Promise<RegulationSearchResult>;

  // Data ingestion tools (admin only)
  trigger_scrape(input: {
    mode: 'full' | 'change_detection' | 'specific_urls';
    urls?: string[];
  }): Promise<ScrapeResult>;

  get_ingestion_status(): Promise<IngestionStatusResult>;
}
```

#### 3.3.3 Compliance Engine Orchestrator — Multi-Jurisdiction Flow

When a user runs a compliance check against multiple markets, the orchestrator fans out to jurisdiction servers:

```typescript
// compliance-engine/check-product.ts

async function checkProductCompliance(
  product: Product,
  targetJurisdictions: string[]  // ['SG', 'MY', 'US']
): Promise<ComplianceReport> {
  
  // Step 1: Resolve ingredient names via shared ingredients server
  const resolvedIngredients = await callMCP(
    'sieve-ingredients',
    'resolve_ingredients',
    { ingredients: product.formulation }
  );

  // Step 2: Fan out to each jurisdiction server in parallel
  const jurisdictionResults = await Promise.all(
    targetJurisdictions.map(async (jurisdiction) => {
      const serverUrl = getJurisdictionServerUrl(jurisdiction);
      
      // Run all checks for this jurisdiction
      const [ingredientResults, claimsResults, labellingResults, importResults] = 
        await Promise.all([
          // Check each ingredient
          Promise.all(
            resolvedIngredients.map(ing =>
              callMCP(serverUrl, 'check_ingredient', {
                ingredient: ing.canonical_name,
                cas_number: ing.cas_number,
                product_category: product.category,
                concentration_pct: ing.concentration_pct,
              })
            )
          ),
          // Validate claims
          callMCP(serverUrl, 'validate_claims', {
            claims: product.claims,
            product_category: product.category,
            nutrition_info: product.nutrition_info,
          }),
          // Get labelling requirements
          callMCP(serverUrl, 'get_labelling_requirements', {
            product_category: product.category,
            subcategory: product.subcategory,
          }),
          // Get import requirements
          callMCP(serverUrl, 'get_import_requirements', {
            product_category: product.category,
            origin_country: product.origin_country,
          }),
        ]);

      return {
        jurisdiction,
        ingredientResults,
        claimsResults,
        labellingResults,
        importResults,
      };
    })
  );

  // Step 3: Aggregate findings, compute scores, generate report
  const findings = aggregateFindings(jurisdictionResults);
  const scores = computeScores(findings, targetJurisdictions);
  const report = await generateReport(product, findings, scores);

  return report;
}

function getJurisdictionServerUrl(jurisdiction: string): string {
  const servers: Record<string, string> = {
    'SG': 'https://sieve-sg.vercel.app/api/mcp',
    'MY': 'https://sieve-my.vercel.app/api/mcp',
    'US': 'https://sieve-us.vercel.app/api/mcp',
    'EU': 'https://sieve-eu.vercel.app/api/mcp',
    'TH': 'https://sieve-th.vercel.app/api/mcp',
    'ID': 'https://sieve-id.vercel.app/api/mcp',
    'PH': 'https://sieve-ph.vercel.app/api/mcp',
    'AU': 'https://sieve-au.vercel.app/api/mcp',
  };
  return servers[jurisdiction] || throw new Error(`Unsupported jurisdiction: ${jurisdiction}`);
}
```

#### 3.3.4 Shared Ingredients MCP Server

The ingredients server is the only cross-jurisdiction shared service. It owns the canonical ingredient database and provides fuzzy matching:

```typescript
// sieve-ingredients MCP tools:

interface IngredientsMCPServer {
  resolve_ingredients(input: {
    ingredients: { name: string; cas_number?: string }[];
  }): Promise<{
    resolved: {
      input_name: string;
      canonical_name: string;
      inci_name: string | null;
      cas_number: string | null;
      match_confidence: number;     // 0-1
      match_method: 'cas_exact' | 'inci_exact' | 'name_exact' | 'synonym' | 'fuzzy';
      synonyms: string[];
    }[];
    unresolved: {
      input_name: string;
      best_guess: string | null;
      confidence: number;
      requires_review: boolean;
    }[];
  }>;

  add_synonym(input: {
    canonical_name: string;
    new_synonym: string;
  }): Promise<void>;

  search_ingredient(input: {
    query: string;
    limit?: number;
  }): Promise<IngredientSearchResult[]>;
}
```

#### 3.3.5 Benefits of This Architecture

| Benefit | Details |
|---|---|
| **Independent deployment** | Ship a new jurisdiction without touching existing servers. A bug fix to SG regulations doesn't redeploy MY or US. |
| **Independent scaling** | If SG gets 10x more traffic than MY, only `sieve-sg` scales up. Vercel handles this automatically per-deployment. |
| **Independent data pipelines** | Each jurisdiction has its own Exa.ai scraping config, Browser Use automation scripts, PDF sources, cron schedules, and Claude Vision extraction prompts. Thai FDA may need completely different scraping strategies than Singapore SFA — some may rely heavily on Browser Use for interactive portals while others work fine with Exa.ai alone. |
| **Fault isolation** | If `sieve-eu-regulations` goes down (e.g., EFSA website structure changes and breaks scraping), Singapore and US checks continue working. |
| **Team parallelism** | Different team members (or contractors) can build different jurisdiction servers simultaneously without merge conflicts. |
| **Composability** | AI clients (Claude, etc.) can connect to individual jurisdiction servers directly, or to the orchestrator. A Malaysia-only consultant only needs `sieve-my-regulations`. |
| **Third-party distribution** | Each jurisdiction server is a standalone product. Could be offered individually on MCP marketplaces or to regulatory consultants. |
| **Data isolation per jurisdiction** | While sharing one Supabase instance, each jurisdiction server only reads/writes its own `jurisdiction`-scoped rows. RLS policies can enforce this. |

#### 3.3.6 Shared vs. Jurisdiction-Scoped Responsibilities

```
SHARED (Compliance Engine Orchestrator + Ingredients Server)
├── Canonical ingredient database (CAS, INCI, synonyms)
├── Fuzzy ingredient matching engine
├── Product management (CRUD, artwork storage)
├── Artwork → Claude Vision extraction (product label OCR)
├── Multi-jurisdiction compliance orchestration
├── Compliance scoring (aggregation across jurisdictions)
├── Report generation (PDF, Markdown)
├── User auth, teams, workspaces
├── Audit log
└── Billing / usage tracking

JURISDICTION-SCOPED (Per-Jurisdiction MCP Server)
├── Exa.ai scraping config (which URLs, which domains)
├── Browser Use automation scripts (which portals, which JS-rendered pages, which interactive flows)
├── Claude Vision PDF extraction prompts (jurisdiction-specific schemas)
├── Claude Agent SDK pipeline agents (long-running ingestion, change analysis, compliance orchestration)
├── Regulatory source registry (URLs, PDFs, scrape schedules)
├── Change detection + diff analysis
├── Ingredient regulation data (banned/restricted/permitted lists)
├── Labelling requirement data
├── Claims rules data
├── Import requirement data
├── Allergen declaration rules
├── Regulatory embeddings (pgvector, jurisdiction-scoped)
└── Cron jobs (jurisdiction-specific schedules)
```

---

## 4. Data Ingestion System (Phase 1: Singapore)

### 4.1 Overview

The data ingestion system is the foundation of Sieve AI's accuracy. It uses a **three-tier approach** to discover, scrape, and maintain structured regulatory data from Singapore's government websites:

**Tier 1 — Exa.ai (fast, cheap, handles ~80% of sources):**
Static HTML pages on regulatory sites → Exa.ai discovers and scrapes content → Claude API structures raw text into regulatory JSON → Supabase.

**Tier 2 — Browser Use (handles the ~20% Exa can't):**
JavaScript-rendered pages (SSO statutes), interactive portals (HSA PRISM), CAPTCHA-protected forms, dynamic PDF download links, and bot-blocked sites → Browser Use navigates as a real browser with anti-detect + proxy support → extracts content or downloads files → Claude API structures into regulatory JSON → Supabase.

**Tier 3 — Claude Vision (PDF extraction):**
PDFs downloaded by Tier 1 or Tier 2 → Claude Vision extracts and structures data in a single pass (no intermediate Markdown step) → Supabase.

**Orchestration — Claude Agent SDK:**
Long-running agentic workflows that coordinate the above tiers. The Agent SDK powers: multi-step compliance checks (fan-out to jurisdiction servers, aggregate, score, report), autonomous ingestion pipeline runs (discover → scrape → structure → validate → store as a single agent loop), regulatory change analysis (old vs. new diff → blast radius → notification), and sub-agent coordination (e.g., an ingredients resolution agent calls a labelling requirements agent).

Claude Vision is the unified AI layer for all document processing. This eliminates a separate PDF parsing vendor dependency and allows extraction + structuring in one API call. Since regulatory PDFs from SFA and HSA are machine-generated (not scanned), Claude Vision handles them with high accuracy — including complex multi-column tables, merged cells, footnotes, and multi-page ingredient lists like the ASEAN Cosmetic Directive Annexes (1,500+ prohibited substances).

Browser Use is the fallback layer for sources that Exa.ai cannot handle. It runs a real headless browser with LLM-driven navigation, meaning it can handle JavaScript rendering, navigate multi-step government portals, solve CAPTCHAs, and bypass bot detection — all through natural language instructions to the agent. Key Singapore use cases:
- **Singapore Statutes Online (sso.agc.gov.sg):** JS-rendered legislation pages that Exa's crawler cannot render.
- **HSA PRISM / VNS portal:** Interactive search forms for health supplement positive ingredient lists — requires typing ingredient names, clicking search, and extracting result tables.
- **Dynamic PDF download links:** Some HSA/SFA PDFs are behind click-through pages or dynamically generated URLs that require browser navigation to resolve.
- **Bot-blocked government sites:** Any .gov.sg site that returns 403s to automated crawlers.

The ingestion flow follows a **tiered fallback pattern:** Exa.ai tries first. If it gets empty content, a 403, JavaScript-dependent content, or a known interactive portal URL, it falls back to Browser Use. Browser Use navigates the page, extracts content (or downloads the PDF), and passes it downstream to Claude for structuring.

The pipeline runs in three stages: **Discover → Extract → Structure**.

### 4.2 Singapore Regulatory Source URLs

#### 4.2.1 Singapore Food Agency (SFA) — sfa.gov.sg

**Primary regulation pages:**

| Category | URL Pattern | Content Type |
|---|---|---|
| Food Safety & Security Act | `sfa.gov.sg/legislation/food-safety-and-security-act` | Primary legislation, amendments |
| Sale of Food Act + Food Regulations | `sfa.gov.sg/legislation` → "Sale of Food Act" | Food additives, contaminants, labelling rules |
| Food Additives Permitted List (PDF) | `sfa.gov.sg/docs/default-source/tools-and-resources/list-of-food-additives-permitted-under-food-regulations*.pdf` | Full permitted additives with limits per food category |
| Regulatory Limits Overview | `sfa.gov.sg/regulatory-standards-frameworks-guidelines/food-safety-regulatory-limits/overview-on-food-safety-regulatory-limits` | Additive limits, contaminant limits |
| Nutrition Labelling Guidelines | `sfa.gov.sg/food-information/nutrition-labelling` | NIP requirements, format rules, rounding |
| Health & Nutrition Claims | `sfa.gov.sg/food-information/nutrition-health-claims` | Permitted claims, conditions, thresholds |
| Nutri-Grade Labelling | `sfa.gov.sg/nutri-grade` | Beverage grading (A-D), sugar/sat fat thresholds |
| Allergen Requirements | `sfa.gov.sg/food-information/food-allergy-and-intolerance` | Mandatory allergen declarations |
| Import Requirements | `sfa.gov.sg/food-businesses/imports` | Licence requirements, permits, accredited sources |
| Food & Food Products Allowed | `sfa.gov.sg/bringing-food-for-private-consumption-from-overseas/list-of-food---food-products-allowed` | Allowed products list |
| Novel Foods | `sfa.gov.sg/food-businesses/novel-food` | Novel food approval requirements |
| Public Consultations | `sfa.gov.sg/public-consultation` | Upcoming regulatory changes |

**Additional SFA resources:**
- Singapore Statutes Online (sso.agc.gov.sg) — authoritative full text of Food Regulations
- SFA circulars and industry advisories

#### 4.2.2 Health Sciences Authority (HSA) — hsa.gov.sg

**Cosmetics regulation pages:**

| Category | URL Pattern | Content Type |
|---|---|---|
| Cosmetic Products Overview | `hsa.gov.sg/cosmetic-products/overview` | Regulatory framework, requirements summary |
| ASEAN Cosmetic Directive | `hsa.gov.sg/cosmetic-products/asean-cosmetic-directive` | ACD overview, links to Annexes |
| Annex II (Banned Substances) | ACD Annex II PDF (linked from directive page) | ~1,500+ prohibited substances |
| Annex III (Restricted) | ACD Annex III PDF | Restricted substances with conditions |
| Annex IV (Colorants) | ACD Annex IV PDF | Permitted colorants |
| Annex V (Preservatives) | ACD Annex V PDF | Permitted preservatives + limits |
| Annex VI (UV Filters) | ACD Annex VI PDF | Permitted UV filters + limits |
| Cosmetic Notification | `hsa.gov.sg/cosmetic-products/notification` | PRISM notification process |
| GMP Certification | `hsa.gov.sg/cosmetic-products/gmp` | Manufacturing requirements |
| Cosmetic Guidelines PDF | `hsa.gov.sg/docs/default-source/hprg-cosmetics/guidelines-on-the-control-of-cosmetic-products.pdf` | Full HSA cosmetics control guide |
| Cosmetic Claims | ASEAN Cosmetic Claims Guideline (Appendix III) | Permitted claims framework |

**Health supplements pages:**

| Category | URL Pattern | Content Type |
|---|---|---|
| Health Supplements Overview | `hsa.gov.sg/health-supplements` | Regulatory framework |
| Voluntary Notification | `hsa.gov.sg/vns` | Notification process, positive list |
| Health Supplement Claims | `hsa.gov.sg/health-supplements/claims` | Permitted claims |
| Positive Ingredient List | HSA VNS search tool | Approved ingredients + conditions |
| List of Notified HS and TM | `hsa.gov.sg/health-supplements/list-of-notified-hs-and-tm` | Published notified products |
| Chinese Proprietary Medicines | `hsa.gov.sg/chinese-proprietary-medicines` | CPM regulations (parallel category) |

#### 4.2.3 Singapore Statutes Online (sso.agc.gov.sg)

| Category | URL Pattern | Content Type |
|---|---|---|
| Sale of Food Act (Cap 283) | `sso.agc.gov.sg/Act/SFA1973` | Primary legislation text |
| Food Regulations | `sso.agc.gov.sg/SL/SFA1973-RG1` | Full regulatory schedules |
| Food Safety and Security Act 2024 | `sso.agc.gov.sg/Acts-Supp/27-2024` | New FSSA (replaces Sale of Food Act progressively) |
| Health Products Act | `sso.agc.gov.sg/Act/HPA2007` | HSA governing legislation |
| ACD Regulations | `sso.agc.gov.sg/SL/HPA2007-S321-2007` | Cosmetic product regulations |

#### 4.2.4 Additional Sources

| Source | URL | Content Type |
|---|---|---|
| NEA (Environmental) | `nea.gov.sg` | Packaging, environmental claims |
| ASEAN Cosmetic Committee | `asean.org/our-communities/economic-community/directorate-of-standards-and-conformance/` | Regional harmonisation updates |
| Singapore Customs | `customs.gov.sg` | Free Sale Certificates, import/export |
| SPRING SG / Enterprise SG | `enterprisesg.gov.sg` | Product standards, testing |

### 4.3 Exa.ai Ingestion Pipeline

#### 4.3.1 Stage 1: Discover (URL Discovery)

Use Exa.ai's search endpoint with domain filtering to discover all relevant pages within regulatory websites.

```typescript
// discover-regulatory-pages.ts

import Exa from 'exa-js';

const exa = new Exa(process.env.EXA_API_KEY);

const SG_REGULATORY_DOMAINS = [
  'sfa.gov.sg',
  'hsa.gov.sg',
  'sso.agc.gov.sg',
  'nea.gov.sg',
];

const DISCOVERY_QUERIES = [
  // SFA - Food
  'Singapore food regulations permitted additives limits',
  'Singapore food labelling requirements nutrition panel',
  'Singapore food import requirements licence permit',
  'Singapore allergen declaration requirements food',
  'Singapore nutri-grade labelling beverages',
  'Singapore health claims nutrition claims food',
  'Singapore novel food approval requirements',
  'Singapore food contaminants limits heavy metals pesticides',
  
  // HSA - Cosmetics
  'Singapore cosmetic products regulation ASEAN directive',
  'ASEAN cosmetic directive annex prohibited restricted ingredients',
  'Singapore cosmetic product notification PRISM',
  'Singapore cosmetic labelling requirements INCI',
  'Singapore cosmetic claims guidelines',
  
  // HSA - Health Supplements
  'Singapore health supplements regulation HSA',
  'Singapore health supplement permitted ingredients positive list',
  'Singapore health supplement claims permitted',
  'Singapore health supplement voluntary notification',
  
  // Legislation
  'Singapore Sale of Food Act food regulations',
  'Singapore Health Products Act cosmetic regulations',
  'Singapore Food Safety Security Act 2024',
];

async function discoverPages(query: string, domains: string[]) {
  const results = await exa.search(query, {
    includeDomains: domains,
    numResults: 25,
    text: true,
    type: 'auto',
  });
  return results;
}

// Run discovery across all queries
async function fullDiscovery() {
  const allUrls = new Set<string>();
  
  for (const query of DISCOVERY_QUERIES) {
    const results = await discoverPages(query, SG_REGULATORY_DOMAINS);
    for (const result of results.results) {
      allUrls.add(result.url);
    }
  }
  
  // Also crawl subpages from known root URLs
  const rootUrls = [
    'https://www.sfa.gov.sg/regulatory-standards-frameworks-guidelines',
    'https://www.sfa.gov.sg/legislation',
    'https://www.hsa.gov.sg/cosmetic-products',
    'https://www.hsa.gov.sg/health-supplements',
  ];
  
  for (const url of rootUrls) {
    const contents = await exa.getContents([url], {
      text: true,
      subpages: 20,    // crawl up to 20 subpages
      subpageTarget: 'regulatory requirements ingredients labelling',
    });
    for (const page of contents.results) {
      allUrls.add(page.url);
    }
  }
  
  return Array.from(allUrls);
}
```

#### 4.3.2 Stage 2: Extract (Content Retrieval)

**Path 1 — HTML pages:** Fetch full page content from each discovered URL using Exa's contents endpoint.

```typescript
// extract-html-content.ts

interface RegulatoryPage {
  url: string;
  title: string;
  content_text: string;
  published_date: string | null;
  domain: string;
  regulatory_body: 'SFA' | 'HSA' | 'NEA' | 'SSO' | 'OTHER';
  content_type: 'html' | 'pdf';
  scraped_at: string;
  content_hash: string;  // SHA-256 for change detection
}

async function extractHtmlContent(urls: string[]): Promise<RegulatoryPage[]> {
  const batches = chunk(urls, 10);
  const pages: RegulatoryPage[] = [];
  
  for (const batch of batches) {
    const results = await exa.getContents(batch, {
      text: true,
      highlights: {
        numSentences: 3,
        query: 'regulatory requirement compliance ingredient limit',
      },
    });
    
    for (const result of results.results) {
      pages.push({
        url: result.url,
        title: result.title || '',
        content_text: result.text || '',
        published_date: result.publishedDate || null,
        domain: new URL(result.url).hostname,
        regulatory_body: classifyRegulatoryBody(result.url),
        content_type: 'html',
        scraped_at: new Date().toISOString(),
        content_hash: sha256(result.text || ''),
      });
    }
    
    await sleep(1000);  // Rate limiting
  }
  
  return pages;
}
```

**Path 2 — PDF documents:** Download PDFs and send directly to Claude Vision for extraction + structuring in a single pass.

```typescript
// extract-pdf-content.ts

import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';

const anthropic = new Anthropic();

// Known regulatory PDF URLs to track
const SG_REGULATORY_PDFS = [
  {
    url: 'https://www.sfa.gov.sg/docs/default-source/tools-and-resources/list-of-food-additives-permitted-under-food-regulations.pdf',
    regulatory_body: 'SFA',
    description: 'SFA Permitted Food Additives List',
    data_type: 'ingredient_regulation',
  },
  {
    url: 'https://www.hsa.gov.sg/docs/default-source/hprg-cosmetics/guidelines-on-the-control-of-cosmetic-products.pdf',
    regulatory_body: 'HSA',
    description: 'HSA Cosmetic Products Control Guidelines',
    data_type: 'mixed',  // contains labelling, ingredients, claims rules
  },
  // ASEAN Cosmetic Directive Annexes (URLs resolved from HSA directive page)
  {
    url: '{resolved_annex_ii_url}',
    regulatory_body: 'HSA',
    description: 'ASEAN Annex II - Prohibited Substances',
    data_type: 'ingredient_regulation',
  },
  {
    url: '{resolved_annex_iii_url}',
    regulatory_body: 'HSA',
    description: 'ASEAN Annex III - Restricted Substances',
    data_type: 'ingredient_regulation',
  },
  {
    url: '{resolved_annex_iv_url}',
    regulatory_body: 'HSA',
    description: 'ASEAN Annex IV - Permitted Colorants',
    data_type: 'ingredient_regulation',
  },
  {
    url: '{resolved_annex_v_url}',
    regulatory_body: 'HSA',
    description: 'ASEAN Annex V - Permitted Preservatives',
    data_type: 'ingredient_regulation',
  },
  {
    url: '{resolved_annex_vi_url}',
    regulatory_body: 'HSA',
    description: 'ASEAN Annex VI - Permitted UV Filters',
    data_type: 'ingredient_regulation',
  },
];

async function extractPdfWithClaudeVision(
  pdfUrl: string,
  regulatoryBody: string,
  dataType: string,
  description: string
): Promise<{
  structured_data: any;
  content_hash: string;
  page_count: number;
}> {
  // Step 1: Download PDF
  const pdfResponse = await fetch(pdfUrl);
  const pdfBuffer = await pdfResponse.arrayBuffer();
  const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
  const contentHash = createHash('sha256')
    .update(Buffer.from(pdfBuffer))
    .digest('hex');

  // Step 2: Send to Claude Vision — extract + structure in ONE call
  // For large PDFs (>50 pages), split into page ranges and process in parallel
  const pdfPageCount = estimatePageCount(pdfBuffer);
  
  if (pdfPageCount <= 50) {
    // Single pass for smaller PDFs
    return await processPdfChunk(pdfBase64, regulatoryBody, dataType, description, contentHash, pdfPageCount);
  } else {
    // Paginated processing for large PDFs (e.g., ASEAN Annex II has 200+ pages)
    return await processPdfPaginated(pdfUrl, regulatoryBody, dataType, description, contentHash, pdfPageCount);
  }
}

async function processPdfChunk(
  pdfBase64: string,
  regulatoryBody: string,
  dataType: string,
  description: string,
  contentHash: string,
  pageCount: number
) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: buildPdfExtractionPrompt(regulatoryBody, dataType, description),
          },
        ],
      },
    ],
  });

  const structuredData = JSON.parse(
    response.content[0].type === 'text' ? response.content[0].text : ''
  );

  return {
    structured_data: structuredData,
    content_hash: contentHash,
    page_count: pageCount,
  };
}

function buildPdfExtractionPrompt(
  regulatoryBody: string,
  dataType: string,
  description: string
): string {
  return `You are a regulatory data extraction expert. This PDF is from the 
${regulatoryBody} (Singapore). Document: ${description}.

Extract ALL data into structured JSON. This is a COMPLETE extraction — do not 
skip any entries, even if there are hundreds. Accuracy is critical as this data 
will be used for automated compliance checking.

${dataType === 'ingredient_regulation' ? `
Extract every ingredient/substance entry into this format:
{
  "type": "ingredient_regulation",
  "source_document": "${description}",
  "extraction_date": "${new Date().toISOString()}",
  "entries": [
    {
      "ref_number": string | null,          // reference number in the document
      "ingredient_name": string,             // primary name as listed
      "inci_name": string | null,            // INCI name if provided
      "cas_number": string | null,           // CAS registry number if provided
      "ec_number": string | null,            // EC number if provided
      "status": "banned" | "restricted" | "permitted" | "permitted_with_limits",
      "product_types": string[],             // e.g., ["leave-on", "rinse-off", "oral care"]
      "max_concentration_pct": number | null, // maximum allowed concentration
      "max_daily_dose_mg": number | null,    // for supplements
      "conditions_of_use": string[],         // specific conditions
      "required_label_warnings": string[],   // warnings that must appear on label
      "other_limitations": string[],         // any other restrictions
      "regulation_reference": string,        // regulation/annex reference
      "footnotes": string[]                  // any footnotes or annotations
    }
  ],
  "total_entries_extracted": number
}` : ''}

${dataType === 'mixed' ? `
This document contains multiple types of regulatory data. Extract each type separately:

1. INGREDIENT REGULATIONS (banned, restricted, permitted substances)
2. LABELLING REQUIREMENTS (mandatory label elements, format rules)  
3. CLAIMS RULES (permitted/prohibited claims and conditions)
4. IMPORT/REGISTRATION REQUIREMENTS (licences, notifications, documents needed)

Return as:
{
  "type": "mixed",
  "source_document": "${description}",
  "extraction_date": "${new Date().toISOString()}",
  "ingredient_regulations": [...],
  "labelling_requirements": [...],
  "claims_rules": [...],
  "import_requirements": [...]
}` : ''}

IMPORTANT:
- Extract EVERY row/entry from tables. Do not summarise or skip entries.
- Preserve exact concentration limits, CAS numbers, and reference numbers.
- If a cell is empty or not applicable, use null.
- If footnotes modify an entry's conditions, include them in that entry.
- Return valid JSON only, no markdown fences or commentary.`;
}

// For large PDFs: download, convert pages to images, process in batches
async function processPdfPaginated(
  pdfUrl: string,
  regulatoryBody: string, 
  dataType: string,
  description: string,
  contentHash: string,
  totalPages: number
): Promise<any> {
  const PAGES_PER_BATCH = 20;
  const allEntries: any[] = [];
  
  for (let startPage = 0; startPage < totalPages; startPage += PAGES_PER_BATCH) {
    const endPage = Math.min(startPage + PAGES_PER_BATCH, totalPages);
    
    // Extract page range as separate PDF or images
    // (implementation depends on PDF library — e.g., pdf-lib for splitting)
    const pageRangeBase64 = await extractPageRange(pdfUrl, startPage, endPage);
    
    const result = await processPdfChunk(
      pageRangeBase64,
      regulatoryBody,
      dataType,
      `${description} (pages ${startPage + 1}-${endPage})`,
      contentHash,
      endPage - startPage
    );
    
    if (result.structured_data?.entries) {
      allEntries.push(...result.structured_data.entries);
    }
    
    // Rate limiting for Claude API
    await sleep(2000);
  }
  
  return {
    structured_data: {
      type: dataType,
      source_document: description,
      extraction_date: new Date().toISOString(),
      entries: allEntries,
      total_entries_extracted: allEntries.length,
    },
    content_hash: contentHash,
    page_count: totalPages,
  };
}
```

#### 4.3.3 Stage 3: Structure & Store

For **HTML content**, Claude API transforms raw scraped text into structured regulatory data.
For **PDF content**, this step is already done — Claude Vision extracts AND structures in a single pass (Stage 2).

Both paths converge at the Supabase write step:

```typescript
// store-structured-data.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function storeStructuredData(
  sourceId: string,
  structuredData: any,
  jurisdiction: string = 'SG'
) {
  // Route to appropriate tables based on data type
  if (structuredData.type === 'ingredient_regulation' || structuredData.ingredient_regulations) {
    const entries = structuredData.entries || structuredData.ingredient_regulations;
    await storeIngredientRegulations(entries, sourceId, jurisdiction);
  }
  
  if (structuredData.type === 'labelling_requirement' || structuredData.labelling_requirements) {
    const entries = structuredData.entries || structuredData.labelling_requirements;
    await storeLabellingRequirements(entries, sourceId, jurisdiction);
  }
  
  if (structuredData.type === 'claims_rule' || structuredData.claims_rules) {
    const entries = structuredData.entries || structuredData.claims_rules;
    await storeClaimsRules(entries, sourceId, jurisdiction);
  }
  
  if (structuredData.type === 'import_requirement' || structuredData.import_requirements) {
    const entries = structuredData.entries || structuredData.import_requirements;
    await storeImportRequirements(entries, sourceId, jurisdiction);
  }
  
  // Update source record
  await supabase
    .from('regulatory_sources')
    .update({
      structured_data: structuredData,
      scrape_status: 'structured',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId);
}

async function storeIngredientRegulations(
  entries: any[],
  sourceId: string,
  jurisdiction: string
) {
  for (const entry of entries) {
    // Upsert ingredient (create if not exists)
    const { data: ingredient } = await supabase
      .from('ingredients')
      .upsert({
        canonical_name: entry.ingredient_name,
        inci_name: entry.inci_name,
        cas_number: entry.cas_number,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'canonical_name',
      })
      .select('id')
      .single();

    if (!ingredient) continue;

    // Upsert regulation entry
    await supabase
      .from('ingredient_regulations')
      .upsert({
        ingredient_id: ingredient.id,
        jurisdiction,
        regulatory_body: entry.regulatory_body || 'SFA',
        status: entry.status,
        product_categories: entry.product_types || entry.product_categories || [],
        max_concentration_pct: entry.max_concentration_pct,
        max_daily_dose_mg: entry.max_daily_dose_mg,
        conditions: {
          conditions_of_use: entry.conditions_of_use || entry.conditions || [],
          other_limitations: entry.other_limitations || [],
          footnotes: entry.footnotes || [],
        },
        required_warnings: entry.required_label_warnings || entry.required_warnings || [],
        regulation_reference: entry.regulation_reference,
        annex_reference: entry.annex_reference,
        source_id: sourceId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'ingredient_id,jurisdiction,regulatory_body,product_categories',
      });
  }
}
```

**HTML structuring prompt** (for Exa-scraped web pages — same as before):

```typescript
// structure-html-content.ts

const htmlStructuringPrompt = `
You are a regulatory data extraction expert. Given the following content 
scraped from a Singapore regulatory website, extract structured data 
into the specified JSON format.

Source URL: {url}
Regulatory Body: {regulatory_body}
Content: {content_text}

Extract into the following structure where applicable:

For INGREDIENT REGULATIONS:
{
  "type": "ingredient_regulation",
  "entries": [{
    "ingredient_name": string,
    "inci_name": string | null,
    "cas_number": string | null,
    "status": "banned" | "restricted" | "permitted" | "permitted_with_limits",
    "product_categories": string[],
    "max_concentration_pct": number | null,
    "max_daily_dose_mg": number | null,
    "conditions": string[],
    "required_warnings": string[],
    "regulation_reference": string,
    "annex_reference": string | null,
    "effective_date": string | null
  }]
}

For LABELLING REQUIREMENTS:
{
  "type": "labelling_requirement",
  "entries": [{
    "element": string,
    "mandatory": boolean,
    "product_categories": string[],
    "description": string,
    "format_rules": string | null,
    "exemptions": string[],
    "regulation_reference": string
  }]
}

For CLAIMS RULES:
{
  "type": "claims_rule",
  "entries": [{
    "claim_text": string,
    "claim_type": "nutrition" | "health" | "therapeutic" | "marketing",
    "status": "permitted" | "prohibited" | "conditional",
    "conditions": object | null,
    "product_categories": string[],
    "regulation_reference": string
  }]
}

For IMPORT REQUIREMENTS:
{
  "type": "import_requirement",
  "entries": [{
    "requirement": string,
    "product_categories": string[],
    "documents_required": string[],
    "licensing_body": string,
    "regulation_reference": string
  }]
}

Only extract data that is explicitly stated in the source content.
Include the exact regulation reference where available.
Return valid JSON only.
`;
```

### 4.4 Browser Use Integration (Tier 2 Ingestion)

Browser Use is an open-source AI browser automation framework that gives an LLM full control of a headless browser. It handles the ~20% of regulatory sources that Exa.ai cannot reach: JavaScript-rendered pages, interactive portals, CAPTCHA-protected forms, and bot-blocked sites.

#### 4.4.1 When to Use Browser Use vs. Exa.ai

| Scenario | Use Exa.ai | Use Browser Use |
|---|---|---|
| Static HTML regulatory page | ✅ | |
| JavaScript-rendered content (SSO) | | ✅ |
| Interactive portal with search forms (HSA PRISM) | | ✅ |
| PDF behind direct download URL | ✅ (fetch URL) | |
| PDF behind click-through or dynamic link | | ✅ (navigate + download) |
| Site returning 403 to automated crawlers | | ✅ (anti-detect + proxy) |
| CAPTCHA-protected page | | ✅ (CAPTCHA solving) |
| Content requiring login/session (future) | | ✅ |

#### 4.4.2 Tiered Fallback Logic

```typescript
// tiered-ingestion.ts

import { Agent } from 'browser-use';
import Exa from 'exa-js';

interface IngestionResult {
  content: string;
  source: 'exa' | 'browser_use';
  url: string;
  fetchedAt: string;
}

// Known sources that require Browser Use (skip Exa entirely)
const BROWSER_USE_ONLY_DOMAINS = [
  'sso.agc.gov.sg',           // JS-rendered legislation
  'prism.hsa.gov.sg',         // Interactive portal
  'eservice.hsa.gov.sg',      // E-services with forms
];

const BROWSER_USE_ONLY_URLS = [
  // HSA VNS positive ingredient list search
  'hsa.gov.sg/health-supplements/vns',
  // Any URL pattern that requires navigation
];

async function ingestUrl(url: string): Promise<IngestionResult> {
  const domain = new URL(url).hostname;
  
  // Skip Exa for known interactive/JS sources
  if (BROWSER_USE_ONLY_DOMAINS.some(d => domain.includes(d)) ||
      BROWSER_USE_ONLY_URLS.some(u => url.includes(u))) {
    return await ingestViaBrowserUse(url);
  }
  
  // Try Exa first
  try {
    const exaResult = await exa.getContents([url], {
      text: { maxCharacters: 50000 },
      livecrawl: 'always',
    });
    
    const content = exaResult.results[0]?.text;
    
    // Fallback conditions: empty, too short, or error indicators
    if (!content || content.length < 100 || content.includes('Please enable JavaScript')) {
      console.log(`Exa returned insufficient content for ${url}, falling back to Browser Use`);
      return await ingestViaBrowserUse(url);
    }
    
    return { content, source: 'exa', url, fetchedAt: new Date().toISOString() };
  } catch (error) {
    // 403, timeout, or other Exa failure
    console.log(`Exa failed for ${url}: ${error.message}, falling back to Browser Use`);
    return await ingestViaBrowserUse(url);
  }
}

async function ingestViaBrowserUse(url: string): Promise<IngestionResult> {
  const agent = new Agent({
    task: `Navigate to ${url} and extract all regulatory content from the page. 
           Wait for all JavaScript to render. Extract the full text content including 
           all tables, lists, and footnotes. If the page has pagination, navigate 
           through all pages and combine the content.`,
    llm: anthropicModel,  // Claude Sonnet for cost efficiency
    browser_config: {
      headless: true,
      // Anti-detect and proxy config for government sites
    },
  });
  
  const result = await agent.run();
  return { 
    content: result.final_result, 
    source: 'browser_use', 
    url, 
    fetchedAt: new Date().toISOString() 
  };
}
```

#### 4.4.3 Singapore-Specific Browser Use Agents

**Agent 1: HSA Health Supplement Positive Ingredient List Scraper**

The HSA VNS portal has an interactive search form — you must type an ingredient name, click search, and read the results table. No static page exists with the full list.

```typescript
const hsaIngredientAgent = new Agent({
  task: `Go to the HSA health supplement VNS positive ingredient list search page.
         For each letter A through Z:
         1. Type the letter into the search box
         2. Click Search
         3. Extract ALL results from the table (ingredient name, permitted dosage, conditions)
         4. If there are multiple pages of results, click through all pages
         5. Compile all results into a structured JSON array
         Return the complete list as JSON with fields: 
         ingredient_name, max_daily_dose, conditions, category`,
  llm: anthropicModel,
  max_steps: 200,  // Many iterations needed
});
```

**Agent 2: Singapore Statutes Online (SSO) Legislation Scraper**

SSO renders legislation content via JavaScript — the page source is empty without JS execution.

```typescript
const ssoAgent = new Agent({
  task: `Navigate to Singapore Statutes Online (sso.agc.gov.sg).
         Search for "Sale of Food Act" and navigate to the current version.
         For each Part and Section of the Act:
         1. Click to expand the section
         2. Extract the full text including subsections, schedules, and amendments
         3. Note the revision date and any pending amendments
         Return the complete structured text of the Act with section numbers.`,
  llm: anthropicModel,
});
```

**Agent 3: Dynamic PDF Link Resolver**

Some regulatory PDFs on HSA/SFA sites are behind click-through pages or dynamically generated download links.

```typescript
const pdfResolverAgent = new Agent({
  task: `Navigate to ${regulatoryPageUrl}.
         Find the download link for "${pdfDocumentName}".
         Click through any intermediate pages or accept-terms dialogs.
         Download the PDF file and save it locally.
         Return the final direct download URL and the file path.`,
  llm: anthropicModel,
});
// After agent completes, send downloaded PDF to Claude Vision for extraction
```

#### 4.4.4 Browser Use Configuration

```typescript
// browser-use-config.ts

export const browserUseConfig = {
  // Use managed cloud browsers for production
  browser_config: {
    headless: true,
    // Singapore proxy for .gov.sg sites
    proxy: {
      server: process.env.PROXY_SERVER,
      country: 'SG',
    },
    // Anti-detect settings
    stealth: true,
  },
  
  // LLM config — use Sonnet for cost efficiency (not Opus)
  llm_config: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    api_key: process.env.ANTHROPIC_API_KEY,
  },
  
  // Rate limiting to be respectful to government sites
  rate_limit: {
    max_concurrent: 2,          // Max 2 parallel browser sessions per jurisdiction
    delay_between_actions: 1000, // 1 second between actions
    max_page_loads_per_minute: 10,
  },
};
```

#### 4.4.5 Browser Use Cost Estimates (per jurisdiction/month)

| Operation | Frequency | Est. Monthly Runs | Est. Monthly Cost |
|---|---|---|---|
| SSO legislation scraping | Monthly | 4 agent runs | ~$1-2 (LLM tokens) |
| HSA VNS ingredient list | Monthly | 2 agent runs | ~$2-4 (extensive navigation) |
| Dynamic PDF resolution | As needed | ~10 agent runs | ~$0.50-1 |
| Fallback from Exa failures | Ad hoc | ~20 agent runs | ~$1-3 |
| **Browser Use subtotal** | | **~36 runs** | **~$5-10/month** |

Note: Browser Use is open-source and self-hostable. The main cost is LLM API tokens for the agent's reasoning. If using Browser Use Cloud, there may be additional infrastructure fees (~$0.01-0.05/run).

### 4.5 Claude Agent SDK Integration

The Claude Agent SDK (formerly Claude Code SDK) provides the same agentic infrastructure that powers Claude Code — built-in tools for file operations, bash execution, sub-agent coordination, MCP server integration, and long-running autonomous workflows. For Sieve AI, the Agent SDK powers several critical agentic systems.

#### 4.5.1 Where the Agent SDK Is Used

| Use Case | Why Agent SDK (not raw Claude API) | Key Capabilities Used |
|---|---|---|
| **Compliance Engine Orchestrator** | Multi-step workflow: resolve ingredients → fan-out to jurisdiction servers → aggregate findings → compute scores → generate report. Requires tool use, MCP calls, and stateful multi-turn reasoning. | MCP integration, sub-agents, built-in tools |
| **Data Ingestion Pipeline Agent** | Autonomous pipeline: discover URLs → scrape → detect changes → re-extract → structure → validate → store. Needs to read/write files, run commands, call APIs, and handle errors. | Bash tool, file I/O, sessions, error recovery |
| **Regulatory Change Analysis Agent** | Long-running analysis: receive old vs. new regulatory data → diff → identify changes → assess blast radius (which products affected) → draft notifications → update database. | Extended thinking, structured outputs, MCP |
| **Product Compliance Check Agent** | Complex multi-jurisdiction fan-out: classify product → determine applicable jurisdictions → call each jurisdiction MCP server in parallel → aggregate → score → generate human-readable report with citations. | Sub-agents (one per jurisdiction), MCP connector |
| **Artwork Extraction Agent** | Multi-step extraction from packaging images: OCR text → identify ingredient list vs. nutrition panel vs. claims vs. product name → structure each into typed JSON → validate against known formats. | Vision, structured outputs, file I/O |
| **Regulatory Research Agent** | Deep research for ambiguous compliance questions: search regulatory databases → fetch relevant statutes → cross-reference guidance documents → synthesize an answer with citations. | Web search, web fetch, MCP, extended thinking |

#### 4.5.2 Compliance Engine Orchestrator (Agent SDK Implementation)

The central orchestrator is the highest-value Agent SDK use case. It replaces simple API calls with a stateful agent that can reason through complex compliance logic.

```python
# compliance_orchestrator_agent.py

import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def run_compliance_check(product_data: dict, target_jurisdictions: list[str]):
    """
    Run a full compliance check using the Claude Agent SDK.
    The agent autonomously:
    1. Resolves ingredients via the shared ingredients MCP server
    2. Classifies the product (food vs. supplement vs. cosmetic)
    3. Fans out to each jurisdiction MCP server
    4. Aggregates findings
    5. Computes compliance + readiness scores
    6. Generates a structured report
    """
    
    system_prompt = """You are the Sieve AI Compliance Engine. You have access to 
    multiple MCP servers for regulatory compliance checking:
    
    - sieve-ingredients (ingredient resolution, CAS/INCI matching)
    - sieve-sg-regulations (Singapore: SFA, HSA, NEA)
    - sieve-my-regulations (Malaysia: NPRA, MOH)
    [... additional jurisdiction servers ...]
    
    For each compliance check:
    1. First resolve ALL ingredients using sieve-ingredients/resolve_ingredients
    2. Classify the product using sieve-{jurisdiction}/classify_product
    3. For each target jurisdiction, call these tools IN PARALLEL:
       - check_ingredient (for each resolved ingredient)
       - validate_claims (for all product claims)
       - get_labelling_requirements (for the product category)
       - get_import_requirements (for the product category)
    4. Aggregate all findings with severity levels (critical/major/minor/info)
    5. Compute compliance_score = 100 - (critical × 25) - (major × 10) - (minor × 3)
    6. Return structured JSON report
    
    Always cite the specific regulation for each finding."""
    
    options = ClaudeAgentOptions(
        system_prompt=system_prompt,
        model="claude-sonnet-4-5-20250929",
        # Connect to all jurisdiction MCP servers
        mcp_servers=[
            {"url": "https://sieve-ingredients.vercel.app/mcp", "name": "sieve-ingredients"},
            *[
                {"url": f"https://sieve-{j}.vercel.app/mcp", "name": f"sieve-{j}-regulations"}
                for j in target_jurisdictions
            ],
        ],
        max_turns=20,
        # Return structured compliance report
        # structured_output=ComplianceReportSchema,
    )
    
    prompt = f"""Run a full compliance check for this product across {target_jurisdictions}:
    
    Product Data:
    {json.dumps(product_data, indent=2)}
    
    Check all dimensions: ingredients, claims, labelling, import requirements, 
    allergen declarations, and registration/notification requirements."""
    
    report = None
    async for message in query(prompt=prompt, options=options):
        if hasattr(message, 'result'):
            report = message.result
    
    return report
```

#### 4.5.3 Data Ingestion Pipeline Agent

Instead of rigid cron-triggered scripts, the Agent SDK enables an autonomous ingestion agent that can reason about failures and adapt.

```python
# ingestion_pipeline_agent.py

async def run_ingestion_pipeline(jurisdiction: str, mode: str = "daily_check"):
    """
    Autonomous data ingestion agent that:
    - Discovers new/changed regulatory pages
    - Decides whether to use Exa.ai or Browser Use for each URL
    - Extracts and structures content
    - Validates structured data against schema
    - Stores in Supabase with proper versioning
    - Handles errors gracefully (retries, fallbacks, alerts)
    """
    
    system_prompt = f"""You are the Sieve AI Data Ingestion Agent for {jurisdiction}.
    
    Your job is to keep the regulatory database up to date.
    
    You have access to:
    - Bash tool (to run scripts, call APIs, process files)
    - Read/Write tools (to manage local files)
    - The Supabase database (via environment variables)
    
    Ingestion tiers:
    1. Try Exa.ai first for HTML pages (fast, cheap)
    2. Fall back to Browser Use for: JS-rendered pages, interactive portals, 
       CAPTCHA-protected sites, bot-blocked URLs
    3. Use Claude Vision for PDF extraction (downloaded by Tier 1 or 2)
    
    For a '{mode}' run:
    - daily_check: Check known URLs for content hash changes, re-extract if changed
    - weekly_full: Re-scrape all URLs, discover new pages, full re-extraction
    - monthly_deep: Full re-scrape + re-embed all content for vector search
    
    Always version data updates with format: {jurisdiction.upper()}-YYYY-MM-DD-NNN
    Always log what changed and why.
    If a source consistently fails, create an alert (don't silently skip it)."""
    
    options = ClaudeAgentOptions(
        system_prompt=system_prompt,
        allowed_tools=["Bash", "Read", "Write", "Glob"],
        max_turns=50,  # Complex pipeline may need many steps
        permission_mode='acceptEdits',  # Auto-accept file operations
    )
    
    async for message in query(
        prompt=f"Run a {mode} ingestion pipeline for {jurisdiction}.",
        options=options,
    ):
        # Stream progress to monitoring dashboard
        if hasattr(message, 'content'):
            log_pipeline_progress(jurisdiction, message)
```

#### 4.5.4 Regulatory Change Analysis Agent

When a content hash change is detected, this agent performs deep analysis of what changed and its impact.

```python
# change_analysis_agent.py

async def analyze_regulatory_change(
    jurisdiction: str,
    source_url: str,
    old_structured_data: dict,
    new_structured_data: dict,
):
    """
    Agent that:
    1. Diffs old vs. new regulatory data
    2. Identifies specific changes (added/removed/modified entries)
    3. Assesses severity of each change
    4. Queries Supabase for affected products (blast radius)
    5. Drafts notification content for affected product owners
    """
    
    options = ClaudeAgentOptions(
        system_prompt="""You are a regulatory change analyst for Sieve AI.
        Given old and new versions of regulatory data, you must:
        1. Identify every specific change (be precise: ingredient X max limit changed from Y to Z)
        2. Classify each change: BREAKING (products may become non-compliant), 
           INFORMATIONAL (no compliance impact), or NEW_REQUIREMENT (new rule)
        3. For BREAKING changes, query the database to find affected products
        4. Draft clear, actionable notification text for each affected product owner
        
        Use extended thinking for complex regulatory analysis.""",
        allowed_tools=["Bash", "Read"],
        model="claude-sonnet-4-5-20250929",
    )
    
    prompt = f"""Analyze this regulatory change for {jurisdiction}:
    
    Source: {source_url}
    
    OLD DATA:
    {json.dumps(old_structured_data, indent=2)}
    
    NEW DATA:
    {json.dumps(new_structured_data, indent=2)}
    
    Identify all changes, assess blast radius, and draft notifications."""
    
    async for message in query(prompt=prompt, options=options):
        if hasattr(message, 'result'):
            return message.result
```

#### 4.5.5 Agent SDK vs. Raw Claude API — Decision Matrix

| Dimension | Raw Claude API (Messages) | Claude Agent SDK |
|---|---|---|
| **Use when** | Simple, single-turn tasks: structuring extracted text, classifying products, generating embeddings | Multi-step workflows: compliance orchestration, pipeline management, change analysis |
| **Tool execution** | You implement tool execution loop | Built-in: Bash, Read, Write, Glob, MCP connectors — agent executes tools autonomously |
| **MCP integration** | Manual HTTP calls to MCP servers | Native MCP connector — declare servers, agent calls tools automatically |
| **Error handling** | You handle retries, fallbacks | Agent reasons about errors and retries/adapts autonomously |
| **Long-running tasks** | Context window limits, manual session management | Sessions, compaction, checkpointing — agent maintains state across long runs |
| **Sub-agents** | Not supported | Native sub-agent spawning — orchestrator delegates to specialist agents |
| **Cost** | Lower per-call (no agent overhead) | Higher per-call (agent reasoning loop), but less code to maintain |
| **Where in Sieve AI** | PDF extraction, text structuring, embedding generation, single ingredient checks | Compliance orchestrator, ingestion pipeline, change analysis, artwork extraction |

### 4.6 Supabase Database Schema

```sql
-- ================================================================
-- REGULATORY DATA TABLES
-- ================================================================

-- Master table for all scraped regulatory pages
CREATE TABLE regulatory_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  domain TEXT NOT NULL,
  regulatory_body TEXT NOT NULL,  -- 'SFA', 'HSA', 'NEA', 'SSO'
  jurisdiction TEXT NOT NULL DEFAULT 'SG',
  content_type TEXT,             -- 'html', 'pdf'
  ingestion_tier TEXT NOT NULL DEFAULT 'exa', -- 'exa' (Tier 1), 'browser_use' (Tier 2), 'manual' (fallback)
  browser_use_task TEXT,         -- for Tier 2: natural language task description for the Browser Use agent
  content_text TEXT,             -- for HTML: raw text; for PDF: null (content is in structured_data)
  content_hash TEXT,             -- SHA-256 for change detection (HTML: hash of text; PDF: hash of raw bytes)
  structured_data JSONB,         -- AI-extracted structured data (from Claude text or Claude Vision)
  pdf_page_count INTEGER,        -- for PDFs: number of pages processed
  pdf_storage_path TEXT,         -- for PDFs: Supabase Storage path to cached PDF
  extraction_model TEXT,         -- 'claude-sonnet-4' or 'claude-opus-4' — which model was used
  extraction_confidence DECIMAL, -- 0-1 confidence score from extraction
  last_scraped_at TIMESTAMPTZ,
  last_changed_at TIMESTAMPTZ,   -- when content_hash last changed
  scrape_status TEXT DEFAULT 'pending', -- 'pending', 'scraped', 'structured', 'error'
  error_message TEXT,            -- last error if scrape_status = 'error'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Change history for regulatory sources
CREATE TABLE regulatory_source_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES regulatory_sources(id),
  old_content_hash TEXT,
  new_content_hash TEXT,
  change_summary TEXT,           -- AI-generated summary of what changed
  detected_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

-- ================================================================
-- INGREDIENT DATABASE
-- ================================================================

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  inci_name TEXT,
  cas_number TEXT,
  synonyms TEXT[] DEFAULT '{}',
  common_names TEXT[] DEFAULT '{}',
  category TEXT,                 -- 'food_additive', 'vitamin', 'mineral', 'herbal', 'preservative', 'colorant', 'uv_filter', 'active'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ingredients_canonical ON ingredients(canonical_name);
CREATE INDEX idx_ingredients_inci ON ingredients(inci_name);
CREATE INDEX idx_ingredients_cas ON ingredients(cas_number);
CREATE INDEX idx_ingredients_synonyms ON ingredients USING GIN(synonyms);

-- Ingredient regulations per jurisdiction
CREATE TABLE ingredient_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID REFERENCES ingredients(id),
  jurisdiction TEXT NOT NULL,     -- 'SG', 'MY', 'US', 'EU'
  regulatory_body TEXT NOT NULL,  -- 'SFA', 'HSA'
  status TEXT NOT NULL,           -- 'banned', 'restricted', 'permitted', 'permitted_with_limits'
  product_categories TEXT[] DEFAULT '{}',  -- ['food', 'cosmetic', 'supplement']
  product_subcategories TEXT[] DEFAULT '{}', -- ['leave-on', 'rinse-off', 'oral-care']
  max_concentration_pct DECIMAL,
  max_daily_dose_mg DECIMAL,
  conditions JSONB DEFAULT '{}',
  required_warnings TEXT[] DEFAULT '{}',
  regulation_reference TEXT,
  annex_reference TEXT,          -- 'Annex II', 'Annex III', etc.
  effective_date DATE,
  source_id UUID REFERENCES regulatory_sources(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(ingredient_id, jurisdiction, regulatory_body, product_categories)
);

CREATE INDEX idx_ing_reg_jurisdiction ON ingredient_regulations(jurisdiction);
CREATE INDEX idx_ing_reg_status ON ingredient_regulations(status);

-- ================================================================
-- LABELLING REQUIREMENTS
-- ================================================================

CREATE TABLE labelling_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  regulatory_body TEXT NOT NULL,
  product_category TEXT NOT NULL,  -- 'food', 'supplement', 'cosmetic'
  element TEXT NOT NULL,           -- 'product_name', 'ingredient_list', 'nutrition_panel', 'net_content', etc.
  mandatory BOOLEAN DEFAULT true,
  description TEXT,
  format_rules JSONB,
  language_requirements TEXT[] DEFAULT '{}',
  exemptions JSONB DEFAULT '{}',
  regulation_reference TEXT,
  source_id UUID REFERENCES regulatory_sources(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- CLAIMS DATABASE
-- ================================================================

CREATE TABLE claims_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  regulatory_body TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL,       -- 'nutrition', 'health', 'therapeutic', 'marketing', 'certification'
  status TEXT NOT NULL,           -- 'permitted', 'prohibited', 'conditional'
  product_categories TEXT[] DEFAULT '{}',
  conditions JSONB,              -- e.g., {"nutrient": "fat", "operator": "<=", "value": 3, "unit": "g", "per": "100g"}
  regulation_reference TEXT,
  source_id UUID REFERENCES regulatory_sources(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- ALLERGEN DATABASE
-- ================================================================

CREATE TABLE allergens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  allergen_name TEXT NOT NULL,
  allergen_group TEXT,           -- 'gluten_cereals', 'crustacean', 'egg', 'fish', etc.
  sub_allergens TEXT[] DEFAULT '{}', -- e.g., ['wheat', 'rye', 'barley', 'oats'] for gluten
  declaration_threshold TEXT,    -- e.g., '10mg/kg' for sulphites
  regulation_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- IMPORT REQUIREMENTS
-- ================================================================

CREATE TABLE import_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  product_category TEXT NOT NULL,
  requirement TEXT NOT NULL,
  requirement_type TEXT,         -- 'licence', 'permit', 'registration', 'documentation', 'testing'
  regulatory_body TEXT,
  documents_required TEXT[] DEFAULT '{}',
  special_conditions JSONB,
  regulation_reference TEXT,
  source_id UUID REFERENCES regulatory_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- PRODUCT & COMPLIANCE TABLES
-- ================================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  team_id UUID,
  name TEXT NOT NULL,
  category TEXT NOT NULL,        -- 'food', 'beverage', 'supplement', 'cosmetic', 'skincare', 'household'
  subcategory TEXT,
  formulation JSONB,             -- array of ingredients with concentrations
  claims TEXT[] DEFAULT '{}',
  nutrition_info JSONB,
  label_info JSONB,
  artwork_urls TEXT[] DEFAULT '{}',
  target_markets TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft',   -- 'draft', 'in_review', 'compliant', 'non_compliant', 'needs_fixes'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  jurisdiction TEXT NOT NULL,
  overall_status TEXT NOT NULL,   -- 'COMPLIANT', 'NON_COMPLIANT', 'NEEDS_REVIEW', 'INSUFFICIENT_DATA'
  compliance_score DECIMAL,      -- 0-100 percentage
  readiness_score DECIMAL,       -- market readiness 0-100
  findings JSONB NOT NULL,       -- array of finding objects
  statistics JSONB,              -- {total_checks, critical, major, minor, info}
  report_pdf_url TEXT,
  data_version TEXT,             -- which regulatory data version was used
  checked_at TIMESTAMPTZ DEFAULT now(),
  checked_by UUID REFERENCES auth.users(id)
);

CREATE TABLE compliance_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES compliance_checks(id),
  severity TEXT NOT NULL,        -- 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'
  blocking BOOLEAN DEFAULT false,
  category TEXT NOT NULL,        -- 'banned_ingredient', 'restricted_ingredient', 'labelling', 'claims', 'allergen', 'import', 'registration'
  title TEXT NOT NULL,
  description TEXT,
  ingredient_name TEXT,
  regulation_reference TEXT,
  regulatory_body TEXT,
  recommended_action TEXT,
  evidence_required TEXT,        -- what documents/changes are needed
  status TEXT DEFAULT 'open',    -- 'open', 'in_progress', 'resolved', 'deferred', 'flagged_for_review'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- AUDIT LOG
-- ================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  user_id UUID,
  action TEXT NOT NULL,          -- 'product_created', 'check_run', 'finding_resolved', 'product_updated', 'artwork_uploaded'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- VECTOR EMBEDDINGS (pgvector)
-- ================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE regulatory_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES regulatory_sources(id),
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER,
  embedding vector(1024),       -- Voyage AI or similar embedding model
  metadata JSONB,               -- jurisdiction, regulatory_body, content_type
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reg_embeddings ON regulatory_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ================================================================
-- SCRAPE SCHEDULING
-- ================================================================

CREATE TABLE scrape_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES regulatory_sources(id),
  frequency TEXT NOT NULL,       -- 'daily', 'weekly', 'monthly'
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- CRON JOBS (pg_cron)
-- ================================================================

-- Daily: check high-priority pages for changes (legislation, amendments)
SELECT cron.schedule(
  'check-regulatory-changes-daily',
  '0 2 * * *',  -- 2 AM SGT daily
  $$
    SELECT net.http_post(
      'https://sieveapp-api.vercel.app/api/cron/check-changes',
      '{"frequency": "daily"}'::jsonb,
      headers := '{"Authorization": "Bearer ' || current_setting('app.cron_secret') || '"}'::jsonb
    );
  $$
);

-- Weekly: full re-scrape of all Singapore sources
SELECT cron.schedule(
  'full-rescrape-weekly',
  '0 3 * * 0',  -- 3 AM SGT every Sunday
  $$
    SELECT net.http_post(
      'https://sieveapp-api.vercel.app/api/cron/full-rescrape',
      '{"jurisdiction": "SG"}'::jsonb,
      headers := '{"Authorization": "Bearer ' || current_setting('app.cron_secret') || '"}'::jsonb
    );
  $$
);

-- Monthly: re-embed all regulatory content for vector search
SELECT cron.schedule(
  'reembed-monthly',
  '0 4 1 * *',  -- 4 AM SGT 1st of each month
  $$
    SELECT net.http_post(
      'https://sieveapp-api.vercel.app/api/cron/reembed',
      '{"jurisdiction": "SG"}'::jsonb,
      headers := '{"Authorization": "Bearer ' || current_setting('app.cron_secret') || '"}'::jsonb
    );
  $$
);
```

### 4.7 Change Detection Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                  CHANGE DETECTION CRON                            │
│                                                                    │
│  PATH 1 — HTML PAGES:                                             │
│  1. Fetch all HTML sources where next_run_at <= now()             │
│  2. For each source:                                               │
│     a. If source.ingestion_tier == 'exa':                         │
│        → Call Exa.ai getContents(url, { livecrawl: true })        │
│     b. If source.ingestion_tier == 'browser_use':                 │
│        → Run Browser Use agent to navigate + extract content       │
│     c. If Exa returns empty/403 → fallback to Browser Use         │
│     d. Compute SHA-256 of new content                              │
│     e. Compare with stored content_hash                            │
│     f. If different:                                               │
│        → Insert into regulatory_source_changes                     │
│        → Call Claude (or Agent SDK change analysis agent) to       │
│          generate change_summary                                   │
│        → Re-run Claude structuring on new content                  │
│        → Delta-update ingredient_regulations / claims_rules        │
│        → Flag affected compliance_checks as stale                  │
│        → Notify subscribed users via webhook/email                 │
│     g. Update last_scraped_at, next_run_at                        │
│                                                                    │
│  PATH 2 — PDF DOCUMENTS:                                          │
│  1. Fetch all PDF sources where next_run_at <= now()              │
│  2. For each PDF:                                                  │
│     a. Download PDF, compute SHA-256 of raw bytes                  │
│     b. Compare with stored content_hash                            │
│     c. If different:                                               │
│        → Insert into regulatory_source_changes                     │
│        → Re-run Claude Vision extraction on new PDF                │
│        → Claude generates change_summary by comparing              │
│          old vs new structured_data                                │
│        → Delta-update regulatory tables in Supabase                │
│        → Flag affected compliance_checks as stale                  │
│        → Notify subscribed users                                   │
│     d. Update last_scraped_at, next_run_at                        │
│                                                                    │
│  PROPAGATION (both paths):                                         │
│  3. If regulatory_source_changes.count > 0:                        │
│     → Query all products with affected ingredients/claims          │
│     → Mark their compliance_checks as needs_re_review              │
│     → Generate "Regulatory Update Digest" email                    │
│     → Increment data_version (format: SG-YYYY-MM-DD-NNN)          │
└──────────────────────────────────────────────────────────────────┘
```

### 4.8 Regulatory Change Management

When a regulatory change is detected, the system executes a structured propagation chain:

**Step 1 — Detection:** Content hash mismatch triggers change record creation. For HTML pages, Exa livecrawl provides the new content. For JS-rendered pages and interactive portals, Browser Use re-navigates and extracts fresh content. For PDFs, the raw PDF bytes are hashed so even minor metadata changes are ignored — only actual content changes trigger re-processing.

**Step 2 — Diff Analysis:** Claude receives the old and new structured data and generates a change summary. For example: "ASEAN Annex III updated: Salicylic Acid max concentration for leave-on products changed from 2.0% to 1.5%. New entry added: Butylparaben restricted to 0.14% (previously not listed separately)."

**Step 3 — Delta Update:** The regulatory tables are updated using delta logic — not bulk overwrite. New entries are inserted, removed entries are soft-deleted with an `effective_until` date, and modified entries are versioned. This preserves full history for audit trail.

**Step 4 — Blast Radius Query:** The system queries all products whose formulations contain affected ingredients or whose claims reference affected rules. SQL example:

```sql
-- Find all products affected by a change to ingredient X
SELECT DISTINCT p.id, p.name, cc.id as check_id
FROM products p
JOIN compliance_checks cc ON cc.product_id = p.id
JOIN compliance_findings cf ON cf.check_id = cc.id
WHERE p.formulation::jsonb @> '[{"ingredient": "Salicylic Acid"}]'::jsonb
  OR cf.ingredient_name ILIKE '%salicylic%'
  AND cc.checked_at < (
    SELECT detected_at FROM regulatory_source_changes 
    WHERE id = '{change_id}'
  );
```

**Step 5 — Notification:** Affected product owners receive notification with: what changed, which regulation, which of their products are affected, and a one-click "Re-run compliance check" action.

**Step 6 — Data Versioning:** Every regulatory data update increments a version string (format: `SG-2026-02-25-001`). Every compliance report references the exact data version it was evaluated against. This enables: "Product X was compliant under SG-2026-01-15-003 but became non-compliant under SG-2026-02-25-001 due to the Salicylic Acid limit change."

### 4.9 API Usage & Cost Estimates

| Operation | Frequency | Calls/Run | Est. Monthly Calls | Est. Monthly Cost |
|---|---|---|---|---|
| **Exa.ai** | | | | |
| URL Discovery | Weekly | ~20 search queries | 80 | ~$0.40 |
| HTML Content Extraction | Weekly (full) | ~200 getContents | 800 | ~$0.80 |
| Change Detection (HTML) | Daily | ~50 getContents (livecrawl) | 1,500 | ~$1.50 |
| Subpage Crawling | Monthly | ~10 crawl requests | 10 | ~$0.15 |
| **Exa.ai subtotal** | | | **~2,400** | **~$3/month** |
| **Claude API** | | | | |
| HTML Structuring (text) | Weekly | ~200 messages | 800 | ~$2-4 |
| PDF Extraction (Vision) — initial | One-time | ~15 PDFs (~500 pages total) | 15 | ~$5-10 |
| PDF Change Detection (Vision) | Monthly | ~15 PDFs (re-extract if changed) | 15 | ~$5-10 |
| Change Summarisation | As needed | ~5-10/month | 10 | ~$0.50 |
| **Claude API subtotal** | | | **~840** | **~$8-15/month** |
| **Browser Use** | | | | |
| SSO legislation scraping | Monthly | ~4 agent runs | 4 | ~$1-2 |
| HSA VNS ingredient list | Monthly | ~2 agent runs | 2 | ~$2-4 |
| Dynamic PDF resolution | As needed | ~10 agent runs | 10 | ~$0.50-1 |
| Exa.ai fallback runs | Ad hoc | ~20 agent runs | 20 | ~$1-3 |
| **Browser Use subtotal** | | | **~36** | **~$5-10/month** |
| **Claude Agent SDK** | | | | |
| Compliance orchestration runs | Per check | ~100 checks/month | 100 | ~$5-15 |
| Ingestion pipeline agent (daily) | Daily | 30 runs | 30 | ~$3-5 |
| Change analysis agent | As needed | ~10 runs | 10 | ~$1-3 |
| **Agent SDK subtotal** | | | **~140** | **~$9-23/month** |
| **Total (SG only)** | | | | **~$27-51/month** |

Cost scales at approximately $27-51/jurisdiction/month at full Agent SDK usage. The raw API path (without Agent SDK orchestration) remains ~$16-28/month for teams that prefer deterministic pipelines. The initial PDF extraction is a one-time cost (~$5-10) per jurisdiction; ongoing costs are lower since PDFs change infrequently (ASEAN Annexes update 1-2x/year). Browser Use costs are primarily LLM tokens — the framework itself is open-source.

---

## 5. Feature Specifications

### 5.1 Product & Docs Scanner

| # | Feature | Description |
|---|---|---|
| 5 | New product page on assessment start | When starting a new assessment, create a new product page to manage all product information |
| 6 | Start new assessment | Initiate a new compliance evaluation for a product |
| 7 | Access existing product | View existing product information and re-run assessments |
| 8 | Single product workspace | Store all documents, reviews, scores, and fixes in one product page |
| 9 | Full audit log | Maintain a complete audit log of actions and compliance decisions at the product level |
| 10 | Upload packaging artwork | Accept PDF/JPG flat packaging artwork, multi-angle product images, and supporting documents. Each upload = 1 product |
| 11 | Auto-extract product info | Use AI (Claude Vision) to extract product name, net content, ingredient list, nutrition panel, and claims from uploaded files |
| 12 | Detect & classify claims | Detect and classify all claims on packaging: nutrition, health, certification, marketing |
| 13 | Detect meat/animal ingredients | Automatically detect presence of meat or animal-derived ingredients |
| 14 | Auto-categorize products | Automatically categorize products based on ingredients and format for import requirement determination |
| 15 | Detect packaging language | Detect language(s) on packaging and flag missing mandatory local languages |
| 16 | Flag missing/unreadable info | Flag missing or unreadable sections; alert user to upload high-resolution label if unclear |
| 48 | Bulk upload | Enable bulk upload of multiple artworks (~10 SKUs from one range) with parallel processing, each creating a separate product |

### 5.2 Compliance Report

| # | Feature | Description |
|---|---|---|
| 17 | Generate compliance report | Dynamic compliance report per product, downloadable as PDF from the product page |
| 18 | Organized sections | Report organized by clear categories: Basic labelling requirements, Other labelling requirements, Import requirements |
| 19 | Per-element classification | Identify each labelling element and classify as compliant or non-compliant (Name, Net content, Ingredient list, etc.) |
| 20 | Claims compliance status | Flag claims as compliant, requiring documents, or non-compliant |
| 21 | Ingredient limit flags | Flag ingredients that require clarification and show legal limits for imported goods |
| 22 | Prohibited ingredient detection | Detect prohibited ingredients and mark products as non-compliant |
| 23 | Import requirement flags | Flag import requirements: health certificates, source confirmation, additional labelling |
| 24 | Compliance score | Calculate compliance score (%) to prioritize SKU reviews by risk |
| 25 | Severity classification | Categorize non-compliance issues by severity (blocking vs non-blocking) and generate corrective action list |
| 26 | Market readiness score | Per product per market readiness score to assess export feasibility |
| 39 | Alternative name detection | Detect ingredients/additives listed under alternative names that differ from approved regulatory positive lists |
| 40 | Smart flagging | Stop flagging missing lot/batch numbers and local responsible entity on artwork PDFs where this info is typically not printed |
| 46 | Branding footer | Add company logo, description, and website to footer of each report page |
| 47 | Mark issues resolved | Allow compliance issues to be marked as resolved once addressed |
| 64 | Nuanced compliance detection | Detect "Need for attention" or mark as "compliant" use cases that are unarmful (e.g., 60% whole wheat in ingredient list but not on logo) |

### 5.3 Action Playbook

| # | Feature | Description |
|---|---|---|
| 27 | Recommended actions | View recommended compliance actions within the report (PDF) and as a dynamic action playbook on the product page |
| 28 | Relabelling guidance | Receive clear relabelling or sticker guidance with prioritized fixes list |
| 29 | Push for further review | Push an item for further review when there is doubt |
| 30 | Regulation-linked fixes | See fix recommendations tied to specific regulations and clauses |
| 31 | Score drivers | Understand the drivers behind a readiness or compliance score |
| 32 | Meat content guidance | For <5% meat content, list required documentation and regulatory steps |
| 33 | Evidence requirements | Explain why a claim fails and what evidence (documents) is required |

### 5.4 MCP Server Tools

Tools are split across the **orchestrator** and **jurisdiction servers**:

#### Compliance Engine Orchestrator (`sieve-compliance-engine`)

| Tool | Purpose |
|---|---|
| `check_product_compliance` | Full multi-jurisdiction compliance check — fans out to jurisdiction servers, aggregates findings, computes scores |
| `classify_product` | Determine regulatory classification (food vs supplement vs therapeutic vs cosmetic) for a given jurisdiction |
| `list_jurisdictions` | List all supported jurisdictions, their coverage status, and available product categories |
| `generate_compliance_report` | Generate PDF/Markdown compliance report from check results |
| `extract_product_from_artwork` | Send packaging artwork to Claude Vision, extract product name, ingredients, nutrition panel, claims |

#### Per-Jurisdiction Servers (`sieve-{xx}-regulations`)

Every jurisdiction server exposes this standard interface:

| Tool | Purpose |
|---|---|
| `check_ingredient` | Check a single ingredient's regulatory status (banned/restricted/permitted) in this jurisdiction |
| `validate_claims` | Check if marketing/health/nutrition claims are compliant in this jurisdiction |
| `get_labelling_requirements` | Retrieve the full labelling checklist for a product type in this jurisdiction |
| `get_import_requirements` | Import/registration requirements for bringing a product into this jurisdiction |
| `get_regulation_update` | Retrieve latest regulatory changes detected by the change detection cron |
| `search_regulations` | Semantic search over this jurisdiction's regulatory content (pgvector) |
| `trigger_scrape` | Admin: manually trigger a scrape cycle (full re-scrape, change detection, or specific URLs) |
| `get_ingestion_status` | Admin: check the health of the data ingestion pipeline for this jurisdiction |

#### Shared Ingredients Server (`sieve-ingredients`)

| Tool | Purpose |
|---|---|
| `resolve_ingredients` | Match ingredient names to canonical entries (CAS, INCI, synonym, fuzzy matching) |
| `search_ingredient` | Search the canonical ingredient database |
| `add_synonym` | Add a new synonym mapping to an existing canonical ingredient |

(Full input/output TypeScript schemas defined in Section 3.3.2 and 3.3.4 above, and in PRD v1.)

---

## 6. Phase 1 Deep Dive: Singapore Compliance Rules

### 6.1 Singapore Regulatory Bodies

| Body | Governs | Key Legislation |
|---|---|---|
| **SFA** | All food products, beverages, food supplements sold as food | Sale of Food Act (Cap 283), Food Regulations, Food Safety and Security Act 2024 |
| **HSA** | Health supplements, traditional medicines, cosmetic products | Health Products Act, Health Products (Cosmetic Products - ASEAN Cosmetic Directive) Regulations 2007 |
| **NEA** | Packaging, environmental compliance | Environmental Protection and Management Act, Resource Sustainability Act |

### 6.2 Compliance Check Dimensions

For each product submitted, the engine runs these checks in order:

**1. Product Classification** → Determine which regulatory framework applies (SFA food, HSA supplement, HSA cosmetic)

**2. Banned Ingredient Screening** → Cross-reference all ingredients against prohibited lists (SFA banned additives, ASEAN Annex II)

**3. Restricted Ingredient Validation** → For restricted ingredients, validate concentration limits, product type conditions, and required warnings (SFA additive limits, ASEAN Annex III, V, VI)

**4. Labelling Requirements** → Check mandatory label elements exist and meet format requirements (NIP, INCI listing, languages, dates, manufacturer info)

**5. Claims Validation** → Verify all marketing, nutrition, and health claims against permitted claims databases and nutrient thresholds

**6. Allergen Declaration** → Cross-reference ingredients against allergen database, flag undeclared allergens

**7. Import Requirements** → Determine licensing, permits, documentation, and special requirements for bringing the product into Singapore

**8. Registration/Notification** → Flag if ACPN cosmetic notification, HSA health supplement notification, or SFA import licence is required

### 6.3 Severity & Scoring

**Severity levels:**

| Level | Blocking? | Description | Examples |
|---|---|---|---|
| CRITICAL | Yes | Product cannot be sold | Banned ingredient, exceeds max dose, missing allergen declaration |
| MAJOR | Yes | Significant compliance gap | Restricted ingredient over limit, prohibited claim, missing mandatory label element |
| MINOR | No | Should be corrected | Formatting issue, recommended element missing, sub-optimal claim wording |
| INFO | No | Advisory only | Ingredient not in DB (generally permitted), upcoming regulation changes, ACPN notification reminder |

**Compliance score calculation:**
```
score = 100 - (critical_count × 25) - (major_count × 10) - (minor_count × 3)
score = max(0, score)
```

**Market readiness score:**
```
readiness = compliance_score × 0.6 
          + labelling_completeness × 0.2 
          + documentation_completeness × 0.2
```

---

## 7. Vercel Deployment Architecture

### 7.1 Deployments Overview

Each MCP server is a separate Vercel project with its own deployment:

| Vercel Project | Domain | Routes |
|---|---|---|
| `sieve-compliance-engine` | `sieve-engine.vercel.app` | `/app/*` (Next.js), `/api/v1/*`, `/api/mcp` |
| `sieve-sg-regulations` | `sieve-sg.vercel.app` | `/api/mcp`, `/api/cron/*` |
| `sieve-my-regulations` | `sieve-my.vercel.app` | `/api/mcp`, `/api/cron/*` |
| `sieve-ingredients` | `sieve-ingredients.vercel.app` | `/api/mcp` |
| (future jurisdictions) | `sieve-{xx}.vercel.app` | `/api/mcp`, `/api/cron/*` |

### 7.2 Compliance Engine Route Structure

```
sieve-compliance-engine (sieve-engine.vercel.app)
├── /app
│   ├── /dashboard              — Product portfolio overview
│   ├── /products/[id]          — Single product workspace
│   ├── /products/[id]/report   — Compliance report viewer
│   ├── /products/[id]/actions  — Action playbook
│   ├── /products/new           — New assessment flow
│   └── /settings               — Team settings, API keys, market preferences
│
├── /api/v1
│   ├── /products               — Product CRUD
│   ├── /compliance/check       — Run compliance check (orchestrates jurisdiction servers)
│   ├── /ingredients/lookup     — Ingredient lookup (proxies to sieve-ingredients)
│   ├── /claims/validate        — Claims validation (routes to appropriate jurisdiction server)
│   ├── /reports/[id]/pdf       — Generate PDF report
│   └── /jurisdictions          — List supported jurisdictions
│
├── /api/mcp                    — MCP server endpoint (orchestrator tools via SSE)
│
└── /api/webhooks
    └── /regulatory-update      — Notify subscribers of changes
```

### 7.3 Jurisdiction Server Route Structure (each jurisdiction follows this pattern)

```
sieve-sg-regulations (sieve-sg.vercel.app)
├── /api/mcp                    — MCP server endpoint (SG-specific tools via SSE)
│
├── /api/cron
│   ├── /check-changes          — Daily: check HTML pages + PDFs for changes
│   ├── /full-rescrape          — Weekly: full re-scrape of all SG sources
│   └── /reembed                — Monthly: re-embed all SG regulatory content
│
└── /api/admin
    ├── /ingestion-status       — Pipeline health check
    └── /trigger-scrape         — Manual scrape trigger
```

### 7.4 Vercel Configuration

**Compliance Engine (vercel.json):**
```json
{
  "functions": {
    "api/v1/compliance/check": {
      "maxDuration": 60
    }
  }
}
```

**Jurisdiction Server (vercel.json — same for each jurisdiction):**
```json
{
  "crons": [
    {
      "path": "/api/cron/check-changes",
      "schedule": "0 18 * * *"
    },
    {
      "path": "/api/cron/full-rescrape",
      "schedule": "0 19 * * 0"
    },
    {
      "path": "/api/cron/reembed",
      "schedule": "0 20 1 * *"
    }
  ],
  "functions": {
    "api/cron/*": {
      "maxDuration": 300
    }
  }
}
```

### 7.5 Inter-Server Communication

Jurisdiction MCP servers communicate with the shared Supabase instance directly (via service key). The compliance engine orchestrator calls jurisdiction servers via HTTP (MCP over SSE transport), not through Supabase.

```
User request → Compliance Engine → HTTP calls to jurisdiction MCP servers → responses aggregated → Supabase write
                                 → HTTP call to Ingredients server for fuzzy matching
```

Environment variables shared across all servers:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
ANTHROPIC_API_KEY=xxx
EXA_API_KEY=xxx

# Jurisdiction server URLs (set in compliance engine only)
SIEVE_SG_URL=https://sieve-sg.vercel.app/api/mcp
SIEVE_MY_URL=https://sieve-my.vercel.app/api/mcp
SIEVE_INGREDIENTS_URL=https://sieve-ingredients.vercel.app/api/mcp

# Inter-server auth (shared secret for server-to-server calls)
MCP_SERVER_SECRET=xxx
```

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Compliance check response time | < 5 seconds for single product (< 50 ingredients) |
| Artwork upload + extraction | < 30 seconds |
| PDF report generation | < 10 seconds |
| Availability | 99.9% uptime |
| Ingredient matching accuracy | > 99% for exact matches, > 95% for fuzzy |
| False negative rate | < 0.5% (missed violations) |
| Regulatory data freshness | Changes detected within 24 hours of official publication |
| Data version tracking | Every compliance report references exact data version used |
| Concurrent users | Support 100+ concurrent compliance checks |
| Scraping resilience | Retry with exponential backoff, fallback to cached content |

---

## 9. Rollout Plan

| Phase | Scope | Servers Built | Timeline |
|---|---|---|---|
| **Phase 1a** | Shared ingredients database + `sieve-ingredients` MCP server | `sieve-ingredients` | Weeks 1-2 |
| **Phase 1b** | Singapore data ingestion pipeline — Exa.ai (Tier 1) + Browser Use (Tier 2) + Claude Vision (Tier 3) for SFA + HSA + SSO | `sieve-sg-regulations` | Weeks 1-5 |
| **Phase 1c** | Claude Agent SDK integration — compliance orchestrator agent + ingestion pipeline agent | `sieve-compliance-engine` | Weeks 3-6 |
| **Phase 1d** | Web app MVP (upload → extract → check → report) | `sieve-compliance-engine` (Next.js) | Weeks 5-8 |
| **Phase 1e** | SG cron jobs + change detection + Browser Use monitoring agents + change analysis agent | `sieve-sg-regulations` | Weeks 7-9 |
| **Phase 2** | Malaysia, Thailand, Indonesia, Philippines (one jurisdiction server each, with Browser Use agents per jurisdiction) | `sieve-my`, `sieve-th`, `sieve-id`, `sieve-ph` | Weeks 10-18 |
| **Phase 3** | US (FDA), EU (EFSA) | `sieve-us`, `sieve-eu` | Weeks 19-26 |
| **Phase 4** | Australia/NZ, Japan, South Korea | `sieve-au`, `sieve-jp`, `sieve-kr` | Weeks 27-34 |

---

## 10. Open Questions

1. ~~**Exa.ai PDF handling:** Can Exa extract content from SFA/HSA PDFs directly?~~ **RESOLVED:** Using Claude Vision for all PDF extraction. Exa handles HTML page discovery and scraping only.
2. ~~**Rate limiting on .gov.sg:** Are there any rate limits or bot-blocking on SFA/HSA websites that might require additional scraping strategies?~~ **RESOLVED:** Browser Use (Tier 2) handles bot-blocked sites with anti-detect browsers, Singapore proxy IPs, and CAPTCHA solving. Rate limiting config enforces max 10 page loads/minute to be respectful to government servers.
3. ~~**Singapore Statutes Online (SSO):** SSO has JavaScript-rendered content — does Exa's livecrawl handle this, or do we need a headless browser fallback?~~ **RESOLVED:** Browser Use handles SSO — it runs a real browser that renders JavaScript, navigates the SSO interface, and extracts fully rendered legislation text. Dedicated SSO scraping agent defined in Section 4.4.3.
4. **Halal certification:** Sieve mentions SFA halal certification requirements — should Sieve AI include halal compliance checks for Singapore?
5. **Pricing model:** Per-SKU-check, per-seat subscription, or per-jurisdiction? Should the MCP server have different pricing than the web app?
6. **Multi-tenancy:** Should teams/workspaces be isolated at the Supabase Row Level Security (RLS) level from day one?
7. **Claude Vision page limits:** Claude Vision has context window limits. For very large PDFs (ASEAN Annex II is 200+ pages), the paginated processing approach needs validation — what's the optimal page batch size for table extraction accuracy?
8. **PDF caching:** Should we cache downloaded PDFs in Supabase Storage for audit trail / re-processing, or just store the hash + structured output?
9. **Embedding model:** Which embedding model to use for pgvector? Options: Voyage AI (Anthropic-recommended), Cohere Embed, or open-source (e5-large). Impacts semantic search quality for regulatory content lookup.
10. **Agent SDK vs. deterministic pipelines:** Should all jurisdictions use Agent SDK orchestration, or should some use deterministic pipelines (cheaper, more predictable) with Agent SDK reserved for the compliance engine and complex jurisdictions?
11. **Browser Use hosting:** Self-host Browser Use (lower cost, more control) or use Browser Use Cloud (managed, no infra maintenance)? Decision depends on scale and reliability requirements.

---

## Appendix A: Full List of Singapore Regulatory URLs to Scrape

### SFA (sfa.gov.sg)
```
https://www.sfa.gov.sg/legislation
https://www.sfa.gov.sg/legislation/food-safety-and-security-act
https://www.sfa.gov.sg/regulatory-standards-frameworks-guidelines
https://www.sfa.gov.sg/regulatory-standards-frameworks-guidelines/food-safety-regulatory-limits/overview-on-food-safety-regulatory-limits
https://www.sfa.gov.sg/food-information/nutrition-labelling
https://www.sfa.gov.sg/food-information/food-allergy-and-intolerance
https://www.sfa.gov.sg/food-businesses/imports
https://www.sfa.gov.sg/food-businesses/novel-food
https://www.sfa.gov.sg/docs/default-source/tools-and-resources/list-of-food-additives-permitted-under-food-regulations*.pdf
https://www.sfa.gov.sg/nutri-grade
https://www.sfa.gov.sg/food-information/nutrition-health-claims
https://www.sfa.gov.sg/public-consultation
```

### HSA (hsa.gov.sg)
```
https://www.hsa.gov.sg/cosmetic-products
https://www.hsa.gov.sg/cosmetic-products/overview
https://www.hsa.gov.sg/cosmetic-products/asean-cosmetic-directive
https://www.hsa.gov.sg/cosmetic-products/notification
https://www.hsa.gov.sg/cosmetic-products/notification/submit
https://www.hsa.gov.sg/cosmetic-products/gmp
https://www.hsa.gov.sg/docs/default-source/hprg-cosmetics/guidelines-on-the-control-of-cosmetic-products.pdf
https://www.hsa.gov.sg/health-supplements
https://www.hsa.gov.sg/health-supplements/claims
https://www.hsa.gov.sg/vns
https://www.hsa.gov.sg/health-supplements/list-of-notified-hs-and-tm
https://www.hsa.gov.sg/consumer-safety/articles/how-cosmetic-products-are-regulated-by-hsa
```

### SSO (sso.agc.gov.sg)
```
https://sso.agc.gov.sg/Act/SFA1973
https://sso.agc.gov.sg/SL/SFA1973-RG1
https://sso.agc.gov.sg/Acts-Supp/27-2024
https://sso.agc.gov.sg/Act/HPA2007
https://sso.agc.gov.sg/SL/HPA2007-S321-2007
```

### ASEAN Cosmetic Directive Annexes (PDF links from HSA)
```
Annex II Part 1: Prohibited substances (linked from hsa.gov.sg/cosmetic-products/asean-cosmetic-directive)
Annex III Part 1: Restricted substances with conditions
Annex IV Part 1: Permitted colouring agents
Annex V: Permitted preservatives with max concentrations
Annex VI: Permitted UV filters with max concentrations
Annex VII: Permitted symbols
```
