# CLAUDE.md

Instructions for Claude Code in this repository.

## Communication rule

Use the `asd-ste100` skill style (Simplified Technical English, ASD-STE100) for all interactions:

1. Responses in chat.
2. Commit messages and PR titles/bodies.
3. All text written into `docs/` and `README.md`.

The core rules: short sentences (max 20–25 words), active voice, simple tenses, one meaning per word, no metaphors. Real API and product names stay unchanged. Documents describe the design; they do not record debates.

## Project context

- [docs/functional-design.md](docs/functional-design.md) — what the site is and how it behaves.
- [docs/tech-stack.md](docs/tech-stack.md) — the stack, the architecture, and the build order (milestones M0–M6).
- The README shows the directory structure and the npm commands.

## Working rules

1. The browser/server boundary is the `src/` vs `worker/` split. Secrets exist only in `worker/` at run time, never in `src/`.
2. Components never call `fetch` directly. All endpoint calls go through typed functions in `src/api/`.
3. Shared state lives in Zustand stores in `src/store/`. A store owns its fetch calls and timers.
4. This repo is public. Never commit secrets or `.dev.vars`.
5. Milestone work happens on `m<milestone>-<name>` branches. Other changes use short descriptive branches. Every change merges through a PR.
