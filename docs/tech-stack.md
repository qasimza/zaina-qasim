# Personal Website — Technical Design

This document is the companion to [functional-design.md](functional-design.md). That document says what the site is and how it behaves. This document says how we build it. It records the stack decisions, the architecture, the build order, and the items we must test early.

---

## Frontend

| Layer | Choice | Notes |
|---|---|---|
| Build tooling | **Vite + React + TypeScript** | No meta-framework (Next.js). The site is a 3D single-page app. It has no server-rendered content. The HTML overlay carries all real text. |
| 3D scene | **React Three Fiber (R3F) + drei** | R3F manages the three.js scene as React components. Raw GLSL materials stay possible. drei's `<Html>` puts real HTML (plaques, contact form) inside the scene. |
| Scroll and camera animation | **GSAP + ScrollTrigger + Lenis** | GSAP animates everything in the 3D world. Lenis makes the scroll smooth. Use the official Lenis + ScrollTrigger integration. |
| HTML UI animation | **Framer Motion (optional)** | Only for HTML component transitions: chat panel open/close, plaque hover, resume button. It must not touch the scroll position or the canvas. |
| State | **Zustand** | Holds state that many parts read: active section, twin widget state, weather mood, audio state. Code inside and outside the canvas can read it. |
| Dev tooling | **leva** (dev only) | A control panel to adjust shader values and weather-mood values by hand. |
| Text content | **HTML overlay** | Site rule: all real text lives in HTML. WebGL is the visual world only. |

### Animation: why GSAP and not Framer Motion (decided)

1. `framer-motion-3d` was the official Framer Motion path into three.js. The package is deprecated and supports only React 18. Framer Motion has no supported 3D path now.
2. GSAP animates any JavaScript object property directly: `camera.position`, shader values, `morphTargetInfluences`. It needs no bridge code.
3. GSAP timelines set steps in relation to each other (`'-=1'`, `'<'`). When you change one step, the later steps move with it. Scroll-fraction ranges do not do this.
4. ScrollTrigger's `pin` holds the page still while scroll drives a camera move. This is the museum-walk mechanic. Horizontal scrollers inside a pinned section are a standard ScrollTrigger pattern.
5. GSAP and all its plugins are free since the Webflow acquisition.

### Server data and API calls (decided)

**No data-fetching library (no TanStack Query).** The site has three real endpoints. None of them fits a query cache:

1. Chat sends a stream. The code must read it chunk by chunk and must cancel it mid-stream.
2. Weather loads at start and refreshes on a timer. Shaders read it from Zustand on every frame, without React re-renders. A library cache would hold a second copy of the same data.
3. Contact sends one POST.

We add a library only if the site grows many endpoints with shared reads (example: a blog wing with a CMS).

The rules:

1. Each endpoint gets one typed function in `src/api/`, built on the shared `getJson` client. Components never call `fetch` directly.
2. App-start calls run outside React. `main.tsx` calls a store init function one time (see `src/store/appStore.ts`). Components read the store. This also prevents double calls from StrictMode.
3. A call tied to one component's lifecycle uses `useEffect` + `AbortController`. This is the fallback, not the default.
4. Results with many readers (weather, twin state) live in Zustand stores. The store owns its calls and its refresh timer. Weather refreshes on an interval and when the tab regains focus. Results with one reader (contact submit) stay in component state.
5. Chat gets its own stream handler at M5. It does not go through `getJson`.

### Asset pipeline

1. Compress all models: GLB with Draco or meshopt. Compress all textures: KTX2. Do this from the start. The hero scene is too heavy for mobile devices without compression.
2. Author the letter-fold morph target in Blender. Export one GLB with the same vertex order in both shapes.

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

D1 is the single store for visitor data. Only the Worker writes to it. The frontend has no database access. This is the same boundary as the `src/api/` rule on the client side.

1. **Contact messages** (M3) — name, email, message, timestamp. The sender gives their email on purpose. Follow-up from this table is acceptable.
2. **Twin chat transcripts** (M5) — the Worker logs each conversation. Purpose: review what visitors ask, improve the persona. Store a random conversation id, timestamps, and the messages. Do not store IP addresses. The chat UI must show a short notice: "conversations are recorded". Design this notice into M5 from the start.
3. **Analytics events** (optional, later) — section visits, twin opens, resume clicks. Start with one D1 events table. Move to Workers Analytics Engine only if the row volume becomes a problem. No third-party analytics script. The site stays cookie-free.

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

### Persona prompt: storage and injection (decided)

**Treat the prompt as public.** A visitor can talk the model into revealing its instructions. No defense stops this fully. So the prompt must contain no secrets and no data that cannot appear on the site itself. Then a successful extraction costs nothing.

**Storage:** the prompt lives in `worker/persona.ts`. That file is in `.gitignore`. The deploy bundles it into the Worker. The public repo gets `worker/persona.example.ts` with placeholder text, so a clone still builds. This hides the raw persona material for privacy, not for security. Move the prompt to KV only if we later need to edit it without a deploy.

**Injection:** a visitor can type "ignore your instructions" and the model can comply. The damage stays small because of four rules:

1. The model gets no tools. Chat is text in, text out.
2. The Worker never executes model output.
3. The browser renders replies as plain text, never as HTML.
4. Transcripts go into D1 through parameterized SQL. No code reads them back into prompts.

With these rules, a successful injection produces only off-brand text in the attacker's own session. The rate limit and the token cap limit the cost.

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

## Contact form backend (decided)

**Zero vendors. All Cloudflare.**

1. The form posts to `/api/contact`. Turnstile checks the request.
2. The Worker inserts the message into D1. This is the permanent record.
3. The Worker sends a notification email to the owner's inbox through the `send_email` binding. Requirements: Email Routing is enabled on the domain, and the owner's address is verified as a destination. The binding only delivers to verified destinations. That matches this use exactly.

Fallback: the Resend free tier. Only needed for delivery to arbitrary addresses, which this feature does not do.

---

## Build order (decided)

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
