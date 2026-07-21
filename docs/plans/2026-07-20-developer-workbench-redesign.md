# Developer Workbench Redesign Implementation Plan

## Status

Implemented on `feat/developer-workbench-redesign`. Phases 0 through 8 are complete; future Electron packaging remains intentionally out of scope until a desktop target is selected.

## Purpose

OmniBox AI is a 100% client-side, open-source BYOK utility suite. The redesign must make it practical to add many focused developer tools without turning the sidebar, history, inference layer, or storage schema into a series of hard-coded exceptions.

The product remains a Vite + React SPA. It must not add backend endpoints, API servers, server actions, or Node.js runtime services.

## Confirmed Product Decisions

1. A tool can extend an existing page when it is an additional behavior in the same user workflow. Independent utilities get a dedicated tool page.
2. Privacy mode means no cloud-provider request is allowed and no API key may leave the device. WebLLM model downloads and direct localhost Ollama requests remain allowed.
3. The initial developer-tool set is:
   - Type & JSDoc Generator
   - Schema Translator: SQL ⇄ Prisma ⇄ Zod
   - Regex ⇄ Human Interpreter
   - Speech Studio: text-to-speech and speech-to-text
4. Speech Studio uses a hybrid delivery strategy:
   - Initial implementation: browser `speechSynthesis` and browser speech-recognition capabilities where supported.
   - Future upgrade: client-side local STT/TTS model adapters.
   - WebLLM is text-only. It may improve a transcript or generate text, but it is not the STT/TTS engine.
5. Electron is a future packaging target, not part of this implementation. Current work must preserve a browser-native renderer and establish narrow platform boundaries that Electron can adopt later.
6. Extensibility initially means bundled, first-party static tools. Do not add a runtime plugin API or execute arbitrary third-party tool code.

## Design Read

**Product:** privacy-conscious developer workbench for daily utility tasks.

**Visual language:** dark, precise, compact, technical, and calm. This is not a generic AI-chat interface or a marketing dashboard.

| Dial | Target | Meaning |
| --- | --- | --- |
| Design variance | 4/10 | Stable grid and strong hierarchy; no decorative asymmetry that reduces tool usability. |
| Motion intensity | 3/10 | Responsive hover, focus, and state transitions only; no scroll choreography. |
| Visual density | 7/10 | Dense enough for code, schemas, and outputs while retaining readable controls and mobile reflow. |

### Visual Rules

- Retain dark zinc/slate surfaces and the existing light theme, but consolidate styling around semantic tokens in `src/index.css`.
- Use indigo for primary interaction and selection. Reserve emerald for local execution and privacy status. Use amber and rose only for warnings and errors.
- Prefer structural grouping, dividers, and whitespace over repeated nested glass cards.
- Use monospace for source code, schemas, regex, token counts, execution metadata, and timestamps. Do not use monospace for long-form output by default.
- Maintain visible keyboard focus, WCAG AA text contrast, explicit loading/empty/error states, and `prefers-reduced-motion` behavior.
- Tool pages choose their own layout width. Do not force all pages into the current `max-w-5xl` single-column shell.

## Non-Negotiable Constraints

- Preserve React 19+, TypeScript strict mode, Vite, Zustand, Dexie, and Tailwind CSS v4.
- Keep Tailwind CSS-first configuration in `src/index.css`; do not add `tailwind.config.js`.
- Do not install cloud-provider SDKs. Cloud requests continue through browser `fetch` in `src/services/streaming/`.
- Persist configuration in `localStorage` only where appropriate; use Dexie/IndexedDB for larger structured local data.
- Do not place user content, run payloads, provider settings, privacy state, model IDs, or API keys in URLs.
- Do not weaken browser security to prepare for Electron. In particular, do not disable CORS, enable Node in the renderer, or add a broad IPC abstraction.
- Keep stable provider IDs and define a migration for any persisted-data changes.

## Target Information Architecture

### Primary Areas

| Area | Route role | Contents |
| --- | --- | --- |
| Workbench | default landing area | Pinned tools, recent tools, recent documents, recent runs, execution readiness. |
| Tools | discovery catalog | Searchable, categorized first-party tools. |
| Library | persistent local material | Documents, runs, artifacts, and templates. |
| System | configuration | Providers/models, privacy, storage, appearance, and capability diagnostics. |

### Tool Categories

- Writing: Grammar & Tone, future Prompt Tools.
- Career: existing ATS Audit, Semantic Suitability, Gap Analysis.
- Developer: Type & JSDoc Generator, Schema Translator, Regex Interpreter.
- Audio: Speech Studio.
- Documents: future parsers, extractors, and transformers.
- AI Utilities: future prompt and data transformations.

### Navigation Rules

- The persistent rail navigates only primary areas and pinned tools. It must not become a flat list of every tool.
- The Tools catalog is the scalable browse surface.
- Favorites and recently used tools are stable, user-controlled shortcuts.
- A global command palette is an equal, keyboard-first route to tools, documents, runs, and system actions.
- All repeated navigation stays in a stable relative order.

## Target Architecture

### 1. Static Tool Registry

Create a compile-time registry in `src/tools/` that is the source of truth for tool metadata and loading.

Suggested files:

```text
src/tools/
  types.ts
  registry.ts
  categories.ts
  getTool.ts
```

Each tool definition must contain:

```ts
type ToolId = string

interface ToolDefinition {
  id: ToolId
  version: number
  title: string
  description: string
  category: ToolCategoryId
  icon: React.ComponentType<{ className?: string }>
  loadPage: () => Promise<{ default: React.ComponentType }>
  capabilities: {
    acceptsDocuments: boolean
    supportsLocalExecution: boolean
    supportsCloudExecution: boolean
    supportsStreaming: boolean
    supportsArtifacts: boolean
  }
  actions?: readonly ToolActionDefinition[]
  historyAdapter?: ToolHistoryAdapter
  artifactAdapter?: ToolArtifactAdapter
}
```

Requirements:

- Registry IDs are stable persisted identifiers, not display labels.
- Tool pages are lazy-loaded from the registry.
- A tool may declare multiple actions, such as Career's three diagnostics, without becoming multiple top-level pages.
- History and library rendering must delegate tool-specific summaries, detail views, and reload payloads to adapters supplied by the registry.
- Registry metadata must not contain secrets or user content.
- Do not support user-supplied URLs, dynamic imports, or third-party code as tool definitions.

### 2. Shell and URL Model

The current query-only `workspace` URL contract is too limited for a scalable catalog. Introduce a safe route descriptor that supports primary areas and a selected tool while keeping the app a Vite SPA.

The implementation may retain query parameters rather than adding a routing dependency. The canonical URL design must be decided and documented before implementation. A suitable direction is:

```text
?view=workbench
?view=tools
?tool=type-jsdoc
?view=library&section=runs
?view=system
```

Rules:

- URL values include only navigation metadata.
- Invalid or deprecated values resolve to Workbench and are canonicalized with `history.replaceState`.
- User navigation creates history entries with `history.pushState`.
- `popstate` updates Zustand without creating another history entry.
- A migration must map valid legacy `?workspace=grammar|career|history|settings` links to their equivalent new locations.
- Persisted UI state is a fallback only; a valid URL always wins on initial load.

### 3. Execution Gateway

`useInference` currently combines UI state, provider selection, policy, retries, WebLLM lifecycle access, streaming, and cancellation. Separate those concerns behind a browser-native execution gateway.

Suggested boundaries:

```text
src/services/execution/
  types.ts                 # request, result, run status, capability types
  executionPolicy.ts       # privacy and provider eligibility checks
  executionGateway.ts      # provider/model routing and dispatch
  runLifecycle.ts          # cancellation and status transitions
  providerCapabilities.ts  # local/cloud/model capability metadata
src/hooks/
  useToolExecution.ts      # React state adapter over the gateway
```

Requirements:

- Every cloud request must pass through `executionPolicy.ts` immediately before transport dispatch.
- If privacy mode is active, cloud provider IDs (`openai`, `anthropic`, `gemini`, `openrouter`) must be rejected even if a stale UI value or a future tool attempts to select one.
- `webgpu` and `ollama` remain eligible in privacy mode.
- Execution metadata must identify local versus cloud execution honestly. A downloaded WebLLM model is local inference after its download; it is not a claim that no network activity occurred.
- A running job belongs to the application lifecycle, not just a mounted page. Define the behavior for tool navigation: continue in background by default, expose cancellation in the tool and shell, and persist completion/error state.
- Keep WebLLM's shared engine queue explicit and serialize work as required.
- The UI hook must be thin and must not directly perform provider transport.

### 4. Local Data Model

Evolve `src/db/db.ts` from loose history records into versioned local records. Preserve existing data with a Dexie migration.

Target concepts:

```ts
interface RunRecord {
  id?: number
  schemaVersion: number
  toolId: string
  toolVersion: number
  actionId?: string
  status: 'queued' | 'running' | 'completed' | 'cancelled' | 'failed'
  input: unknown
  output?: unknown
  error?: { code: string; message: string }
  execution: {
    providerId: string
    modelId: string
    locality: 'webgpu' | 'localhost' | 'cloud'
  }
  createdAt: number
  completedAt?: number
}

interface DocumentRecord {
  id?: number
  schemaVersion: number
  name: string
  contentType: string
  content: string
  source: 'paste' | 'file-import' | 'generated'
  createdAt: number
  updatedAt: number
}

interface ArtifactRecord {
  id?: number
  schemaVersion: number
  type: string
  title: string
  content: unknown
  sourceRunId?: number
  toolId: string
  createdAt: number
}
```

Requirements:

- Do not retain `any` in persisted data types.
- Use JSON-safe, versioned payloads; define validation/normalization for records read from old stores.
- Preserve access to existing Career and Grammar history records through a migration or legacy reader.
- Make deletion clear: per-run, per-document, per-artifact, all runs, all documents, and all local data.
- Add storage usage/retention messaging to System. Do not promise encryption at rest in a browser-only build.

### 5. Electron-Ready Platform Ports

Keep browser implementations now, but introduce narrow capability ports only where an actual portability issue exists.

Suggested interfaces:

```text
src/platform/
  capabilities.ts
  clipboard.ts
  files.ts
  storage.ts
  speech.ts
```

Rules:

- Browser implementations remain the default and use current browser APIs.
- Do not add Electron, preload scripts, IPC, or Node dependencies in this plan.
- Future Electron adapters must keep the renderer unprivileged and use a minimal, allowlisted bridge.
- Audit Vite asset paths and provider request assumptions before packaging. A future Electron build should use a secure application protocol rather than rely on `file://` behavior.

## Workstream and Phase Plan

Each phase has a hard verification gate. Do not start dependent phases until the preceding gate passes. Tasks within the same phase may run in parallel only when their declared file ownership does not overlap.

### Phase 0: Baseline and Contracts

**Goal:** establish decisions, migration rules, and implementation seams before visual work.

**Owner files:**

- `docs/architecture/` (create or update decisions document)
- `src/tools/types.ts` (new)
- `src/services/execution/types.ts` (new)
- `src/db/db.ts`

**Tasks:**

1. Record the tool-page versus shared-action decision and approved initial tool list.
2. Document privacy semantics exactly: cloud keys/requests blocked; model download and localhost Ollama allowed.
3. Define stable `ToolId`, `ActionId`, tool version, run status, locality, and artifact types.
4. Decide canonical navigation URL values and legacy workspace migration behavior.
5. Design the Dexie version migration from `HistoryItem`/`DocumentItem` to the new records.
6. Define UI state that persists across sessions: last view, sidebar state, pinned tools, recent tools, and theme. Do not persist sensitive transient prompt values in UI state.

**Parallel agents:**

- Agent A: registry and navigation type design.
- Agent B: persisted-data schema and Dexie migration design.
- Agent C: architecture/privacy decision documentation.

**Gate:** Type contracts compile; migration behavior is written and reviewed; no UI code changed yet.

### Phase 1: Registry, Navigation, and App Shell

**Goal:** replace fixed workspaces with the scalable Workbench/Tools/Library/System shell.

**Owner files:**

- `src/tools/*` (new)
- `src/App.tsx`
- `src/store/useUIStore.ts`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/AppHeader.tsx`
- `src/components/layout/WorkspaceRouter.tsx` (replace or rename only after imports are migrated)
- `src/features/workbench/*` (new)
- `src/features/tools/*` (new)
- `src/features/library/*` (new)
- `src/features/system/*` (new or migration target for Settings)

**Tasks:**

1. Add registry definitions for existing Writing, Career, Library/History, and System/Settings experiences.
2. Add lazy page loading for independent tool pages. Avoid eager imports of every future tool.
3. Create a Workbench page with:
   - pinned tools;
   - recent tools;
   - recent runs;
   - local execution/privacy readiness;
   - empty states when no local data exists.
4. Create a Tools catalog with category filter and search. It must render registry metadata only, not duplicate tool metadata in the sidebar.
5. Restructure the rail to primary areas plus pinned tools.
6. Redesign the header for title/breadcrumb, command-palette trigger placeholder, execution status placeholder, and privacy indicator.
7. Update URL/history synchronization and legacy workspace URL handling.
8. Remove the global `max-w-5xl` restriction. Provide a shell content region that permits page-level layout classes.
9. Preserve mobile behavior: rail becomes a modal drawer, background is inert/unavailable while open, and tool catalog remains usable at 320px.

**Do not do in this phase:**

- Do not refactor inference dispatch.
- Do not migrate all history data.
- Do not build new developer tools.

**Gate:** existing Grammar, Career, History, and Settings behavior is reachable through the new shell; direct legacy URLs resolve safely; browser back/forward works; lint and build pass.

### Phase 2: Execution Policy and Run Lifecycle

**Goal:** make privacy and job behavior platform-wide guarantees.

**Owner files:**

- `src/services/execution/*` (new)
- `src/services/streaming/*`
- `src/hooks/useInference.ts` or its replacement `src/hooks/useToolExecution.ts`
- `src/hooks/useWebLLM.ts`
- `src/store/useSettingsStore.ts`
- shared execution status components (new)

**Tasks:**

1. Move provider eligibility checks from UI effects to the execution gateway.
2. Define an execution request shape that identifies tool, action, structured task where applicable, callbacks, and cancellation ownership.
3. Ensure the gateway rejects cloud dispatch in privacy mode before `fetch` or request construction occurs.
4. Maintain WebGPU and Ollama support in privacy mode.
5. Implement application-owned run states and cancellation:
   - create `queued`/`running` records;
   - update to completed, cancelled, or failed;
   - ensure navigation does not leak a request;
   - expose cancel action in a shell status surface and active tool.
6. Keep structured task validation/retry behavior from `src/services/inference/` and adapt it behind the new gateway.
7. Add explicit user messaging for local model context limits and unavailable local execution.
8. Keep direct browser fetches in `src/services/streaming/`; do not introduce provider SDKs.

**Parallel agents:**

- Agent A: execution policy and provider capability layer.
- Agent B: run-lifecycle persistence and cancellation.
- Agent C: React hook migration and shared status UI after contracts from A/B are stable.

**Gate:** privacy mode blocks each cloud provider even with stale selected-provider state; Ollama and WebGPU remain eligible; cancellation works; lint and build pass.

### Phase 3: Library and Data Migration

**Goal:** provide a unified local Library instead of workspace-specific history and loose records.

**Owner files:**

- `src/db/db.ts`
- `src/features/library/*`
- `src/features/history/*` (migrate or retire only after Library replacement is complete)
- `src/tools/*` history/artifact adapters
- `src/components/shared/*` artifact/run primitives

**Tasks:**

1. Add a new Dexie schema version and migrate existing `history` and `documents` data safely.
2. Add run, document, and artifact repositories with typed methods; tool pages must not query raw tables directly.
3. Build Library sections for Runs, Documents, Artifacts, and Templates.
4. Implement filtering by tool, status, and date without coupling Library UI to individual tool IDs.
5. Delegate summary, detail, and reload behavior to tool registry adapters.
6. Add delete flows and clear-data flows with explicit scope descriptions and confirmation UI.
7. Add local storage/retention information in System.
8. Preserve compatibility with existing Career reload data until the Career reference refactor removes it.

**Gate:** migrated records are visible; legacy runs open/reload correctly where supported; deleting data does not affect settings unintentionally; lint and build pass.

### Phase 4: Shared Tool Primitives and Career Reference Migration

**Goal:** prove the new platform with the most complex existing page before adding new tools.

**Owner files:**

- `src/components/tooling/*` (new)
- `src/features/career/*`
- `src/components/shared/ProviderSelector.tsx` (only if the execution-profile migration requires it)
- `src/index.css`

**Tasks:**

1. Create shared primitives:
   - `ToolPage` page frame;
   - `ToolHeader` with tool metadata, actions, and contextual help;
   - `ExecutionProfile` readout and optional override;
   - `DocumentPicker` and document-save controls;
   - `RunPanel` and `ArtifactPanel`;
   - `InlineError`, loading skeletons, and composed empty states;
   - `SplitPane` with an explicit stacked mobile fallback.
2. Decompose `CareerWorkspace.tsx` into focused modules. Suggested shape:

```text
src/features/career/
  CareerToolPage.tsx
  CareerContextPanel.tsx
  CareerActions.tsx
  CareerResults.tsx
  GapAnalysisResult.tsx
  careerActions.ts
  careerRepository.ts
  types.ts
```

3. Replace browser `alert()` calls with inline validation messages associated with the relevant fields.
4. Move saved resumes and prior runs to repository-backed shared components.
5. Retain structured Gap Analysis rendering and tool-specific context-budget feedback.
6. Make all three Career diagnostics actions within one Career tool definition.
7. Ensure a 320px stack layout, a practical tablet layout, and a desktop split layout.

**Gate:** all Career diagnostics work with local and cloud eligible providers; saved resume behavior works; runs persist through the Library; no monolithic replacement component exceeds a justified responsibility boundary; lint and build pass.

### Phase 5: Command Palette and Workbench Polish

**Goal:** make the expanded product fast to navigate without overloading the permanent rail.

**Owner files:**

- `src/features/command-palette/*` (new)
- `src/components/layout/AppHeader.tsx`
- `src/tools/registry.ts`
- `src/features/workbench/*`
- `src/index.css`

**Tasks:**

1. Implement `Cmd/Ctrl+K` with a real accessible dialog:
   - labelled dialog;
   - focus moves to its search input on open;
   - Tab order stays in the dialog;
   - Escape closes it;
   - focus returns to the trigger.
2. Search tools, pinned tools, recent tools, documents, runs, and system actions.
3. Keep command results grouped and keyboard navigable.
4. Ensure command actions use the same navigation and execution-policy APIs as visible UI controls.
5. Add Workbench pin/unpin and recent-tool behavior backed by persisted UI state.

**Gate:** every registry tool is accessible by keyboard through the palette and through the catalog; palette passes focus-management manual checks; lint and build pass.

### Phase 6: Initial Developer Tools

**Goal:** ship independent Developer tool pages using the established contracts and primitives.

#### Parallel Workstream A: Type & JSDoc Generator

**Owner files:** `src/features/type-jsdoc/*`, its registry entry, tool-specific structured contract/spec/validator files.

**Requirements:**

- Dedicated page with source input and generated output panes.
- Accept JavaScript, JSON examples, and existing TypeScript as separate clearly labelled inputs or modes.
- Target options: TypeScript types/interfaces and JSDoc.
- Display generated code in a selectable monospace output with copy action.
- Request structured output when the selected inference model supports it; validate output before presenting it as generated code.
- Persist source and generated output as a Run; allow explicit save as an Artifact.
- Show model/context limitations before a run; do not silently send content to cloud in privacy mode.

#### Parallel Workstream B: Schema Translator

**Owner files:** `src/features/schema-translator/*`, its registry entry, tool-specific parsing/validation files.

**Requirements:**

- Dedicated page with source format, target format, and source/output panes.
- Supported directions: SQL DDL, Prisma schema, and Zod schema.
- Provide deterministic lightweight validation before inference where practical; clearly distinguish parser errors from model conversion issues.
- Preserve unsupported constructs as warnings. Do not invent database semantics or silently drop constraints.
- Output must include source assumptions and conversion warnings.
- Save inputs/outputs as linked artifacts.
- Design the desktop layout for side-by-side source/output and stack it below `md`.

#### Parallel Workstream C: Regex Interpreter

**Owner files:** `src/features/regex/*`, its registry entry, local regex utilities.

**Requirements:**

- Dedicated page with two explicit modes: Explain Regex and Generate Regex.
- Include regex input, flags, test text, match output, and human-language requirements as appropriate to the selected mode.
- Perform browser-native regex compile/test locally and report syntax errors inline.
- Clearly identify the JavaScript regex engine and selected flags.
- Generated regex responses must present the pattern, flags, explanation, examples, and assumptions.
- Guard against freezing the UI with untrusted catastrophic-regex test cases where feasible; document any browser-engine limitations.
- Persist runs and allow result artifacts.

**Shared constraints for all Phase 6 tools:**

- Do not duplicate shell, provider policy, history, or storage logic.
- Use registry actions and tool adapters.
- Implement loading, empty, error, disabled, copy-success, and cancellation states.
- Use semantic labels; placeholders are never the only field label.
- Test keyboard navigation, mobile stack behavior, and light/dark themes.

**Gate:** all three tools run through the gateway, save typed runs, appear in catalog/palette/library, and obey privacy policy; lint and build pass.

### Phase 7: Speech Studio

**Goal:** add browser-capability audio tools without overstating offline/privacy guarantees.

**Owner files:**

- `src/features/speech/*`
- `src/platform/speech.ts`
- speech registry entry
- System capability diagnostics UI

**Tasks:**

1. Define a speech adapter interface that reports availability, permissions, locale/voice options, start/stop control, and error conditions.
2. Implement browser text-to-speech through `speechSynthesis`:
   - text input;
   - available voice/language selection;
   - play, pause, resume, stop controls;
   - accessible playback state;
   - clear unsupported-browser message.
3. Implement speech recognition only where the browser reports support:
   - explicit microphone permission request;
   - live interim/final transcript separation;
   - start/stop/cancel controls;
   - user-visible message that browser speech recognition may use a browser/vendor service and is not necessarily local.
4. Use WebLLM only as an optional post-processing action for a completed transcript, such as cleanup, summary, or transformation. It must follow execution policy like every other tool action.
5. Define, but do not implement prematurely, a future local STT/TTS adapter path. It must cover model download size, cache location, GPU/CPU requirements, licensing, cancellation, and fallback behavior.

**Privacy requirements:**

- Privacy mode must not falsely label browser speech recognition as local.
- If a browser speech API may require external processing, disable it in privacy mode unless the browser exposes a verified local-only implementation. Show the reason.
- `speechSynthesis` may remain available if it does not require a cloud request in the active browser, but the capability adapter must report confidence/limitations honestly.

**Gate:** browser capability messaging is accurate; microphone permissions and failure states are handled; transcript post-processing obeys privacy mode; lint and build pass.

### Phase 8: Document Parsing, Desktop Readiness, and Quality Hardening

**Goal:** remove known portability risks and verify the redesigned workbench as a product.

**Owner files:**

- `src/utils/pdfParser.ts` or replacement parser modules
- `src/platform/*`
- `vite.config.ts`
- `src/index.css`
- tests and documentation files introduced by the team

**Tasks:**

1. Replace CDN-injected PDF/DOCX core parsing with vetted bundled, lazy-loaded dependencies if PDF/DOCX support remains a product requirement.
2. Ensure document parsing continues to work in privacy mode without third-party script injection.
3. Audit direct browser-global calls and move only genuine platform seams behind adapters.
4. Audit asset paths and startup assumptions for eventual Electron packaging.
5. Document the future Electron security posture:
   - secure application protocol;
   - context isolation;
   - no Node integration in renderer;
   - narrow allowlisted preload bridge only if needed;
   - optional OS keychain adapter;
   - CSP compatible with local parsing and provider requests.
6. Add a test runner if the team chooses one, then cover registry routing, execution policy, data migrations, and tool adapters.
7. Perform accessibility, responsive, performance, and privacy regression checks across all pages.

**Gate:** no required privacy-mode workflow dynamically loads third-party code; Electron portability risks are documented and bounded; lint and build pass.

## Parallelization Rules

1. Parallelize by file ownership, not merely by feature name.
2. The registry, execution types, and data types are shared contracts. One designated agent owns each contract per phase; other agents consume stable exports only.
3. Do not simultaneously edit `src/App.tsx`, `src/store/useUIStore.ts`, `src/db/db.ts`, `src/index.css`, or `src/services/streaming/*` from multiple agents.
4. Independent Phase 6 tool pages may be developed in parallel only after Phases 1-5 contracts are merged and stable.
5. Each agent must run lint before handing off. The integration agent runs lint and build after merging all workstreams.
6. Do not revert other agents' changes. Rebase implementation decisions on the currently shared contracts.

## Migration and Compatibility Rules

- Preserve legacy `workspace` URLs by mapping them to the new view/tool destination.
- Preserve existing settings storage keys and provider IDs unless a deliberate migration is introduced.
- Migrate IndexedDB records with Dexie version upgrades; never delete user history as an implicit side effect.
- Retain legacy history reload support until each affected workspace has migrated to registry adapters.
- Make data deletion explicit and scoped. Clearing runs must not silently delete documents, artifacts, or provider settings.
- Do not claim browser-local storage is encrypted or secure against same-origin XSS.

## Verification Matrix

### Required Automated Checks

Run in this order after every phase and before integrating parallel work:

```bash
npm run lint
npm run build
```

Both commands must complete with no warnings or errors.

### Required Browser Checks

Use `agent-browser` against the Vite app once available.

- Navigate directly to each primary area and registered tool.
- Verify legacy workspace URLs resolve to the appropriate redesigned location.
- Test browser back/forward after catalog, rail, and palette navigation.
- Test at approximately 320px, 768px, 1024px, and wide desktop widths.
- Confirm no unintended horizontal page scrolling; code/output panes may provide intentional internal scrolling.
- Test keyboard access to rail, catalog, tool controls, palette, dialogs, and Library actions.
- Confirm focus is visible and dialog focus is trapped/restored correctly.
- Verify dark and light themes for each shared primitive and initial developer tool.
- Verify local model unavailable, context overflow, streaming, cancellation, network failure, empty library, and migration error states.

### Privacy Regression Checks

- With privacy mode active, attempt each cloud provider selection and execution. No cloud `fetch` request may be constructed or sent.
- Confirm stale persisted cloud provider selections are rejected at execution time.
- Confirm WebLLM model download can occur when privacy mode is active and its network activity is disclosed separately from local inference.
- Confirm Ollama at `localhost` remains eligible in privacy mode.
- Confirm browser speech recognition is disabled or explicitly warned when local processing cannot be guaranteed.
- Confirm no PDF/DOCX third-party script is loaded in privacy mode.

## Explicitly Out of Scope

- Electron packaging, main process, preload scripts, or native filesystem/terminal/Git access.
- A runtime plugin marketplace or execution of third-party tool code.
- User accounts, cloud sync, server databases, or server-side secret storage.
- Replacing the browser BYOK model with a hosted gateway.
- Claiming that browser storage or every browser speech capability is fully private by default.
- Rebuilding existing provider streaming behavior unless required by the execution gateway boundary.

## Completion Definition

The redesign is complete when OmniBox has a scalable tool registry and catalog, a workbench landing area, unified Library, enforceable privacy policy, application-level run lifecycle, refactored Career reference tool, the three initial developer utilities, browser-capability Speech Studio, and documented Electron-ready boundaries. All current functionality must remain available or be migrated with a documented compatibility path.
