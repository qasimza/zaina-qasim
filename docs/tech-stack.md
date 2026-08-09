# Personal Website — Technical Design

This document is the companion to [functional-design.md](functional-design.md). That document says what the site is and how it behaves. This document says how we build it. It records the stack decisions, the architecture, the build order, and the items we must test early.

---

## Frontend

| Layer | Choice | Notes |
|---|---|---|
| Build tooling | **Vite + React + TypeScript** | No meta-framework (Next.js). The site is a 3D single-page app. It has no server-rendered content. The HTML overlay carries all real text. |
| 3D scene | **React Three Fiber (R3F) + drei** | R3F manages the three.js scene as React components. Raw GLSL materials stay possible. drei's `<Html>` puts real HTML (plaques, contact form) inside the scene. |
| Scroll and camera animation | **GSAP + ScrollTrigger + Lenis** | GSAP animates everything in the 3D world. Lenis makes the scroll smooth. Use the official Lenis + ScrollTrigger integration. |
| HTML UI animation | **Motion (optional)** | Motion is the maintained successor of Framer Motion. Only for HTML component transitions: chat panel open/close, plaque hover, resume button. It must not touch the scroll position or the canvas. |
| State | **Zustand** | Holds state that many parts read: active section, twin widget state, weather mood, audio state. Code inside and outside the canvas can read it. |
| Dev tooling | **leva** (dev only) | A control panel to adjust shader values and weather-mood values by hand. |
| Text content | **HTML overlay** | Site rule: all real text lives in HTML. WebGL is the visual world only. |

### Animation

GSAP animates everything in the 3D scene and everything scroll drives: camera moves, shader values, morph targets, pinned sections. GSAP timelines position steps in relation to each other, and ScrollTrigger maps timelines to scroll. Lenis smooths the scroll input. Motion, if used, animates HTML component transitions only. Its 3D package (`framer-motion-3d`) is deprecated and supports only React 18, so nothing in the scene uses it. GSAP and all its plugins are free.

### Server data and API calls

The site uses no data-fetching library. The three endpoints (a chat stream, a weather value with a refresh timer, a contact POST) do not fit a query cache.

The rules:

1. Each endpoint gets one typed function in `src/api/`, built on the shared `getJson` client. Components never call `fetch` directly.
2. App-start calls run outside React. `main.tsx` calls a store init function one time (see `src/store/appStore.ts`). Components read the store. This also prevents double calls from StrictMode.
3. A call tied to one component's lifecycle uses `useEffect` + `AbortController`. This is the fallback, not the default.
4. Results with many readers (weather, twin state) live in Zustand stores. The store owns its calls and its refresh timer. Weather refreshes on an interval and when the tab regains focus. Results with one reader (contact submit) stay in component state.
5. Chat gets its own stream handler at M5. It does not go through `getJson`.

### Asset pipeline

1. Compress all models: GLB with Draco or meshopt. Compress all textures: KTX2. Do this from the start. The hero scene is too heavy for mobile devices without compression.
2. Author the letter-fold morph target in Blender. Export one GLB with the same vertex order in both shapes.

### Performance budgets

These budgets come from published three.js guidance. We design to them; we do not re-derive them.

| Item | Budget | Source |
|---|---|---|
| Draw calls per frame | Under 100. Above 500 is a problem on any device. | [Draw calls: the silent killer](https://threejsroadmap.com/blog/draw-calls-the-silent-killer), [100 three.js tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) |
| Triangles, whole scene | Under 50K for mobile comfort. Under 500K for broad device support. | [three.js mobile optimization](https://digitalstrategyforce.com/journal/how-do-you-optimize-threejs-performance-for-mobile-devices/) |
| Shader precision | `mediump` on mobile. It runs about 2x faster than `highp`. | [100 three.js tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) |
| Varying variables per shader | Under 3 for mobile GPUs. | [100 three.js tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) |
| Shadow map size | 512–1024 on mobile. | [100 three.js tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) |

Draw calls matter more than triangle count. The cost per draw call is roughly the same for 10 triangles or 10,000. The fixes are instancing, merged geometry, and texture atlases.

**Limit of these numbers:** no source names the test hardware. They say "mobile GPUs" and "typical hardware", with no phone model or chipset. The published numbers are therefore design targets, not a prediction for any one device.

### WebGL-specific facts

WebGL in a browser is the thing we ship, so native GPU benchmarks (GFXBench, Vulkan, Metal scores) do not apply. What the sources say about WebGL:

1. The browser checks the safety of every WebGL call and isolates processes. This marshalling costs performance that native code does not pay. ([Wonderland Engine](https://wonderlandengine.com/about/webgl-performance/))
2. Safari, on iOS and macOS, adds large overhead on some WebGL calls. iOS is therefore the slower target, not the faster one. ([Wonderland Engine](https://wonderlandengine.com/about/webgl-performance/))
3. Browsers reach a complexity limit where frame rate drops, and mid-range Android devices reach it first. ([PixelFree Studio](https://blog.pixelfreestudio.com/webgl-in-mobile-development-challenges-and-solutions/))
4. Below 100 draw calls, WebGL and WebGPU perform about the same. Above 500, WebGL cannot hold frame rates that WebGPU can. This supports the under-100 draw call budget above.

**No usable per-device WebGL numbers exist in public sources.** [Basemark Web 3.0](https://web.gpuscore.com/) runs a WebGL browser benchmark and collects scores in its Power Board database, but the per-device results are not published as a citable table. We can run it on the test phone ourselves if a comparison number becomes useful.

This is the gap that makes the measurement rule below necessary.

Two costs have no published budget at all, because both depend on our own code and screen:

1. Fragment shader cost. It equals the instructions we write, times the pixels covered, times the device pixel ratio.
2. Sustained frame rate. Benchmarks report peak values. This site renders continuously while a visitor reads, so thermal throttling applies.

### Performance measurement

Because published budgets cannot answer the two items above, every milestone reports measured numbers on one named device.

1. Dev builds show a frame-rate counter and log `renderer.info`: `render.calls` (draw calls) and `render.triangles`. These are permanent fixtures, added at M1, not test scaffolding.
2. M1 records the first baseline: frame rate, draw calls, and triangles, on the named test phone (model and year), after two minutes of continuous rendering.
3. Every later milestone reports the same three numbers on the same phone, and compares them to the M1 baseline.
4. A rough scene must be rough in appearance only. Pixel coverage, shader complexity, layer count, and device pixel ratio must match the planned final version, or the measurement does not transfer.

---

## Cloudflare Architecture

**One Worker project.** Not Cloudflare Pages plus a separate Worker. Cloudflare tells new projects to use Workers with static assets. Pages gets no new investment. One `wrangler` config covers the site files, the API routes, and all bindings.

```
                    ┌─────────────────────────────────────────┐
                    │        Cloudflare Worker (single)        │
                    │                                          │
  Browser ────────▶ │  Static assets (Vite build, free reqs)   │
                    │  /api/chat     → Anthropic API (secret)  │
                    │  /api/tts      → Container binding ──────┼──▶ Cloudflare Container
                    │  /api/weather  → Open-Meteo + KV cache   │      (voice-clone TTS,
                    │  /api/contact  → D1 + send_email binding │       scales to zero)
                    └─────────────────────────────────────────┘
```

| Piece | Choice | Notes |
|---|---|---|
| Hosting | **Worker static assets** | Static file requests are free. Same CDN as Pages. |
| API routes | The same Worker | The Worker holds the API keys as secrets. |
| Voice TTS | **Cloudflare Containers** | CPU only. Scales to zero. Bound to the Worker. Limit: 4 vCPU / 12 GiB (standard-4 or custom types). This is enough for the candidate models. See the TTS risk section. |
| Contact log | **D1** | The permanent record. Email delivery can fail; the D1 row cannot get lost. |
| Weather cache | **KV** | Caches Open-Meteo responses per city for about 15 minutes. |
| Contact delivery | **`send_email` Worker binding** | See the contact form section. |

### Visitor data storage (D1)

**D1 is Cloudflare's hosted SQL database** (SQLite-based). It lives in the same Cloudflare account as the Worker. The Worker reaches it through a binding in `wrangler.jsonc` — no connection string, no credentials, no server to manage. It is not reachable from the internet; only the Worker and the `wrangler` CLI can query it. The free tier (5 GB, millions of reads per day) covers this site.

D1 is the single store for visitor data. Only the Worker writes to it. The frontend has no database access. This is the same boundary as the `src/api/` rule on the client side.

Each stored record carries the **visitor context**: IP address, country, city, user agent, and referer. The Worker reads these from the request headers and `request.cf`. No cookies are needed for this. Records stay; there is no deletion date.

1. **Contact messages** (M3) — name, email, message, timestamp, visitor context. The sender gives their email on purpose. Follow-up from this table is acceptable.
2. **Twin chat transcripts** (M5) — the Worker logs each conversation: a random conversation id, timestamps, the messages, and the visitor context. Purpose: review what visitors ask, improve the persona. The chat UI must show a short notice: "conversations are recorded". Design this notice into M5 from the start.
3. **Analytics events** (optional, later) — section visits, twin opens, resume clicks, with visitor context. Start with one D1 events table. Move to Workers Analytics Engine only if the row volume becomes a problem. No third-party analytics script.

The site sets no cookies today. A cookie-based visitor id comes later, for cross-session tracking and returning-visitor memory.

---

## Digital Twin backend

```
Frontend (chat UI + particle avatar)
   ↓
Worker /api/chat  ── Turnstile check, rate limit, persona system prompt
   ↓ text (SSE stream)                 ↓ audio
Anthropic API                    Container (cloned-voice TTS)
   ↓                                    ↓
   Both streamed back; text and audio timelines are decoupled
```

1. Text streams from the Anthropic API at once. Audio joins when the container delivers it.
2. The text timeline and the audio timeline are independent. The functional design requires this for scroll-away behavior. It also hides container cold starts.
3. The Worker sends text to TTS sentence by sentence. Sentence 1 plays while sentence 2 generates.

### Endpoint protection (build before launch)

`/api/chat` is a public door to a paid model. A stranger can script calls against it and spend the token budget. Required controls:

1. **Turnstile** check when a chat session starts. It is invisible, free, and Cloudflare-native.
2. **Workers Rate Limiting binding**, per IP.
3. A hard cap on `max_tokens` and on conversation length.
4. The guided-scope persona prompt (decided in the functional design).

The contact form gets the same Turnstile check, against spam.

Model output rules for the chat pipeline:

1. The model gets no tools. Chat is text in, text out.
2. The Worker never executes model output.
3. The browser renders replies as plain text, never as HTML.
4. Transcripts go into D1 through parameterized SQL.

Chat memory:

1. Each request to the model carries the current conversation's history. The twin remembers the full current conversation. The client sends the history each turn; the Worker enforces the length caps.
2. D1 transcripts are a log for the site owner, not a memory source. One session's stored transcript never enters another session's prompt.
3. The twin has no memory across sessions today. A returning visitor starts fresh. The planned cookie-based visitor id adds this later.

### Voice/TTS — the main technical risk

Candidates: **NeuTTS Air** (0.5B parameters, GGUF) or **Pocket TTS** (100M parameters). Pocket TTS is smaller, so it is more likely to run fast enough. Two failure modes exist. Test both before any twin code depends on them.

1. **Cold starts.** The container scales to zero. The first request after idle pays for image start plus model load: possibly 10–30+ seconds. Controls:
   1. Build the model weights into the image. Never download at boot.
   2. The Worker sends a wake request to the container on the first page request, before anyone opens the chat.
   3. The "thinking" particle state and text-first streaming cover the remaining wait.
2. **Speed on limited vCPUs.** Test locally with `docker run --cpus=2`. Measure seconds of audio produced per second of compute. If the result is below about 1× real time at 2 vCPU, use the smaller model or drop the voice feature.

**Degraded mode is a designed state.** If the container is cold or slow, the twin answers in text with captions and no audio plays. This must look intentional. The weather-permission fallback follows the same principle.

---

## Weather system backend

1. **Location:** each request to the Worker carries `request.cf.latitude / longitude / timezone / city`. No browser geolocation prompt. No IP-lookup service.
2. **Weather data:** Open-Meteo. Free, no API key. The Worker calls it.
3. **Cache:** KV, per city, about 15 minutes. City-level accuracy is enough for a mood system. A browser geolocation prompt is at most an optional accuracy upgrade.
4. **Time of day:** stays fully client-side (browser clock), per the functional design.

---

## Contact form backend

**Zero vendors. All Cloudflare.**

1. The form posts to `/api/contact`. Turnstile checks the request.
2. The Worker inserts the message into D1. This is the permanent record.
3. The Worker sends a notification email to the owner's inbox through the `send_email` binding. Requirements: Email Routing is enabled on the domain, and the owner's address is verified as a destination. The binding only delivers to verified destinations. That matches this use exactly.

Fallback: the Resend free tier. Only needed for delivery to arbitrary addresses, which this feature does not do.

---

## Build order

"M" means milestone. M0 is setup work; the site itself starts at M1. A number can split into lettered chunks (M0a–M0d) when we build it in small steps. Branch names reuse these labels (example: `m0c-worker-api-layer`).

The order starts work on an empty repo fast. Risk tests sit where they block work, not before everything.

1. **M0 — Skeleton.** Vite + React + TypeScript + R3F scaffold. One Worker with static assets. `wrangler deploy` to a live URL. Exit test: the spinning cube and `/api/hello` work on the real domain. After M0, every change is testable on a real phone.
2. **M1 — Hero proof of concept (pass/fail gate).** Rough coastal scene with the three depth layers, placeholder geometry. One real shader effect. Idle camera drift. GSAP + Lenis drive one camera transition. HTML text overlay. Exit test: acceptable frame rate and battery use on a mid-range phone. This tests the architecture the whole site depends on.
3. **M2 — Hero art pass + weather moods.** Real palette and lighting. The sky shows the weather. `/api/weather` with `request.cf` + Open-Meteo + KV. The functional design marks weather moods as core; build them early.
4. **M3 — First full section (Contact).** The smallest complete slice: mailbox entry, HTML form in the scene, fold morph target, throw, `/api/contact` with D1 + `send_email` + Turnstile. This tests the section-entry pattern and the full frontend-to-backend loop.
5. **TTS benchmark (parallel, any time before M5).** The `docker run --cpus=2` test above. It gates only the voice feature. It does not block M0–M4.
6. **M4 — Museum + Journey.** The large scroll sections. They reuse the camera and timeline patterns from M1. The Skills scroller comes after, because it reads data from both sections.
7. **M5 — Digital twin.** Chat UI, particle states, `/api/chat` with the protection controls, the persona prompt, then the voice pipeline if the benchmark passed.
8. **M6 — Polish.** Resume button, time-of-day greetings, transitions, performance review, accessibility check on all HTML overlays.

---

## Open items / test early

- [ ] Run the TTS benchmark with `--cpus=2` (NeuTTS Air vs Pocket TTS). This blocks the voice feature.
- [ ] Confirm the chosen TTS model runs correctly in a container.
- [ ] Confirm Email Routing is enabled on the domain and the destination address is verified. Do this before the contact Worker route.
- [ ] Build one section fully before the rest (M1 exit test: mobile GPU load, battery, load time).
- [ ] Measure the Lenis + ScrollTrigger + R3F frame budget on a mid-range phone early.
- [ ] Decide persona prompt handling before M5: where it lives, and what content policy applies to it.
- [ ] Decide the transcript table shape at M5: row per message or row per conversation, and the write timing.
- [ ] Add a privacy notice page before the twin launches: what the site stores and why, with a contact for questions.
