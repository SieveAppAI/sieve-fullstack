# Sieve AI — Phase 1 Roadmap

## Monorepo Scaffolding
- [x] Root config (turbo, pnpm, tsconfig, gitignore, env)
- [x] Shared packages (db, shared, tsconfig)
- [x] App shells (web, mcp-ingredients, mcp-sg)
- [x] Supabase migration (full schema + pg_trgm + DB functions)
- [x] CLAUDE.md update + CI + task tracking

## Phase 1a: Ingredients MCP Server
- [x] MCP server setup (route handler with WebStandardStreamableHTTPServerTransport)
- [x] resolve_ingredients tool (multi-layer matching: CAS → INCI → name → synonym → fuzzy)
- [x] search_ingredient tool (trigram + text search)
- [x] add_synonym tool

## Phase 1b: Singapore MCP Server
- [x] SG ingestion — Tier 1 (Exa.ai: discover + extract HTML + structure)
- [x] SG ingestion — Tier 2 (Browser Use: HSA VNS, SSO)
- [x] SG ingestion — Tier 3 (Claude Vision: PDF extraction)
- [x] SG compliance tools (check_ingredient, validate_claims, get_labelling_requirements, get_import_requirements, get_regulation_update, search_regulations, trigger_scrape, get_ingestion_status)
- [x] SG cron jobs + change detection
- [x] Seed SG regulatory source URLs

## Infrastructure
- [x] Deploy to Vercel (3 projects: web, mcp-ingredients, mcp-sg)
- [x] Provision shared Supabase instance (consolidate from 3 → 1)
- [x] Run migrations (schema + unique constraints + RPC functions)
- [x] Generate Database types (manual from schema)
- [x] Seed 24 SG regulatory sources + 20 test ingredients + 14 regulations
- [x] Set API keys (Exa, Anthropic, Browser Use, CRON_SECRET) on Vercel projects

## Data Ingestion
- [x] First SG scrape batch — 11 sources structured via trigger_scrape
- [x] Second SG scrape batch — 22+ sources structured (SFA + HSA)
- [ ] Remaining SSO sources (5 SSO legislation pages — require Browser Use)

## Web App — Compliance Dashboard
- [x] Tailwind CSS setup (PostCSS config, globals.css)
- [x] Root layout with sidebar navigation (Inter font)
- [x] Dashboard page — product portfolio table + summary stats
- [x] Product workspace — ingredients, claims, compliance summary
- [x] Compliance report viewer — findings by category/severity
- [x] New product assessment form
- [x] API: Products CRUD (GET/POST/PATCH/DELETE)
- [x] API: Compliance engine orchestrator (fan-out to MCP servers, aggregate findings, compute scores)
- [x] API: Jurisdictions list
- [x] API: Ingredient lookup (proxy to ingredients MCP)

## End-to-End Verification
- [x] Ingredients MCP: resolve_ingredients — CAS, INCI, fuzzy, synonym matching all verified
- [x] SG MCP: check_ingredient — Hydroquinone→banned, Retinol→restricted, CoQ10→permitted
- [x] Web API: Create product + run compliance check (cosmetic: NON_COMPLIANT, food: NEEDS_REVIEW)
- [x] Deployed: Dashboard loads at sieve-fullstack.vercel.app/dashboard

## Database State
- 33 regulatory sources (22 structured, 2 scraped, 13 pending)
- 33 ingredients, 27 ingredient regulations
- 71 labelling requirements, 39 claims rules, 37 import requirements

## Vector Search
- [x] Replace Voyage AI with Vercel AI SDK (`ai` + `@ai-sdk/openai`) for embeddings
- [x] Fix `search_regulatory_content` RPC to use actual cosine distance (`<=>`)
- [x] Create `embed-query.ts` helper for search-time embedding
- [x] Update `search-regulations.ts` to embed query and pass vector to RPC
- [x] Update DB types to match new RPC signature (`query_embedding` instead of `query_text`)
- [ ] Run migration `00006_fix_vector_search_rpc.sql` against Supabase
- [ ] Set `OPENAI_API_KEY` in Vercel project settings for mcp-sg
- [ ] Trigger `/api/cron/reembed` to generate embeddings

## Remaining
- [ ] Supabase Auth integration (user login/signup, RLS policies)
- [ ] Browser Use scraping for SSO legislation (5 pending sources)
- [ ] Settings page (team settings, API keys, market preferences)
- [ ] PDF report generation (/api/v1/reports/[id]/pdf)
- [ ] Audit log tracking
