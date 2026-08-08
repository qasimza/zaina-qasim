# Personal Porfolio

I grew up and fell in love with 3d so I figured I'd build a new website

## Documents

- [docs/functional-design.md](docs/functional-design.md) — what the site is and how it behaves
- [docs/tech-stack.md](docs/tech-stack.md) — how we build it: stack decisions and build order

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server (frontend only, port 5173) |
| `npm run cf:dev` | Build target preview: Worker + site together (port 8787) |
| `npm run build` | Type-check and build the site into `dist/` |
| `npm run lint` | Run the linter (oxlint) |
| `npm run deploy` | Build and deploy to Cloudflare |

## Directory structure

```
zaina-qasim/
|
|-- docs/                      The two design documents.
|   |-- functional-design.md     What the site is and how it behaves.
|   `-- tech-stack.md            How we build it. Decisions and build order.
|
|-- src/                       BROWSER CODE. Everything here ships to visitors.
|   |                          Never put a secret in this folder.
|   |-- main.tsx                 The entry point. Starts the app. Runs
|   |                            app-start calls one time.
|   |-- App.tsx                  The root component. Holds the Canvas and
|   |                            the HTML overlay.
|   |-- index.css                Global styles. Later: the palette tokens.
|   |-- api/                     The ONLY place that calls fetch.
|   |   |-- client.ts              Shared getJson helper and ApiError.
|   |   `-- hello.ts               One typed function per endpoint.
|   |                              Later: weather.ts, contact.ts, chat.ts.
|   |-- store/                   Zustand stores. Shared state lives here.
|   |   `-- appStore.ts            Later: weatherStore, twinStore.
|   `-- scene/                   3D world components (React Three Fiber).
|       `-- SpinningCube.tsx       Later: the hero, museum, journey scenes.
|
|-- worker/                    SERVER CODE. Runs on Cloudflare, not in the
|   |                          browser. The deployed site never sends this
|   |                          code to a visitor.
|   `-- index.ts                 Routes for /api/*. Later: the Anthropic
|                                proxy, weather cache, contact handler.
|                                Secrets are readable only here, at run time.
|
|-- public/                    Static files copied into the build as-is.
|                              Later: favicon, fonts, 3D model files.
|
|-- dist/                      BUILD OUTPUT. Vite writes it; the Worker
|                              serves it. Not in git. Never edit it.
|
|-- index.html                 The one HTML page. Vite injects the JS.
|
|-- wrangler.jsonc             Cloudflare config: serve dist/, route
|                              /api/* to worker/index.ts.
|-- vite.config.ts             Vite build config.
|-- package.json               Dependencies and the npm scripts above.
|-- tsconfig*.json             TypeScript settings.
|-- .oxlintrc.json             Linter rules.
`-- .claude/launch.json        Dev-server launch config for Claude Code.
```

The one rule that organizes everything: the browser/server boundary is the
`src/` vs `worker/` split. `src/` is public, `worker/` is private at run time.
The two only meet over HTTPS at `/api/*`.

**Note on the public repo:** this repository is public, so anyone can read the
source of `worker/` on GitHub. That is safe. Security comes from what the code
does not contain: no API keys, no database credentials, no visitor data.
Secrets live in Cloudflare's secret store and exist only inside the running
Worker. See the security section of [docs/tech-stack.md](docs/tech-stack.md).
