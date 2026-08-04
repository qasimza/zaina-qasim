# Personal Website — Planning Doc

**Goal:** A recruiter-credible but personality-forward personal site. Software-heavy with a creative streak — should feel arty and interactive, not like a templated portfolio. Built on Cloudflare (hosting already exists, not yet configured).

---

## Site Structure & Concept

**Major pivot (locked):** the site opens on a **single wide outdoor coastal-hills scene** — the Hero — rather than a stacked-sections scroll from the start. Everything in the scene is visible at once (no hidden/hunted-for objects); each landmark is a direct entry point into a section. Once inside a section, the site still uses continuous camera-driven scroll/movement — the pivot is specifically about how sections are *entered*, not a return to full spatial exploration everywhere.

### The Hero — coastal hillside landscape
One wide, atmospheric establishing shot (leaning painterly/cinematic, not isometric-game-icon style) of an outdoor coastal-hills scene — golden hillside with the ocean visible below, Getty/Malibu-inspired. All landmarks below are visible simultaneously in this one view — nothing requires searching or navigating to find:

**Staging — three depth layers, held in one shot (decision: locked):**
- **Background:** sky (weather/time display surface), a glimpse of ocean in the distance, and the **path winding up to the Museum** visible receding into the far hillside
- **Midground:** the **signpost** ("follow my journey") — a secondary, closer-in point of interest
- **Foreground, closest to camera:** the **mailbox** (Contact entry) and the **digital twin**, physically present (e.g. on a bench) — met by noticing them, not by clicking an icon

**Eye-path/hierarchy:** the twin draws the eye first (it's alive/moving among static landmarks), then mailbox and signpost read as secondary, then the path-to-museum recedes last — creates a natural "there's more to explore further out" feeling without hiding anything.

**Depth cues for the 3D build:** foreground elements larger/sharper/more saturated, background elements smaller/hazier/slightly desaturated (atmospheric perspective) — this is what sells the shot as deep rather than flat cutouts.

**Camera behavior:** held mostly static with a slow, gentle idle drift (subtle parallax, like breathing) — not locked-off, but never real navigation. Keeps ambient motion alive (grass sway, distant ocean shimmer, cloud drift).

- **A path leading up to a museum** on the hillside → entry to **Museum of Creations**
- **A mailbox** sitting in the landscape → entry to **Contact** (opens the letter-writing/fold/throw interaction; the plane is thrown into the open sky/wind rather than at a window, now that the scene is outdoor)
- **A signpost** ("follow my journey") → entry to **Journey**
- **The digital twin**, physically present in the scene (e.g. on a bench, by a fire) — met by noticing them, not by clicking an icon. This effectively folds the old separate "About" section into the Hero itself, rather than being a later stop on a scroll. **Visual detail:** an open backpack near/on the twin with small tech/skill logos spilling out of it — a nice character touch, not a functional interaction (the real Skills scroller still lives elsewhere, reached from inside Journey/Museum).
- **The sky itself** reflects real weather/time (clouds, sun position, rain, marine-layer fog over the hills) — the weather system's display surface, replacing the earlier "window" object idea entirely.

### Sections reached from the Hero
- **Journey** — the narrative spine: life, career moves, key milestones, told chronologically, incorporating **doors** as a recurring motif for each milestone (open a door → vignette for that chapter; close it → move to the next) and **flight paths** (arcing line + plane animation on a stylized map/globe) specifically for travel/relocation milestones. Freestanding doors set in an outdoor/landscape setting (not an indoor hallway) — consistent with the Hero's outdoor world. Touches Museum of Creations pieces briefly as story beats, linking out rather than re-explaining them.
- **Museum of Creations** — merged art + software showcase, an art museum reached via the hillside path (see the Museum of Creations section below for full detail)
- **Contact** — the letter/paper-airplane interaction, now thrown into the open sky rather than at a window (see the Contact Section below)
- **Skills** — scroller; each skill pulls in/highlights the Journey moments and Museum of Creations pieces that used it — the connective layer tying the whole site together; not a landmark in the Hero, reached from inside Journey/Museum

### Persistent/global elements (not tied to one section)
- **Digital twin mini-widget** — full experience while in the Hero (where the twin lives), minimizes into a small persistent widget that follows across the rest of the site once you've moved into a section (see the Digital Twin section below)
- **Resume button** — persistent floating button/pill, available from anywhere on the site (opposite corner from the twin widget so they don't collide), opens/downloads the resume PDF instantly — the fast path for recruiters who just want the traditional document

*Not yet detailed: specific content/copy/layout for Journey and Skills scroller mechanics (partial — see the Museum of Creations section for how Skills links to it).*

---

## Tech Stack

- **React Three Fiber + drei** — scene management, still allows raw GLSL materials
- **GSAP + ScrollTrigger** (or Framer Motion) — drives camera movement/state off scroll position
- **Cloudflare Pages** — hosting for the static build
- **Cloudflare Worker** — backend proxy for API calls (see Digital Twin below)
- **Cloudflare Containers** (GA product) — hosts the voice cloning model (Docker container, CPU-only, bound to the Worker by hostname, scales to zero)
- Real DOM/HTML overlaid for all actual text content — WebGL is the visual world underneath/around it, never the only place text lives

**Performance note:** build one section fully as a proof of concept before committing the whole architecture — persistent shader scenes need care around mobile GPU load, battery, and load time.

---

## Digital Twin (About section)

An interactive 3D avatar + AI chat, built from "you" — text + cloned voice.

### Avatar visual style
**Decision: Particle-based abstract form.** Chosen over a rigged 3D character bust (too much production work, commits to one literal "face") or a shader-distorted photo (viable alternative, more literal). Particles fit the shader aesthetic, avoid uncanny valley, and are the most aligned with existing Three.js/GLSL skills.

### Particle states
- **Idle** — loose held form, gentle ambient noise-driven drift ("breathing")
- **Listening** — particles tighten/shimmer while visitor types
- **Thinking** — distinct swirl/vortex while waiting on the Claude + TTS round trip (must not look frozen)
- **Speaking** — driven by real audio data via Web Audio API `AnalyserNode` reading amplitude/frequency, fed into the particle shader as a uniform (genuinely audio-reactive, not canned)

### Chat UI
- **Input:** both suggested question chips AND free-text input available together (chips lower the barrier to a first interaction; free text stays available for going off-script)
- **Captions:** on by default, shown alongside audio playback
- **Full → sticky widget behavior:**
  - Full-size interactive experience while in the About/Hero section
  - On scroll away: minimizes into a small persistent widget that follows across the rest of the site
  - Widget remains clickable/re-openable for new questions at any time
  - Clicking the mini widget re-expands it as an overlay/panel in place — does not scroll the user back to About
- **Scroll-away audio behavior:** audio **stops immediately** on scroll away (avatar drops to idle). Text/captions **keep streaming to completion** even without sound — sentence finishes in the transcript, nothing cut off mid-thought.
  - **Build note:** this means text streaming and audio playback must be decoupled, not tied 1:1 — text stream advances on its own timeline independent of whether audio is killed.

### Voice — cloning
- **Decision: clone the real voice**, not a stock voice
- **Constraint:** no new paid subscriptions/vendors beyond existing OpenAI/Anthropic/Gemini credits, and no exposing a personal computer to the public internet
- **Model choice:** CPU-friendly open-source cloning model — candidates: **NeuTTS Air** (0.5B, GGUF/GGML, built for consumer hardware) or **Pocket TTS** (100M params, faster than real-time on laptop CPU). Avoid GPU-oriented models (Fish Speech 1.5, XTTS v2, CosyVoice2) — much slower on CPU.
- **Hosting:** package the chosen model in a Docker container → deploy via **Cloudflare Containers** (GA, CPU workloads supported, billed on active CPU only, scales to zero) → Worker calls it by hostname. Entire stack stays on Cloudflare; personal computer is only used for local prototyping before containerizing.
- **Open item:** not yet verified that NeuTTS Air / Pocket TTS containerize cleanly — confirm early during implementation, not a blocking assumption.

### Chat backend architecture
```
Frontend (chat UI + particle avatar)
   ↓
Cloudflare Worker (holds API keys as secrets, rate-limited)
   ↓ text                              ↓ audio
Anthropic API                    Cloudflare Container
(generates reply,                (runs cloned-voice
 persona system prompt)           TTS model)
   ↓                                    ↓
        Both streamed back to frontend
```

### Chat scope
**Decision: Guided**, not freeform — steers toward background/projects rather than answering as a general-purpose chatbot. Important both for staying on-brand and for containing adversarial/off-topic probing from public visitors.

---

## TODO — Persona / System Prompt (not yet built)

To do at implementation time, not now. Method to follow:

**1. Raw material for voice** — gather 10-20 real examples of actual unfiltered writing (texts, Slack messages, tweets, emails) — throwaway/unpolished is more honest than polished writing.

**2. Scenario questions** (answer in own words, not self-description — self-description produces generic adjectives, reactions produce real voice):
   - Tell me about a project that went badly. How would you describe it to a friend?
   - What's something in software most people take too seriously?
   - If someone asked "why should I hire you" at a party, not an interview, what would you actually say?
   - What's a hot take you have about your field?

**3. "Would never say" list** — define voice by exclusion (e.g. no corporate phrases, no self-deprecating humor, whatever doesn't fit).

**4. Catchphrases/verbal tics** — actual recurring phrases, used as texture.

**5. Time-of-day greeting variants** — using the same voice material, write the ~16-24 pre-written tagline + twin-opener line variants across the 4 time-of-day buckets (see Visual & Art Direction section), plus the fallback default line.

**System prompt structure once material exists:**
- **Identity & voice** — built from real examples as few-shot samples, not adjective descriptions
- **Knowledge base** — grounded strictly in resume + provided facts; must admit not knowing rather than inventing details
- **Boundaries/redirects** — in-character warm redirects for adversarial prompts, off-topic tangents, sensitive topics (salary, ex-employer gossip, etc.) — not robotic refusals
- **Behavioral quirks** — small alive-making details (asks questions back, references specific projects unprompted, signature way of ending a thought)

**Resume:** user will supply directly at implementation time.

---

## Visual & Art Direction

**Overall mood: Coastal hills — Malibu / Palisades / Getty.** Corrects an earlier misstep where this was framed as full alpine/snow-capped mountain, replacing beach entirely. The actual direction is one unified place: golden/sage hillsides with the ocean visible below, warm Mediterranean light — hills and coast coexisting in the same view, not competing moods.

### Color palette
**Decision: locked.** Grounded in the Getty/Malibu reference:
- **Sage green** and **warm gold/tan** (hillside grasses, chaparral)
- **Travertine/sandstone stone tones** (warm cream, tan) — the Museum of Creations' architecture draws directly from the Getty's actual travertine material
- **Ocean blue/turquoise**, visible in the distance/below the hills — keeps a thread of the original beach direction rather than discarding it
- **Terracotta** as a warm accent
- Overall warm, golden-hour Californian light rather than cool/alpine light

Shaders and 3D effects should reflect this: dry golden-hour haze, dappled light through sparse trees, warm stone textures, ocean shimmer visible at a distance — not snow/mist/forest (the earlier alpine framing), and not tropical water caustics/sand (the original pure-beach framing) — something more sophisticated and specific than either.

### Typography
**Decision: locked, still applies.**
- **Headline:** Fredoka (rounded, friendly, carries the energy)
- **Body:** Inter (clean, neutral, highly legible — used for Work/Projects/Skills content)
- **Accent:** Space Mono (labels, skill tags, UI chrome — a soft nod to software identity)

### Weather-driven mood system
**Core feature, not a nice-to-have — affects shader/color architecture broadly, should be prototyped early.**

The site's visual mood shifts based on the visitor's real local time and weather, while staying within the coastal-hills identity (modulating, not replacing it). The Hero's open sky is the direct display surface for it (see Site Structure & Concept), not a window object.

- **Time of day** — read from browser timezone/clock, no permission needed. Buckets: Morning / Midday / Golden hour / Night.
- **Weather** — needs visitor location: geolocation (accurate, needs permission) or IP-based lookup (coarser, no permission prompt). Needs a graceful fallback if permission is denied — default to a pleasant baseline mood, don't block the experience. Buckets: Clear / Cloudy / Rain / Marine layer (fog) — swapped "Storm/Snow" for conditions that actually fit Southern California coastal weather.
- **API call:** goes through the Cloudflare Worker (same pattern as Anthropic/TTS calls), not called directly from the browser.
- **Mood mapping examples** (illustrative):
  - Clear + Midday → bright, warm, ocean sparkling in the distance
  - Marine layer/fog → soft gray-blue haze rolling over the hills, muted golds, moodier but still warm
  - Rain → rare, dramatic — a real particle rain effect, cooler cast but not cold
  - Golden hour (real local time) → the signature look — warm amber light raking across the hillside regardless of weather
  - Night → deeper, moodier version of the same palette — city/coast lights visible below, not a different identity

### Time-of-day greeting
**Decision: pre-written variants, time-of-day only — decoupled from weather.** Weather affects visual mood only (see above); the greeting reacts purely to local time. Free, instant, no network wait on load. Appears in **both** the Hero tagline and the digital twin's opening chat line.

- **Structure:** 4 time buckets (Morning / Midday / Golden hour / Night). Each needs 2-3 tagline variants + 2-3 twin-opener variants (randomly picked per visit so repeat visitors see variety) — roughly 16-24 short lines total, much more manageable than the earlier weather-combined version.
- **Fallback default required:** a neutral, intentional-feeling line for when time can't be determined — must not look like a broken state.
- Example pairing (illustrative, not final copy):
  ```
  Night:
    Tagline: "Late night browsing? I respect it."
    Twin opener: "Hey — burning the midnight oil? Ask me anything."

  Morning:
    Tagline: "Morning. Let's get into it."
    Twin opener: "Hey, good morning — what do you want to know?"
  ```

---

## Journey — Milestone Content (early draft)

**Design principle: granularity increases toward the present.** Early life gets broader strokes (fewer doors, bigger jumps in time), recent years get more detail (more doors, closer together). Mirrors how memory/story naturally works — childhood is a few big beats, recent life has texture.

**Milestones so far (chronological):**
1. Born in India
2. Early schooling in Saudi Arabia
3. Moved back to India — attended LMGC for high school
4. Moved to the US for college

**Note:** milestones 1→2, 2→3, and 3→4 are all real relocations — strong candidates for the flight-path animation (arcing line + plane on a map/globe) described in the Journey section above, since these are genuine "I flew there" moments, not just narrative transitions.

*Still needed: post-college milestones (jobs, current role, more recent/granular chapters) — to be added.*

---

## Museum of Creations — Detailed Design

**Concept: an art museum**, reached via the path leading up the hillside in the Hero scene. Merges what were separate "Creations" (art) and "Projects" (software) ideas into one showcase — art and code displayed side by side as museum exhibits, not separated into a false split, since the person doesn't see them as separate either.

### Structure
**Decision: distinct wings/rooms by category** — not one mixed hall. Since the site stays a single continuous scroll (not free spatial navigation), this means: the camera walks through Wing 1, then passes through a **threshold/doorway transition** into Wing 2 — sequential, not branching. The transition should read as "entering a new room" — a doorway moment, a shift in light/ambient shader tone — not just a hard cut.

**Wings, decided:**
1. **Art** — artwork, framed/spotlit
2. **Tech** — software projects, pedestal dioramas

**Future wing planned:** **Writings** (blog/writing pieces) — not being built now, but the doorway/transition mechanic should be built generically (works for any wing → any wing) so a third wing can be added later without reworking the navigation system.

### Exhibit design language
- **Artwork** — framed on the wall, spotlit
- **Software projects** — displayed on a pedestal as a small interactive diorama/live preview, something you approach and can actually interact with (like a museum touchscreen exhibit), not a flat framed screenshot
- **Museum plaque** beside each piece — real HTML text overlay (title, medium/tech stack, year), styled like an actual gallery placard — keeps it accessible/scannable, consistent with the site-wide rule that real content never lives WebGL-only
- **Architecture reference: the Getty Center** — travertine stone, geometric modern forms, a building that itself feels like an exhibit sitting up on the hill
- **Lighting carries a lot of the "museum" feeling** — a softly lit gallery hall (skylights, natural light, staying within the coastal-hills visual world) with a spotlight shader effect that brightens as you approach/hover a piece

### Relationship to other sections
- **Journey** mentions a project or artwork briefly as a story beat, and links out to its full exhibit in Museum of Creations rather than re-explaining it
- **Skills** scroller pulls in Museum of Creations pieces (and Journey moments) per skill — Museum of Creations is one of the two source-of-truth content stores the Skills layer draws from

---

## Skills Scroller — Concept (not yet fully detailed)

**Decision: horizontal scroller**, not the earlier particle-constellation idea. Each skill, when hovered/selected, triggers a fun animation that pulls in the Journey moments and Museum of Creations exhibits that used it — this is the connective layer tying the whole site's content together mechanically, not just thematically.

*Open item: the actual pull-in animation mechanic, visual treatment of the scroller itself, and the underlying data model (tagging which Journey milestones and Museum of Creations pieces map to which skills) are not yet designed — next planning session.*

---

## Contact Section — Detailed Design

**Concept:** entered via a **mailbox** sitting in the Hero's coastal-hills landscape. Opening it reveals a letter/writing surface; the visitor fills it out, folds it into a paper airplane, and throws it into the open sky/wind to send it — replacing the earlier "desk by a window" version now that the scene is outdoor.

### Scene
- Reached directly from the mailbox landmark in the Hero (see Site Structure & Concept) — no separate scroll journey needed to arrive here, though it can still expand into its own focused view once opened
- Visual style stays in the coastal-hills world established in the Visual & Art Direction section — open air, natural light, not an interior desk-and-window setup

### The letter — real, accessible form
- Actual HTML `<input>`/`<textarea>` fields (name, email, message) positioned inside the 3D scene using React Three Fiber's `<Html>` (drei) — visually sits on the paper texture, but remains a real, keyboard-accessible form underneath
- Consistent with the site-wide principle: interactivity should never bury real content/functionality behind WebGL-only rendering

### Fold animation — flat letter → paper airplane
**Decision: morph target blend.** A single mesh with blend-shape data smoothly interpolates between the "flat paper" and "folded plane" shapes — the fold is visibly watched happening (creases forming, corners moving into place), not hidden behind a swap trick. More setup work than a mesh-swap approach (needs geometry authored with matching points between both states), but the more impressive result — worth it for a signature moment section.

### The throw
Eased trajectory (bezier/arc curve) from the mailbox/writing surface out into the open sky, with rotation/wobble along the path — hand-tuned arc rather than full physics simulation (physics engines like cannon.js/Rapier are overkill here and harder to art-direct into looking good).

### Exit + submission
**Decision: text confirmation appears after** the plane sails off into the open sky and out of view (not a particle/light flash, not a silent disappear).

- The moment the plane disappears into the distance/sky is the trigger for the actual form submission to fire
- **Backend note:** submission needs to go to the Cloudflare Worker, which then needs a way to actually deliver the message (e.g. a transactional email API like Resend) or store it somewhere checkable (e.g. KV/D1) — not yet decided which; flag as an implementation detail to resolve later

---

## Still Open / Not Yet Planned

- ~~Alpine color palette~~ — RESOLVED, see Coastal Hills palette in Visual & Art Direction
- Journey section: detailed content/copy/layout, exact milestone structure, and design of the door + flight-path mechanics
- Museum of Creations: which specific pieces/projects go in the Art vs Tech wing
- Skills scroller: pull-in animation mechanic, visual treatment, underlying skill-to-content data model
- Resume button: exact placement/styling
- Contact backend: email delivery vs. storage method (see Contact section)
- Build order / what to prototype first
