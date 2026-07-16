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
3. Settings come from `netlify.toml` at the repo root (base `web`, build
   `npm run build`, publish `build`) — leave the UI build fields as detected. Deploy.
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
- `planChange` — DeepSeek plans the smallest verifiable change.
- `prepareBranch` — `git checkout -B agent/task-<id>`.
- `writeTest` — DeepSeek writes a vitest for the acceptance criteria.
- `implement` — DeepSeek edits `web/` source; retried with test output as feedback.
- `verify` — runs `npm run test` in `web/`.
- `createPR` — commit, push, `gh pr create`.
- `updateClickup` — move task to review status + comment the PR link.

### Setup
```bash
cd agent
npm install
cp .env.example .env    # fill in DEEPSEEK_API_KEY + CLICKUP_TOKEN
```

Needs the GitHub CLI authenticated for PRs: `gh auth login`.

### Run
```bash
# Wiring test — no API key, no network, canned change, real vitest run:
npm run dry-run

# Watch mode (recommended) — poll the ClickUp list and auto-run on new tickets:
npm run watch

# One-shot against a specific ClickUp task:
npm run agent -- <clickup-task-id>

# Revise an in-review PR from its review feedback (pushes to the same branch):
npm run revise -- <PR-number>

# Real change but skip push/PR/ClickUp writes:
DRY_RUN=1 npm run agent -- <clickup-task-id>
```

### Watch mode
`npm run watch` polls `CLICKUP_LIST_ID` every `POLL_INTERVAL_MS`. Any task in
`CLICKUP_TRIGGER_STATUS` (default `to do`) is claimed by moving it to
`CLICKUP_INPROGRESS_STATUS` (default `in progress`), then the graph runs it to a
PR and `in review`. The status change prevents a task being processed twice.
Status flow: **to do → in progress → in review → (merge) complete**.

### Revise (automatic, same watcher)
`npm run watch` also handles review feedback — you only run **one** CLI.
Each poll it checks open agent PRs: if the newest human feedback is newer than
the last commit, it reads the feedback, applies fixes, keeps tests + build
green, and pushes to the same branch. Pushing makes the last commit newest
again, so it stops until the next comment arrives.

To request changes: just comment on the PR (a plain conversation comment, a
review summary, or inline all work). Bot comments (Netlify, etc.) and the
agent's own `🤖` comments are ignored so it never loops on itself.

Manual one-off (optional): `npm run revise -- <PR-number>` does the same for a
single PR. Add `DRY_RUN=1` to preview without pushing.

### Env (`agent/.env`)
| var | purpose |
|-----|---------|
| `DEEPSEEK_API_KEY` | DeepSeek model for plan/test/implement |
| `CLICKUP_TOKEN` | ClickUp personal token (`pk_...`) |
| `CLICKUP_LIST_ID` | list the watcher polls (watch mode) |
| `CLICKUP_TASK_STATUS_REVIEW` | status to move task to after PR (default `in review`) |
| `CLICKUP_TRIGGER_STATUS` | watch: status that triggers the agent (default `to do`) |
| `CLICKUP_INPROGRESS_STATUS` | watch: claimed status (default `in progress`) |
| `POLL_INTERVAL_MS` | watch: poll interval (default 15000) |
| `AGENT_MODEL` | default `deepseek-chat`; `deepseek-reasoner` for harder tasks |
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
