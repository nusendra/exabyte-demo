# Exabyte Demo — AI-driven dev workflow

A workshop demo of an end-to-end AI development loop:

> Developer files a **ClickUp** task → a **LangGraph TS agent** writes a test,
> implements the change in a **SvelteKit** blog, opens a **GitHub PR**, and
> comments the PR back on the ticket → developer reviews + merges → **Netlify**
> deploys.

```
exabyte-demo/
├── web/     SvelteKit blog, posts in a JSON file, deployed to Netlify
└── agent/   LangGraph TS agent: ClickUp task -> PR
```

## 1. Blog (`web/`)

SvelteKit + Svelte 5, posts stored in `web/src/lib/data/posts.json`, read via
`web/src/lib/posts.ts`. Routes: `/` (list) and `/blog/[slug]` (post).

```bash
cd web
npm install
npm run dev       # http://localhost:5173
npm run test      # vitest
npm run build     # prerendered output in web/build (Netlify publish dir)
```

### Deploy to Netlify
1. Push this repo to GitHub.
2. Netlify → Add new site → Import from GitHub → pick the repo.
3. Settings come from `web/netlify.toml` (base `web`, build `npm run build`,
   publish `build`). Deploy.
4. Every merge to `main` auto-deploys.

## 2. Agent (`agent/`)

LangGraph state machine (`agent/src/graph.ts`):

```
fetchTask → planChange → prepareBranch → writeTest → implement → verify
                                                          │
                            ┌─────────────────────────────┤
                    tests pass                        tests fail
                            │                    (< MAX_ATTEMPTS → implement)
                            ▼                    (exhausted → reportFailure)
                        createPR → updateClickup → END
```

- `fetchTask` — GET the task from ClickUp.
- `planChange` — Claude plans the smallest verifiable change.
- `prepareBranch` — `git checkout -B agent/task-<id>`.
- `writeTest` — Claude writes a vitest for the acceptance criteria.
- `implement` — Claude edits `web/` source; retried with test output as feedback.
- `verify` — runs `npm run test` in `web/`.
- `createPR` — commit, push, `gh pr create`.
- `updateClickup` — move task to review status + comment the PR link.

### Setup
```bash
cd agent
npm install
cp .env.example .env    # fill in ANTHROPIC_API_KEY + CLICKUP_TOKEN
```

Needs the GitHub CLI authenticated for PRs: `gh auth login`.

### Run
```bash
# Wiring test — no API key, no network, canned change, real vitest run:
npm run dry-run

# Real run against a ClickUp task:
npm run agent -- <clickup-task-id>

# Real change but skip push/PR/ClickUp writes:
DRY_RUN=1 npm run agent -- <clickup-task-id>
```

### Env (`agent/.env`)
| var | purpose |
|-----|---------|
| `ANTHROPIC_API_KEY` | Claude model for plan/test/implement |
| `CLICKUP_TOKEN` | ClickUp personal token (`pk_...`) |
| `CLICKUP_TASK_STATUS_REVIEW` | status to move task to (default `in review`) |
| `AGENT_MODEL` | default `claude-opus-4-8`; e.g. `claude-sonnet-5` to save cost |
| `BASE_BRANCH` | PR base (default `main`) |
| `MAX_ATTEMPTS` | implement/verify retries (default 3) |
| `DRY_RUN` / `FAKE_LLM` | demo/testing flags |

## Demo runbook
1. Show the blog live on Netlify.
2. Create a ClickUp task, e.g. *"Add reading-time to blog posts"*.
3. `cd agent && npm run agent -- <task-id>` — narrate each node as it prints.
4. Open the generated PR; review the diff + the new test.
5. Merge → watch Netlify redeploy → refresh the blog with the new feature.

## Pre-demo checklist
- [ ] `gh auth login` done, repo pushed to GitHub, `main` is default branch.
- [ ] Netlify site connected and first deploy green.
- [ ] `agent/.env` filled; `npm run dry-run` passes.
- [ ] A ClickUp list + a sample task id ready; token has write access.
- [ ] Pick a task whose change is small and unit-testable (JSON/helper level).
