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

- Chose the stack (React, Node.js + Express, the supplied SQLite file via better-sqlite3) and ruled out other
  databases or migrating the data.
- Defined the working process the AI had to follow for every point: plan → implement → verify against the brief →
  run the tests and exercise the real app → record evidence → commit. Also set the rules: no stubbed or faked
  requirements, never mark an item done without verification and a passing test, never modify the supplied
  database during tests.
- Required a complete requirements checklist up front and a final audit with a clean-install run.
- After the functional work was done, asked for the UI to be redesigned in a professional issue-tracker style.
- Checked that the app reads the supplied SQLite file rather than static data, then reviewed the result, ran the
  tests and tried the conflict scenario myself.

## Overall AI contribution

**Approximately 95% of the code and documentation was produced by AI.** My contribution was the direction,
the constraints and the process, plus review and testing, rather than writing code by hand.
