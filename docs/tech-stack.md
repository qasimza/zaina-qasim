# Personal Website — Technical Stack & Architecture

Companion to [functional-design.md](functional-design.md), which owns concept/content/art direction. This doc owns the technical decisions: what we're building with, how the pieces connect, and what still needs validation.

---

## Frontend

| Layer | Choice | Notes |
|---|---|---|
| Build tooling | **Vite + React + TypeScript** | No meta-framework (Next.js etc.) — a 3D SPA has no SSR/SEO-critical content that the DOM overlay doesn't already handle. |
| 3D scene | **React Three Fiber + drei** | Scene management; raw GLSL materials stay possible. drei's `<Html>` positions real DOM (plaques, contact form) inside the scene. |
| Scroll & camera animation | **GSAP + ScrollTrigger + Lenis** | GSAP owns everything that touches the 3D world. Lenis provides smooth scrolling (use its official GSAP/ScrollTrigger integration). |
| DOM UI animation | **Framer Motion (optional, DOM-only)** | Confined to React component transitions: chat panel expand/collapse (`AnimatePresence`), plaque hovers, resume pill. Never touches scroll position or the canvas. |
| State | **Zustand** | Shared state that must work inside and outside the canvas: active section, twin widget minimized/expanded, weather mood, audio playing. Same maintainers as R3F. |
| Dev tooling | **leva** (dev-only) | Control panel for tuning shader uniforms and weather-mood parameters. |
| Text content | **Real DOM/HTML overlay** | Site-wide rule: WebGL is the visual world; real content never lives WebGL-only. |

### Why GSAP over Framer Motion for the 3D work (decided)

- `framer-motion-3d` (Framer Motion's official R3F bridge) is **deprecated, unmaintained, and React 18-only** — Framer Motion no longer has a supported path into three.js.
- GSAP tweens any JS object property directly: `camera.position`, shader uniforms, `morphTargetInfluences` — no bridge code.
- Choreography lives in **timelines with relative positioning** (`'-=1'`, `'<'`), not scattered scroll-fraction ranges — re-timing one beat shifts everything downstream automatically. This is the vocabulary the museum walk, Journey doors, and letter fold/throw will be tuned in.
- ScrollTrigger's `pin` + scrub is exactly the "camera walks through a room while the page holds still" mechanic; horizontal exhibit scrollers inside a pinned section are its canonical use case.
- GSAP is fully free (including formerly-paid plugins) since the Webflow acquisition.

### Asset pipeline

- **Draco/meshopt-compressed GLB** models, **KTX2** compressed textures — from day one, not as a later optimization; the coastal hero scene will blow past mobile budgets otherwise.
- Morph-target assets (letter → paper airplane fold) authored in Blender, exported as GLB with matching vertex order between states.

---

## Cloudflare Architecture

**One Worker project** (not Pages + separate Worker). Cloudflare's guidance for new projects is Workers with static assets; all platform investment is going there and Pages is in maintenance. One `wrangler` config, one deploy, gives us:

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
| Hosting | **Worker static assets** | Replaces the Pages plan. Static asset requests are free, same CDN. |
| API routes | Same Worker's fetch handler | Holds API keys as secrets. |
| Voice TTS | **Cloudflare Containers** | CPU-only, scales to zero, bound to the Worker. Up to 4 vCPU / 12 GiB (standard-4 or custom instance types) — plenty for the candidate models. See risk section below. |
| Contact log | **D1** | The durable record — email delivery is best-effort; the D1 row can't get lost. |
| Weather cache | **KV** | Cache Open-Meteo responses per city, ~15 min TTL. |
| Contact delivery | **`send_email` Worker binding** | See Contact section. |

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

- Text streams from Anthropic immediately; audio joins when the container delivers it. This decoupling (already a functional-design decision for scroll-away behavior) doubles as cold-start cover.
- Sentence-level chunked TTS: synthesize and ship sentence 1 while sentence 2 generates.

### Endpoint protection (build before launch, not after)

A public unauthenticated Worker proxying to the Anthropic API is a free-LLM endpoint for anyone who reads devtools. Minimum bar:

- **Turnstile** verification on chat session start (invisible, free, Cloudflare-native)
- **Workers Rate Limiting binding** per IP
- Hard caps on `max_tokens` and conversation length
- Guided-scope persona prompt (already decided in the functional design doc)

Same Turnstile check on the contact form for spam.

### Voice/TTS — the main technical risk

Candidates (from functional design doc): **NeuTTS Air** (0.5B, GGUF) or **Pocket TTS** (100M, faster than real-time on laptop CPU — the safer bet). Two failure modes to de-risk **before** building around this:

1. **Cold starts from scale-to-zero.** Image pull + model load can mean 10–30+ s for the first visitor after idle. Mitigations:
   - Bake model weights into the image — never download at boot.
   - Pre-warm: Worker fires a wake ping to the container on first *page* request, long before anyone opens the chat.
   - "Thinking" particle state + text-first streaming covers the remaining gap.
2. **Real-time factor on constrained vCPUs.** Benchmark locally under constraint before committing: `docker run --cpus=2`, measure seconds-of-audio per second-of-compute. Below ~1× real-time at 2 vCPU → drop to the smaller model or rethink.

**Graceful degradation is a designed state:** if the container is cold or slow, the twin answers in text with captions and audio simply doesn't play — must feel intentional, same principle as the weather-permission fallback.

---

## Weather system backend

- **Location without any permission prompt:** every request already carries `request.cf.latitude / longitude / timezone / city` — no browser geolocation, no IP-lookup service.
- **Weather data: Open-Meteo** — free, no API key, called from the Worker.
- Cache per city in KV (~15 min). Browser geolocation permission is at most an optional "improve accuracy" upgrade; coarse city-level weather is plenty for a mood system.
- Time-of-day buckets remain purely client-side (browser clock), per the functional design doc.

---

## Contact form backend (resolves the functional-design open item)

**Decision: zero-vendor, all-Cloudflare.**

1. Form posts to `/api/contact` (Turnstile-verified).
2. Worker **inserts into D1** — the durable log.
3. Worker sends a notification email to own inbox via the **`send_email` binding** (Email Routing must be enabled on the domain; own address verified as a destination — this binding only delivers to verified destinations, which is exactly the contact-form case).

Fallback if ever needed: Resend free tier (only required for delivery to arbitrary addresses, which this feature doesn't need).

---

## Build order (resolves the functional-design open item)

Ordered for momentum on an empty repo; risk spikes slot in where they gate work, not before everything.

- **M0 — Walking skeleton.** Vite + React + TS + R3F scaffold, one Worker with static assets, `wrangler deploy` to a live URL. Exit: spinning cube + working `/api/hello` on the real domain. Makes every later change testable on a real phone.
- **M1 — Hero proof of concept (go/no-go gate).** Blocked-out coastal scene with the three depth layers (placeholder geometry, not the art pass), one real shader effect, idle camera drift, GSAP + Lenis wired to one camera transition, DOM text overlay. Exit: acceptable frame rate/battery on a mid-range phone. This validates the architectural bet the whole site rests on.
- **M2 — Hero art pass + weather mood system.** Real palette/lighting, sky as weather display surface, `/api/weather` route with `request.cf` + Open-Meteo + KV. Weather moods are flagged in the functional design doc as core, prototype-early.
- **M3 — One full section end-to-end (Contact).** Smallest complete vertical slice: mailbox entry, HTML form in-scene, fold morph target, throw, `/api/contact` with D1 + `send_email` + Turnstile. Proves the section-entry pattern and the full frontend-to-backend loop.
- **TTS benchmark spike (parallel, anytime before M5).** The Docker `--cpus=2` benchmark described above. Gates only the twin's voice — not on the critical path for M0–M4.
- **M4 — Museum + Journey.** The big scroll-choreography sections; reuse the camera/timeline patterns M1 established. Skills scroller after, since it draws on both as data sources.
- **M5 — Digital twin.** Chat UI, particle states, `/api/chat` with protections, persona prompt (material gathered per functional-design TODO), then voice pipeline if the spike passed.
- **M6 — Polish pass.** Resume pill, time-of-day greetings, transitions, perf budget sweep, accessibility check on all DOM overlays.

---

## Open items / to validate early

- [ ] **Benchmark TTS candidates under `--cpus=2`** (NeuTTS Air vs Pocket TTS) — first implementation task, blocks the voice feature's viability.
- [ ] Confirm chosen TTS model containerizes cleanly (carried over from functional design doc).
- [ ] Verify domain has Email Routing enabled + destination address verified before building the contact Worker route.
- [ ] Build one section fully as proof of concept (mobile GPU load, battery, load time) before committing the whole architecture — carried over from functional design doc.
- [ ] Measure Lenis + ScrollTrigger + R3F frame budget on a mid-range phone early.
