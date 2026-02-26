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

## Verification
- [x] `pnpm install` succeeds
- [x] `pnpm type-check` passes for all packages and apps
- [x] `pnpm build` succeeds for all apps

## Infrastructure
- [x] Deploy to Vercel (3 projects: web, mcp-ingredients, mcp-sg)
- [x] Provision shared Supabase instance (consolidate from 3 → 1)
- [x] Run migrations (schema + unique constraints + RPC functions)
- [x] Generate Database types (manual from schema)
- [x] Seed 24 SG regulatory sources + 20 test ingredients + 14 regulations

## Testing
- [x] Ingredients MCP: resolve_ingredients — CAS, INCI, fuzzy, synonym matching all verified
- [x] Ingredients MCP: search_ingredient — trigram search verified
- [x] SG MCP: check_ingredient — banned/restricted/permitted all verified
- [x] SG MCP: get_ingestion_status — 24 sources pending

## Next Steps
- [ ] Run first SG regulatory scrape (requires EXA_API_KEY + ANTHROPIC_API_KEY in Vercel env)
- [ ] Web app: compliance dashboard UI
- [ ] Set up auth (Supabase Auth)
- [ ] Compliance engine orchestrator (web app API routes)
