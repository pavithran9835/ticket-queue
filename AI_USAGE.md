# AI usage

**Tool used:** Claude Code (Anthropic), model Claude Opus 5.5, run in the Claude desktop app.

## What the AI did

Claude Code worked in an agentic loop: it read the requirements, inspected the database, wrote code, ran commands and
tests, drove the app in a browser, and made git commits. Its process is logged in `PROGRESS.md`. The AI produced:

| Area | Done by AI |
|------|------------|
| Requirements checklist and implementation plan (`REQUIREMENTS_CHECKLIST.md`, `PROGRESS.md`) | Drafted |
| Project scaffolding (workspaces, TypeScript, Vite, dependency versions) | Written |
| REST API: routes, validation, error handling, SQL repositories | Written |
| Optimistic concurrency (conditional UPDATE, 409 response) | Written |
| API tests, including the multi-process race test | Written |
| React UI: list, detail, update form, conflict notice | Written |
| UI redesign in an issue-tracker style (layout, icons, avatars, styles) | Written |
| UI component tests | Written |
| Manual end-to-end verification in a browser and with curl | Performed |
| README, API docs | Drafted |

## What I did

_[Candidate: fill in honestly, e.g. chose the stack and the process the AI had to follow (plan → implement →
verify → test → record per point), reviewed the code and design decisions, ran the app myself, edited the docs …]_

## Overall AI contribution

**Approximately _[fill in]_ % of the code and documentation was produced by AI.**
