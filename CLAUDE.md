# Project Guidelines for Claude

> A reusable CLAUDE.md template for AI-assisted development projects.

---

## Core Principles

### Simplicity Over Complexity
- **Avoid over-engineering.** Only make changes that are directly requested or clearly necessary.
- Do not add features, refactor code, or make "improvements" beyond what was asked.
- A bug fix doesn't need surrounding code cleaned up. A simple feature doesn't need extra configurability.
- Prefer 3 similar lines of code over a premature abstraction.
- The right amount of complexity is the minimum needed for the current task.

### No Laziness
- **Find root causes.** No temporary fixes. Senior developer standards.
- Changes should only touch what's necessary. Avoid introducing bugs.

### Engineering Preferences
- **DRY is important**—flag repetition aggressively.
- **Well-tested code is non-negotiable**; I'd rather have too many tests than too few.
- I want code that's "engineered enough" — not under-engineered (fragile, hacky) and not over-engineered (premature abstraction, unnecessary complexity).
- I err on the side of handling more edge cases, not fewer; **thoughtfulness > speed**.
- Bias toward explicit over clever.

### Ask Before Assuming
- **Never make assumptions on my behalf.** If requirements are unclear, ask for clarification.
- Surface inconsistencies when you find them.
- Present tradeoffs when multiple valid approaches exist.
- Push back when a request seems problematic—don't be sycophantic.
- If something seems wrong or confusing, say so rather than proceeding silently.

### Code Hygiene
- **Clean up after yourself.** Remove dead code, unused imports, and obsolete comments.
- Do not leave `TODO` comments for things you could fix now.
- Do not modify code, comments, or files unrelated to the current task.
- Do not add docstrings, comments, or type annotations to code you didn't change.
- Only add comments where the logic isn't self-evident.

### Respect Existing Code
- **Read before writing.** Always read and understand existing code before modifying it.
- Follow existing patterns and conventions in the codebase.
- Don't rename variables, restructure files, or "improve" formatting as side effects.
- If existing code works, don't refactor it unless explicitly asked.

---

## Workflow Guidelines

### Architect Then Execute
- For non-trivial changes, **start in plan mode** to discuss approach before implementation.
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions).
- Break complex tasks into clear, sequential steps.
- Identify potential risks or edge cases upfront.
- Write detailed specs upfront to reduce ambiguity.
- Get approval on the approach before writing code.
- If something goes sideways, **STOP and re-plan immediately**—don't keep pushing.
- Use plan mode for verification steps, not just building.
- Expect active interruption and redirection—when I course-correct, adapt immediately without being defensive.

### Iterative Refinement
- Make small, incremental changes that can be reviewed easily.
- Commit logical units of work separately.
- Test each change before moving to the next.
- Support rapid feedback cycles—when I ask for adjustments (spacing, typography, layout, etc.), apply them precisely without adding unrequested changes.

### Subagent Strategy
- Use subagents liberally to keep main context window clean.
- Offload research, exploration, and parallel analysis to subagents.
- For complex problems, throw more compute at it via subagents.
- One task per subagent for focused execution.

### Verification Before Done
- Never mark a task complete without proving it works.
- Diff behavior between main and your changes when relevant.
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness.

### Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution."
- Skip this for simple, obvious fixes—don't over-engineer.
- Challenge your own work before presenting it.

### Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding.
- Point at logs, errors, failing tests—then resolve them.
- Zero context switching required from the user.
- Go fix failing CI tests without being told how.

### Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern.
- Write rules for yourself that prevent the same mistake.
- Ruthlessly iterate on these lessons until mistake rate drops.
- Review lessons at session start for relevant project.

### Multi-Concern Sessions
- I often batch multiple concerns into a single session (bugs, feature requests, git operations).
- Handle each concern sequentially with clear transitions.
- Don't conflate separate concerns—keep fixes isolated.

### Communication
- Explain what you're about to do before doing it.
- If a task is taking longer than expected, communicate progress and blockers.
- When presenting options, explain pros/cons **without time estimates**.
- **Do not assume my priorities on timeline or scale.**
- When I redirect your approach, treat it as valuable input—I have strong opinions about implementation details and maintain tight directional control.

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items.
2. **Verify Plan**: Check in before starting implementation.
3. **Track Progress**: Mark items complete as you go.
4. **Explain Changes**: High-level summary at each step.
5. **Document Results**: Add review section to `tasks/todo.md`.
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections.

---

## Code Review Process

When reviewing code (in plan mode or when asked), follow this structured process. **Before starting, ask if I want:**

1. **BIG CHANGE**: Work through interactively, one section at a time (Architecture → Code Quality → Tests → Performance) with at most 4 top issues per section.
2. **SMALL CHANGE**: Work through interactively ONE question per review section.

### Review Stages

#### 1. Architecture Review
Evaluate:
- Overall system design and component boundaries.
- Dependency graph and coupling concerns.
- Data flow patterns and potential bottlenecks.
- Scaling characteristics and single points of failure.
- Security architecture (auth, data access, API boundaries).

#### 2. Code Quality Review
Evaluate:
- Code organization and module structure.
- DRY violations—be aggressive here.
- Error handling patterns and missing edge cases (call these out explicitly).
- Technical debt hotspots.
- Areas that are over-engineered or under-engineered relative to my preferences.

#### 3. Test Review
Evaluate:
- Test coverage gaps (unit, integration, e2e).
- Test quality and assertion strength.
- Missing edge case coverage—be thorough.
- Untested failure modes and error paths.

#### 4. Performance Review
Evaluate:
- N+1 queries and database access patterns.
- Memory-usage concerns.
- Caching opportunities.
- Slow or high-complexity code paths.

### For Each Issue Found
For every specific issue (bug, smell, design concern, or risk):
- Describe the problem concretely, with file and line references.
- Present 2–3 options, including "do nothing" where that's reasonable.
- For each option, specify: implementation effort, risk, impact on other code, and maintenance burden.
- Give your recommended option and why, mapped to my engineering preferences above.
- Then explicitly ask whether I agree or want to choose a different direction before proceeding.

### Review Formatting Rules
- **NUMBER** each issue (Issue 1, Issue 2, etc.).
- Give **LETTERS** for options within each issue (Option A, Option B, etc.).
- When using AskUserQuestion, make sure each option clearly labels the issue NUMBER and option LETTER so context is not lost.
- Make the recommended option always the 1st option.
- **After each review section, pause and ask for my feedback before moving on.**

---

## Bash Guidelines

### IMPORTANT: Avoid commands that cause output buffering issues
- **DO NOT** pipe output through `head`, `tail`, `less`, or `more` when monitoring or checking command output.
- **DO NOT** use `| head -n X` or `| tail -n X` to truncate output—these cause buffering problems.
- Instead, let commands complete fully, or use `--max-lines` flags if the command supports them.
- For log monitoring, prefer reading files directly rather than piping through filters.

### When checking command output:
- Run commands directly without pipes when possible.
- If you need to limit output, use command-specific flags (e.g., `git log -n 10` instead of `git log | head -10`).
- Avoid chained pipes that can cause output to buffer indefinitely.
- Always quote file paths that contain spaces.

---

## Code Quality Standards

### Error Handling
- Only add error handling at system boundaries (user input, external APIs).
- Trust internal code and framework guarantees.
- Don't add validation for scenarios that can't happen.
- But err on the side of handling more edge cases at boundaries—thoughtfulness over speed.

### Testing
- **Well-tested code is non-negotiable.**
- Write tests first when implementing new features (TDD approach gives leverage).
- Run tests after making changes to verify correctness.
- Don't skip tests to save time.
- I'd rather have too many tests than too few.

### Security
- Never commit secrets, API keys, or credentials.
- Use environment variables for sensitive configuration.
- Be cautious with user input—validate at boundaries.

---

## Git Workflow

### Commits
- Write clear, concise commit messages that explain the "why."
- Commit logical units of work—not too large, not too granular.
- Don't amend commits unless explicitly asked.
- Stage specific files rather than using `git add .` or `git add -A`.

### Branches
- Create feature branches for new work.
- Keep branches focused on a single feature or fix.

### Push Immediately
- **Always push local changes to GitHub immediately after committing.** Do not let local commits sit unpushed.
- This ensures Vercel deployments stay in sync and collaborators always have the latest code.
- If working on a feature branch, push the branch. If on main, push to main.

---

## Stack-Specific Guidelines

### Vercel (Frontend, API Routes, Cron)
- Use Next.js App Router conventions.
- Place API routes in `app/api/` directory.
- Configure cron jobs in `vercel.json`.
- Use Edge Runtime where appropriate for performance.
- Leverage Vercel's built-in analytics and monitoring.

### Supabase (Auth, Database)
- Use Row Level Security (RLS) policies for data access control.
- Keep database schema in version control via migrations.
- Use Supabase client for auth flows—don't roll custom auth.
- Prefer Supabase's built-in auth providers over custom implementations.

### TypeScript
- Use strict mode.
- Prefer explicit types over `any`.
- Let TypeScript infer types where obvious.
- Don't add redundant type annotations.

---

## Skills Integration

This project uses [skills.sh](https://skills.sh) for reusable agent capabilities.

### Adding Skills
```bash
npx skills add <owner/repo> --skill <skill-name>
```

### Finding Relevant Skills
```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```

### Recommended Skills
- `vercel-react-best-practices` - React patterns for Vercel deployment
- `web-design-guidelines` - UI/UX best practices
- `frontend-design` - Frontend architecture patterns

---

## Anti-Patterns to Avoid

### Code Bloat
- Don't create helpers, utilities, or abstractions for one-time operations.
- Don't design for hypothetical future requirements.
- Don't use feature flags or backwards-compatibility shims when you can just change the code.

### Over-Documentation
- Don't add `// removed` comments for deleted code.
- Don't rename unused variables to `_var` for backwards compatibility.
- Don't re-export types or functions that are no longer used.
- If something is unused, delete it completely.

### Scope Creep
- Don't "improve" adjacent code while fixing a bug.
- Don't refactor files you're only reading.
- Don't add logging, metrics, or observability unless asked.
- Don't upgrade dependencies unless directly relevant to the task.

---

## Leverage Patterns

### Declarative Over Imperative
- Give success criteria rather than step-by-step instructions.
- Let the agent loop until goals are met.
- Write naive algorithms first, then optimize while preserving correctness.

### Test-Driven Development
- Write tests first as success criteria.
- Use tests to verify correctness automatically.
- Tests provide leverage by enabling confident iteration.

### Browser/Tool Integration
- Use MCPs and tool integrations for interactive tasks.
- Let agents verify their own work through tooling.

---

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth-related pages
│   └── (dashboard)/       # Protected pages
├── components/            # React components
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase client config
│   └── utils/            # General utilities
├── public/               # Static assets
├── supabase/             # Supabase config
│   └── migrations/       # Database migrations
├── .env.local            # Environment variables (not committed)
├── CLAUDE.md             # This file
└── vercel.json           # Vercel configuration
```

---

## Environment Variables

Required variables (to be set in Vercel/local `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Vercel Environment Variable Gotcha

Vercel environment variables often contain trailing `\n` (newline) characters from copy-paste. This causes silent auth failures, API 401s, and other hard-to-debug issues.

**Always `.trim()` environment variables when reading them:**

```typescript
const apiKey = process.env.MY_API_KEY?.trim();
```

If an API key or secret is failing only in production (but works locally), a trailing newline in the Vercel env var is the most likely cause.

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Run tests | `npm test` |
| Build for production | `npm run build` |
| Deploy | `vercel` |
| Generate Supabase types | `npx supabase gen types typescript` |
| Create migration | `npx supabase migration new <name>` |
| Push migration | `npx supabase db push` |
