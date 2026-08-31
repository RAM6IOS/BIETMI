# AGENTS.md

Guidance for AI coding agents working on the **BIETMI ERP** monorepo.

## Project Overview

BIETMI is an ERP system built as a monorepo (Sprint 0 complete — structure only, no business logic yet).

| App      | Stack                                        | Dev Port |
|----------|----------------------------------------------|----------|
| backend  | NestJS 11 + TypeScript + Prisma 6 (PostgreSQL) | 3000     |
| frontend | React 19 + Vite 8 + TypeScript + Tailwind v4   | 5173     |

### Commands

Backend (run inside `backend/`):

```bash
npm run start:dev        # dev server (watch mode)
npm run build            # production build
npm run lint             # eslint --fix
npm test                 # jest unit tests (*.spec.ts under src/)
npm run test:e2e         # e2e tests (test/jest-e2e.json)
```

Frontend (run inside `frontend/`):

```bash
npm run dev              # vite dev server
npm run build            # tsc -b && vite build
npm run lint             # oxlint
npm run preview          # preview production build
```

Prisma lives at `backend/prisma/schema.prisma` (empty — ready for Sprint 1).

---

## Skills System — CRITICAL

This repository ships **24 local skills** under `skills/<skill-name>/SKILL.md`.

**These skills are NOT registered with the `skill` tool and do NOT appear automatically in your available-skills list.** Your only knowledge of them comes from this file. Therefore:

### Mandatory Loading Protocol

1. Before starting ANY non-trivial task, scan the Intent Map below and identify matching skills.
2. **Read the full `skills/<name>/SKILL.md` file(s) with your Read tool** before writing any plan, spec, or code. Do not rely on memory of the description alone.
3. Follow the skill workflow exactly — do not partially apply it.
4. Only then proceed to implementation.
5. If a task matches no skill, say so explicitly and proceed normally.

### Anti-Rationalization

The following thoughts are incorrect and must be ignored:

- "This is too small for a skill"
- "I can just quickly implement this"
- "I'll gather context first"
- "The skill tool doesn't know this skill, so it doesn't exist"

Correct behavior: always check the catalog below first, then Read the matching SKILL.md.

---

## Skill Catalog (all 24)

### Core Workflow

| Skill | Path | Use When |
|---|---|---|
| `spec-driven-development` | `skills/spec-driven-development/SKILL.md` | Starting a project, feature, or significant change with no spec yet; unclear/vague requirements; one requirement spanning several independently testable capabilities |
| `planning-and-task-breakdown` | `skills/planning-and-task-breakdown/SKILL.md` | You have a spec/clear requirements and need ordered implementable tasks; task feels too large; estimating scope |
| `incremental-implementation` | `skills/incremental-implementation/SKILL.md` | Implementing any feature touching more than one file; about to write lots of code at once |
| `test-driven-development` | `skills/test-driven-development/SKILL.md` | Implementing any logic, fixing any bug, changing any behavior; proving code works |

### Thinking & Requirements

| Skill | Path | Use When |
|---|---|---|
| `interview-me` | `skills/interview-me/SKILL.md` | The ask is underspecified ("build me X" without who/why); user invokes "interview me" / "grill me"; you're silently filling ambiguous requirements before any plan exists |
| `idea-refine` | `skills/idea-refine/SKILL.md` | Idea still vague; stress-testing assumptions before committing; expanding options before converging. Triggers: "ideate", "refine this idea", "stress-test my plan" |
| `doubt-driven-development` | `skills/doubt-driven-development/SKILL.md` | Correctness matters more than speed; unfamiliar code; high stakes (production, security-sensitive, irreversible ops); verifying now cheaper than debugging later |
| `source-driven-development` | `skills/source-driven-development/SKILL.md` | Grounding implementation decisions in official docs; building with any framework/library where correctness matters |

### Quality & Recovery

| Skill | Path | Use When |
|---|---|---|
| `debugging-and-error-recovery` | `skills/debugging-and-error-recovery/SKILL.md` | Tests fail, builds break, behavior mismatches expectations, any unexpected error — systematic root-cause approach instead of guessing |
| `code-review-and-quality` | `skills/code-review-and-quality/SKILL.md` | Reviewing code (yours, another agent's, a human's) before it enters main |
| `code-simplification` | `skills/code-simplification/SKILL.md` | Refactoring for clarity without behavior change; code works but is hard to read/maintain/extend |
| `browser-testing-with-devtools` | `skills/browser-testing-with-devtools/SKILL.md` | Building/debugging anything that runs in a browser; inspecting DOM, console errors, network requests, performance profiles, visual verification. Requires chrome-devtools MCP |

### Design & Interfaces

| Skill | Path | Use When |
|---|---|---|
| `api-and-interface-design` | `skills/api-and-interface-design/SKILL.md` | Designing REST/GraphQL endpoints, module boundaries, type contracts between modules, frontend↔backend boundaries |
| `frontend-ui-engineering` | `skills/frontend-ui-engineering/SKILL.md` | Building/modifying pages, components, layouts; WCAG accessibility; state management; output must look production-quality, not AI-generated |

### Cross-Cutting Concerns

| Skill | Path | Use When |
|---|---|---|
| `security-and-hardening` | `skills/security-and-hardening/SKILL.md` | Handling user input, auth, data storage, external integrations, untrusted data, sessions, third-party services, GDPR/CCPA |
| `performance-optimization` | `skills/performance-optimization/SKILL.md` | Performance requirements exist; suspected regressions; Core Web Vitals/load times; N+1 queries; profiling bottlenecks |
| `observability-and-instrumentation` | `skills/observability-and-instrumentation/SKILL.md` | Adding logging/metrics/tracing/alerting; shipping features that must prove they work in production; production issues invisible in current data |
| `documentation-and-adrs` | `skills/documentation-and-adrs/SKILL.md` | Architectural decisions; changing public APIs; recording context future engineers need |
| `deprecation-and-migration` | `skills/deprecation-and-migration/SKILL.md` | Removing old systems/APIs/features; migrating users between implementations; maintain-vs-sunset decisions |
| `git-workflow-and-versioning` | `skills/git-workflow-and-versioning/SKILL.md` | Making any code change; committing, branching, conflict resolution, parallel work streams; releases, semver bumps, tags, changelogs |
| `ci-cd-and-automation` | `skills/ci-cd-and-automation/SKILL.md` | Setting up/modifying build & deploy pipelines; quality gates; CI test runners; deployment strategies |
| `shipping-and-launch` | `skills/shipping-and-launch/SKILL.md` | Preparing production deploys; pre-launch checklist; monitoring setup; staged rollout; rollback strategy |

### Meta

| Skill | Path | Use When |
|---|---|---|
| `context-engineering` | `skills/context-engineering/SKILL.md` | Starting a session; agent output quality degrading; switching tasks; configuring rules/context for the project |
| `using-agent-skills` | `skills/using-agent-skills/SKILL.md` | Session start; discovering which skill applies. Meta-skill governing how all other skills are discovered and invoked |

---

## Intent → Skill Mapping

- New feature / significant change → `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` + `test-driven-development`
- Underspecified ask / vague idea → `interview-me`, then `idea-refine` if concept-level ambiguity remains
- Planning / breakdown / estimation → `planning-and-task-breakdown`
- Bug / failure / unexpected behavior → `debugging-and-error-recovery`
- Code review (before merge) → `code-review-and-quality`
- Refactoring for clarity → `code-simplification`
- API endpoints / module boundaries / type contracts → `api-and-interface-design`
- UI work (pages, components, styling, a11y) → `frontend-ui-engineering`, verify with `browser-testing-with-devtools`
- Committing / branching / releasing → `git-workflow-and-versioning`
- Auth / input handling / integrations / personal data → `security-and-hardening`
- Slowness / N+1 / Web Vitals → `performance-optimization`
- Logging / metrics / production evidence → `observability-and-instrumentation`
- Architectural decision → `documentation-and-adrs`
- Removing / replacing existing systems → `deprecation-and-migration`
- Pipelines / CI quality gates → `ci-cd-and-automation`
- Using framework/library features where correctness matters → `source-driven-development`
- High-stakes / irreversible decision → `doubt-driven-development`
- Production deployment → `shipping-and-launch`

## Lifecycle Mapping (Implicit Commands)

There are no slash commands like `/spec` or `/plan`. Internally follow:

- DEFINE → `interview-me` (if underspecified) → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development` (+ `source-driven-development` when framework details matter)
- VERIFY → `debugging-and-error-recovery` (+ `browser-testing-with-devtools` for UI)
- REVIEW → `code-review-and-quality` (+ `doubt-driven-development` for high stakes)
- SHIP → `git-workflow-and-versioning` + `shipping-and-launch`

## Conventions

- Monorepo: never mix backend/frontend concerns in one change; keep each app self-contained under its directory.
- Backend follows NestJS module conventions (`src/<module>/{module,controller,service}.ts`).
- Frontend uses React function components + Tailwind utility classes; no CSS-in-JS.
- Env config via `.env` (copy from `.env.example`; never commit real secrets).

## Design System (Mandatory)

The frontend has a design system defined in `docs/DESIGN_SYSTEM.md`.

- **Always** use the UI Kit components in `frontend/src/components/ui/` and the
  semantic tokens (`primary`, `success`, `danger`, `surface`, `border`,
  `text-secondary`, `on-accent`) defined in `frontend/src/index.css`.
- **Forbidden** outside `frontend/src/components/ui/` and `frontend/src/index.css`:
  raw color classes (`indigo-*`, `green-*`, `red-*`, `blue-*`, …).
- **Check:** run `npm run check:design` (from `frontend/`) after any UI change;
  it fails on forbidden raw color classes.
- **Docs:** consult and keep `docs/DESIGN_SYSTEM.md` in sync with the actual
  implementation (names must match exactly — e.g. `Toast`, not `SuccessBanner`).
