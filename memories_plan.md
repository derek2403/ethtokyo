# Memories: Feature Plan and Delivery Roadmap

A phased, end‑to‑end plan to design, build, and ship the Memories “manga of your days” feature. Users browse a library of daily manga pages, open a reader with page‑flip polish, and generate/edit/export summaries of each day sourced from chats and in‑world interactions.

---

## 1) Objectives & Non‑Goals

- Objectives
  - Turn each day’s interactions into a readable manga page with summary and panels.
  - Make browsing fast and fun: filter by mood/tags, search, and jump by month.
  - Provide editing and safe regeneration options with strong privacy defaults.
  - Enable exporting to PDF/PNG for personal reflection or therapist‑safe sharing.
- Non‑Goals (initial release)
  - No social sharing feed; export is private and opt‑in only.
  - No heavy image generation pipeline at first; start with text panels + templates.
  - No long‑term clinical analytics; keep insights lightweight and user‑centric.

---

## 2) Primary User Stories

- As a user, I can open the Memories book from the 3D world and land on a grid of days grouped by month.
- As a user, I can generate “Today’s Memory” which drafts a summary and a panel script from my chats and interactions.
- As a user, I can open a day and read it in a two‑page manga spread with light page‑flip polish.
- As a user, I can edit text, reorder panels, and mark favorites.
- As a user, I can filter by mood/tags and search natural language queries.
- As a user, I can export a day as PDF/PNG, with a therapist‑safe redaction option.

---

## 3) Experience Overview

- Entry
  - Clicking the “Memories” manga object opens the page with a book‑open transition.
  - Deep link `pages/memories?date=YYYY-MM-DD` opens directly to that day.
- Views
  - Library Grid: covers for each day, grouped by month. Search, filters, quick actions.
  - Reader: full‑bleed, two‑page spread; summary on left, panels on right; edit/regenerate tools.
- Motion
  - Respect “prefers‑reduced‑motion”: use instant crossfade instead of page curl.

---

## 4) Architecture Overview

- Frontend (Next.js)
  - Page: `pages/memories.js` hosts Grid + Reader overlay.
  - Components: MemoryGrid, MemoryCard, FilterBar, MemoryReader, MemoryEditor.
  - State: local entity store (Zustand) + React Query for async (optional).
- Backend (optional; Next API routes)
  - `/api/memories`: CRUD for memory records; import/export endpoints.
  - `/api/generate/memory`: server‑side generation using chat/interactions.
- Data
  - IndexedDB for local‑first caching; pluggable cloud sync (Supabase/Firebase/Custom).
- Generation
  - Modular generator: prompt templates → summary → panel script → cover metadata.
  - Safety layer: sensitive content filtering; content warnings with opt‑in reveal.

---

## 5) Data Model (local entity shapes)

Types shown in TypeScript‑style for clarity.

```ts
// Core entities
export type Panel = {
  id: string;
  order: number;            // 0‑based index
  caption: string;          // short narration/dialogue
  altText: string;          // accessibility text
  imgUrl?: string;          // optional art (template or generated)
  style?: 'bw' | 'halftone' | 'colorAccent';
};

export type MoodMetrics = {
  primary: 'calm' | 'anxious' | 'sad' | 'happy' | 'angry' | 'mixed' | 'neutral';
  valence: number;          // -1 to 1
  energy: number;           // 0 to 1
  topEmotions: string[];    // ['hopeful','tired']
};

export type Memory = {
  id: string;               // yyyy-mm-dd or uuid
  date: string;             // ISO date
  title: string;            // e.g., "Finding calm after a storm"
  logline: string;          // one‑liner for cover
  tags: string[];           // ['exercise','breathing','friend']
  mood: MoodMetrics;
  skillsUsed: string[];     // coping skills linked to guides
  keyMoments: { time?: string; note: string }[];
  panels: Panel[];
  coverUrl?: string;        // cover thumbnail
  status: 'draft' | 'generated' | 'edited';
  favorite?: boolean;
  sources: SourceRef[];     // pointers to chat/journal events
  contentWarnings?: string[];
  version: number;          // for migrations
  createdAt: string;        // ISO
  updatedAt: string;        // ISO
};

export type SourceRef = {
  type: 'chat' | 'interaction' | 'journal' | 'sensor';
  id?: string;              // message id, interaction id, etc.
  timestamp?: string;       // ISO
  summary?: string;         // brief reference stored locally
};
```

- Index keys
  - By `date`, by `status`, by `favorite`, by `mood.primary`, and by `tags`.
- Migration
  - `version` allows incremental migration scripts in `lib/memories/migrations`.

---

## 6) Storage & Sync Strategy

- Local‑only (MVP)
  - IndexedDB via Dexie or idb‑keyval; JSON export/import from settings.
- Local‑first + Cloud (Phase 6+)
  - Supabase/Firebase/Auth with encryption at rest; offline queue + conflict resolution.
- Privacy
  - Optional local passcode to lock memories; redact on export by default.

---

## 7) Privacy & Safety

- Data handling
  - Never send content without explicit consent; separate toggle for generation.
  - On‑device pre‑filter for highly sensitive terms; warning + opt‑in reveal.
- Controls
  - Privacy mode: hide images by default; require unlock for viewing.
  - Redaction presets for therapist‑safe exports.
- Legal
  - Clear consent copy; data retention policy; local‑only default for MVP.

---

## 8) Accessibility (A11y)

- Keyboard: full navigation in grid and reader; visible focus rings.
- Screen readers: semantic roles, alt text per panel, labeled buttons.
- Motion: respect `prefers-reduced-motion`.
- Contrast: high‑contrast theme option; text size scaling.

---

## 9) Performance

- Library grid virtualization (react‑window) for large histories.
- Thumbnails: pre‑generate and lazy load; WebP/AVIF with placeholders.
- Reader: prefetch adjacent days; memoize render; split heavy editors.
- Caching: SW caching of static assets; IndexedDB for memories.

---

## 10) Content Generation Pipeline

- Inputs
  - Chat logs from `components/chat/ChatHistory.jsx` and daily interactions.
- Stages
  1) Day aggregation: collect messages/interactions for given date range.
  2) Summarization: derive title, logline, mood metrics, skills used, key moments.
  3) Panel script: 3–6 panels with captions and alt text; optional art notes.
  4) Cover metadata: pick a representative quote/mood for the cover.
  5) Safety pass: filter/redact sensitive content; add content warnings.
- Regeneration
  - Knobs: tone, panel count, art style, content sensitivity level.
- Implementation
  - `lib/memories/generator.ts` with pluggable providers (stub, OpenAI, local LLM).
  - For MVP, provide a deterministic template generator (no network) + optional server route.

---

## 11) UX Flows

- Generate Today
  - Click “Generate Today” → draft appears → review & edit → save.
- Edit Memory
  - Inline edit of title/logline; panel reorder; caption edit; favorite.
- Browse & Filter
  - Month switcher; mood/tag chips; search bar; favorites only.
- Reader & Export
  - Two‑page spread; page curl or crossfade; export PDF/PNG; therapist‑safe toggle.

---

## 12) Components & Files to Create

- Pages
  - `pages/memories.js`: grid + reader overlay + route parsing.
- Components (new)
  - `components/memories/MemoryGrid.jsx`
  - `components/memories/MemoryCard.jsx`
  - `components/memories/FilterBar.jsx`
  - `components/memories/MemoryReader.jsx`
  - `components/memories/MemoryEditor.jsx`
  - `components/memories/MoodRing.jsx`
- Lib (new)
  - `lib/memories/store.ts` (Zustand + idb persistence)
  - `lib/memories/db.ts` (IndexedDB helpers)
  - `lib/memories/generator.ts` (pipeline)
  - `lib/memories/migrations/*.ts`
- API (optional)
  - `pages/api/memories/[id].ts` (CRUD)
  - `pages/api/memories/index.ts` (list/create)
  - `pages/api/generate/memory.ts` (server‑side generation)

---

## 13) API Sketch (optional server)

```http
GET    /api/memories?month=2025-04&tag=exercise&favorite=true
POST   /api/memories                # create
GET    /api/memories/:id            # read
PUT    /api/memories/:id            # update
DELETE /api/memories/:id            # delete
POST   /api/generate/memory         # body: { date }
```

- Response shape: `Memory` entity; list endpoints return `{ items: Memory[], nextCursor?: string }`.

---

## 14) State Management & Caching

- Store
  - Entities by id; derived selectors (by month, favorites, filters).
  - UI state: selected date, reader open, filters, search query, reduceMotion.
- Persistence
  - IndexedDB with versioned migrations; snapshot export/import.
- Prefetching
  - Preload adjacent days on reader open.

---

## 15) Testing Strategy

- Unit
  - Generator prompts → summary/panels deterministic tests (for stub).
  - Store selectors and migrations.
- Integration
  - Grid rendering with virtualization; filter/search correctness.
  - Reader editing flow and export stub.
- E2E (later)
  - Generate → edit → export user journey.

---

## 16) Telemetry (privacy‑safe, opt‑in)

- Event counts: generation triggered, edits made, exports, favorites.
- Performance timings: generation duration, grid load, reader open.
- No content payloads; only aggregate timings and booleans.

---

## 17) Phased Delivery Plan

- Phase 0 — Alignment & Foundations (0.5–1 day)
  - Define scope, mood/tags taxonomy, and privacy defaults.
  - Decide storage: local‑only MVP; choose Dexie or idb‑keyval.
  - Acceptance: written spec approved; tech choices documented.

- Phase 1 — Data Layer & Migrations (1–2 days)
  - Implement `Memory`, `Panel` types, IndexedDB helpers, migrations, seed.
  - Add import/export of JSON in a hidden settings panel.
  - Acceptance: CRUD operations work; data persists across reloads; versioning proven.

- Phase 2 — Library Grid (2–3 days)
  - Build `MemoryGrid`, `MemoryCard`, `FilterBar`; month grouping; virtualization.
  - Search and basic filters (favorites, month, mood).
  - Acceptance: Scrollable grid with 200+ items remains smooth; filters/search correct.

- Phase 3 — Reader (2–3 days)
  - Full‑bleed overlay; two‑page layout; navigation arrows; reduced‑motion fallback.
  - Open on card click and via `?date=`; preserves scroll position on close.
  - Acceptance: Read a day; navigate prev/next; respects reduced motion.

- Phase 4 — Editor & Quick Actions (2 days)
  - Inline edits: title/logline/panels; reorder via drag; favorite toggle.
  - Kebab menu: delete, export, regenerate, share (disabled if not ready).
  - Acceptance: Edits persist; undo (single‑step) for panel reorder.

- Phase 5 — Generation (3–4 days)
  - Implement `lib/memories/generator.ts` with a local deterministic stub.
  - “Generate Today” flow: aggregate chat history → draft → review modal → save.
  - Safety pass with simple heuristics; content warnings.
  - Acceptance: Generating from sample chats yields plausible outputs; user can tweak.

- Phase 6 — Export (1–2 days)
  - Export to PNG and PDF (client‑side render to canvas / pdfkit).
  - Therapist‑safe redaction toggle (hide names, sensitive text, images optional).
  - Acceptance: Files download reliably; redaction applies correctly.

- Phase 7 — Advanced Filters & Search (1–2 days)
  - Tag chips, activities, skill linking; natural language search baseline.
  - Acceptance: Queries like “days I felt calmer after exercise” return expected days.

- Phase 8 — 3D Integration Polish (1 day)
  - Hook entry from 3D manga object; book‑open transition; return to world.
  - Acceptance: Smooth modal transition; back returns user to exact prior state.

- Phase 9 — A11y & Performance Pass (1–2 days)
  - Fix tab order; add ARIA; optimize images; re‑measure grid fps.
  - Acceptance: Lighthouse a11y > 90; scroll jank under threshold on low‑end.

- Phase 10 — Cloud Sync (Optional, 3–5 days)
  - Add auth and Supabase/Firebase; conflict resolution; encrypted at rest.
  - Acceptance: Same account across devices shows identical memories; offline works.

---

## 18) Milestones & Timeline (suggested)

- Week 1: Phases 0–2 (data + grid)
- Week 2: Phases 3–5 (reader + editor + generation)
- Week 3: Phase 6–9 (export, search, polish)
- Week 4+: Optional cloud sync and advanced art pipeline

---

## 19) Risks & Mitigations

- Generation quality varies
  - Start with deterministic template; add tuning; allow easy user edits.
- Privacy concerns
  - Local‑only default; clear consent; therapist‑safe export by design.
- Performance on large libraries
  - Virtualization, thumbnailing, prefetch, and memoization.
- Scope creep
  - Phase gates with acceptance criteria; keep art generation minimal at first.

---

## 20) Launch Checklist

- Functionality: generate → review → save → browse → read → edit → export.
- A11y: keyboard, alt text, contrast, reduced motion.
- Privacy: local‑only default, redactions verified, clear consent copy.
- Resilience: migration test, corrupted DB handling, empty states.
- Observability: basic, opt‑in metrics; error reporting without content payloads.
- Docs: short user help; developer README for memories.

---

## 21) Glossary

- Memory: The daily record with summary and panels.
- Panel: A single manga panel composed of caption, alt text, and optional art.
- Logline: One‑line summary shown on the cover card.
- Safety Pass: Redaction step that removes or masks sensitive content.

---

## 22) Immediate Next Steps (for this repo)

- Create component scaffolds and a local store:
  - `components/memories/MemoryGrid.jsx`, `MemoryCard.jsx`, `FilterBar.jsx`, `MemoryReader.jsx`, `MemoryEditor.jsx`, `MoodRing.jsx`
  - `lib/memories/store.ts`, `db.ts`, `generator.ts`
- Add a button in `pages/memories.js` to stub “Generate Today”.
- Seed with mock data for 60 days to exercise grid and reader.

