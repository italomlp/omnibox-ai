# OmniBox AI — Refactoring Plan

> **Goal:** Decompose monolithic components, deduplicate cross-workspace logic, modularize the streaming client, fix known bugs, and reorganize the project into a feature-based folder structure before building new features.

---

## 1. Project Folder Structure (Target State)

After all refactoring steps, the `src/` tree should look like this:

```
src/
├── components/
│   ├── layout/
│   │   ├── AppSidebar.tsx        # Brand header, nav items, footer indicators
│   │   ├── AppHeader.tsx         # Top bar: workspace title + privacy badge
│   │   └── WorkspaceRouter.tsx   # Switch for active workspace rendering
│   └── shared/
│       ├── ProviderSelector.tsx  # Provider + model dropdown bar
│       ├── WebGPULoadingOverlay.tsx
│       └── ErrorAlert.tsx        # Error panel w/ WebGPU limits + Ollama hints
├── config/
│   └── providers.ts             # PROVIDER_MODELS_LIST, DEFAULT_MODELS, DEFAULT_URLS
├── db/
│   └── db.ts                    # Dexie schema (unchanged)
├── features/
│   ├── grammar/
│   │   └── GrammarWorkspace.tsx  # Slimmed down (uses useInference + shared components)
│   ├── career/
│   │   └── CareerWorkspace.tsx   # Slimmed down (uses useInference + shared components)
│   └── settings/
│       └── SettingsPanel.tsx     # Moved from components/
├── hooks/
│   ├── useInference.ts          # [NEW] Unified inference dispatch (WebGPU / StreamingClient)
│   └── useWebLLM.ts             # WebGPU engine management (unchanged)
├── services/
│   ├── streaming/
│   │   ├── buildProviderRequest.ts  # [NEW] URL/headers/body builder per provider
│   │   ├── executeSSEStream.ts      # [NEW] ReadableStream reader loop + AbortController
│   │   ├── parsers.ts               # [NEW] parseOpenAIChunk, parseGeminiChunk, parseAnthropicChunk
│   │   ├── errors.ts                # [NEW] OllamaCORSException, AnthropicCORSException
│   │   ├── types.ts                 # [NEW] LLMRequest, StreamCallbacks, ProviderRequestConfig
│   │   └── index.ts                 # [NEW] Barrel re-export
│   └── StreamingClient.ts          # [DELETE] Replaced by streaming/ module
├── store/
│   ├── useSettingsStore.ts      # API keys, base URLs, selected models, privacy mode
│   ├── useUIStore.ts            # Sidebar open/closed, active workspace
│   └── store.ts                 # [DELETE] Replaced by split stores
├── utils/
│   └── extractTaggedText.ts     # [NEW] Moved from GrammarWorkspace
├── App.tsx                      # Thin shell: layout + imports AppSidebar/AppHeader/WorkspaceRouter
├── App.css
├── index.css
└── main.tsx
```

---

## 2. App.tsx Decomposition

### Current Problem
[App.tsx](../src/App.tsx) (206 lines) owns the entire application shell — sidebar, header, workspace routing, WebGPU detection, and privacy indicators — all in one component.

### Proposed Changes

#### [NEW] [AppSidebar.tsx](../src/components/layout/AppSidebar.tsx)
- Extracts lines 59–158 from `App.tsx`
- Owns: brand logo, workspace nav buttons, collapse toggle, WebGPU status indicator, privacy badge
- Props: `workspaces[]`, `activeWorkspace`, `sidebarOpen`, `onToggleSidebar`, `onSelectWorkspace`, `webGpuSupported`, `privacyMode`

#### [NEW] [AppHeader.tsx](../src/components/layout/AppHeader.tsx)
- Extracts lines 162–192 from `App.tsx`
- Owns: top bar with workspace title, privacy/cloud indicator pill
- Props: `workspaceName`, `privacyMode`, `sidebarOpen`, `onToggleSidebar`

#### [NEW] [WorkspaceRouter.tsx](../src/components/layout/WorkspaceRouter.tsx)
- Extracts lines 37–48 (the `renderActiveWorkspace` switch)
- Props: `activeWorkspace`
- Maps workspace IDs to lazy-loaded feature components

#### [MODIFY] [App.tsx](../src/App.tsx)
- Becomes a ~30-line thin shell importing `AppSidebar`, `AppHeader`, `WorkspaceRouter`
- Retains only the WebGPU detection `useEffect` and the model auto-upgrade `useEffect`

---

## 3. Store Splitting

### Current Problem
[store.ts](../src/store/store.ts) (107 lines) mixes provider configuration, UI state, and static constants in one Zustand store.

### Proposed Changes

#### [NEW] [useSettingsStore.ts](../src/store/useSettingsStore.ts)
- Owns: `apiKeys`, `baseUrls`, `selectedModels`, `privacyMode`
- Actions: `setApiKey()`, `setBaseUrl()`, `setSelectedModel()`, `setPrivacyMode()`
- Persists to `localStorage` key: `omnibox-settings-v1`
- Types: `ProviderId`, `SettingsState`
- Separate, independent Zustand store (not a slice)

#### [NEW] [useUIStore.ts](../src/store/useUIStore.ts)
- Owns: `sidebarOpen`, `activeWorkspace`
- Actions: `toggleSidebar()`, `setActiveWorkspace()`
- Persists to `localStorage` key: `omnibox-ui-v1`
- Separate, independent Zustand store (not a slice)

#### [NEW] [providers.ts](../src/config/providers.ts)
- Exports: `PROVIDER_MODELS_LIST`, `PROVIDER_DEFAULT_MODELS`, `PROVIDER_DEFAULT_URLS`
- Pure data — no Zustand dependency

#### [DELETE] [store.ts](../src/store/store.ts)
- All consumers updated to import from the new files

---

## 4. StreamingClient Decomposition

### Current Problem
[StreamingClient.ts](../src/services/StreamingClient.ts) (262 lines) has a single monolithic static `stream()` method mixing request building, stream reading, and per-provider parsing.

### Proposed Changes

#### [NEW] `src/services/streaming/types.ts`
- `LLMRequest`, `StreamCallbacks`, `ProviderRequestConfig` (url, headers, body)
- `OpenAIRequestBody`, `GeminiRequestBody`, `AnthropicRequestBody` typed payloads

#### [NEW] `src/services/streaming/errors.ts`
- `OllamaCORSException`, `AnthropicCORSException`

#### [NEW] `src/services/streaming/buildProviderRequest.ts`
- `buildProviderRequest(provider, config, request): ProviderRequestConfig`
- One clean function with a switch/map dispatching per provider
- Eliminates the nested if/else chain
- Returns typed request payloads instead of `body: any`

#### [NEW] `src/services/streaming/parsers.ts`
- `parseOpenAIChunk(data: string): string` — extracts `choices[0].delta.content`
- `parseGeminiChunk(data: string): string` — extracts `candidates[0].content.parts[0].text`
- `parseAnthropicChunk(data: string): string` — extracts `delta.text` from `content_block_delta`
- `getChunkParser(provider: ProviderId)` — returns the correct parser function

#### [NEW] `src/services/streaming/executeSSEStream.ts`
- `executeSSEStream(url, headers, body, parser, callbacks, signal?): Promise<void>`
- Handles `fetch()`, `ReadableStream` reader, `TextDecoder`, line splitting, buffer management
- Accepts an `AbortSignal` for cancellation support
- CORS error detection for Ollama/Anthropic

#### [NEW] `src/services/streaming/index.ts`
- Barrel file: re-exports `streamLLM()` (the unified top-level function replacing `StreamingClient.stream()`)

#### [DELETE] `src/services/StreamingClient.ts`

---

## 5. Workspace Deduplication — `useInference` Hook

### Current Problem
[GrammarWorkspace.tsx](../src/workspaces/GrammarWorkspace.tsx) and [CareerWorkspace.tsx](../src/workspaces/CareerWorkspace.tsx) each contain ~120 lines of nearly identical code for:
- Provider/model selection state + privacy mode enforcement
- WebGPU vs cloud inference dispatch
- Error handling

### Proposed Changes

#### [NEW] [useInference.ts](../src/hooks/useInference.ts)

```typescript
interface UseInferenceReturn {
  activeProvider: ProviderId;
  setActiveProvider: (p: ProviderId) => void;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  availableProviders: ProviderId[];
  isProcessing: boolean;
  errorMsg: string | null;
  clearError: () => void;
  runInference: (opts: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    onChunk: (chunk: string) => void;
    onComplete: (fullText: string) => void;
    signal?: AbortSignal;
  }) => Promise<void>;
  abort: () => void;
  // WebGPU passthrough
  webLLM: WebLLMHook;
}
```

- Encapsulates all provider selection, privacy enforcement, inference dispatch, and error state
- Workspaces call `runInference()` and only handle their domain-specific prompt/output logic
- Includes `abort()` method backed by `AbortController`

#### [MODIFY] GrammarWorkspace.tsx
- Moved to `src/features/grammar/GrammarWorkspace.tsx`
- Drops ~120 lines of provider logic, replaced by `useInference()` hook
- `extractTaggedText` moved to `src/utils/`
- Uses shared `ProviderSelector`, `WebGPULoadingOverlay`, `ErrorAlert` components

#### [MODIFY] CareerWorkspace.tsx
- Moved to `src/features/career/CareerWorkspace.tsx`
- Same deduplication as GrammarWorkspace

#### [MODIFY] SettingsPanel.tsx
- Moved to `src/features/settings/SettingsPanel.tsx`
- Updated imports to new store paths

---

## 6. Shared UI Components

These components deduplicate the repeated UI blocks across workspaces:

#### [NEW] `src/components/shared/ProviderSelector.tsx`
- Provider dropdown + model dropdown bar
- Props: `activeProvider`, `onProviderChange`, `selectedModel`, `onModelChange`, `availableProviders`

#### [NEW] `src/components/shared/WebGPULoadingOverlay.tsx`
- Progress bar + speed indicator + model name
- Props: `isLoading`, `selectedModel`, `loadPercent`, `speed`, `loadProgress`

#### [NEW] `src/components/shared/ErrorAlert.tsx`
- Error message panel with contextual hints for WebGPU limits and Ollama CORS
- Props: `errorMsg`, `activeProvider`, `onDismiss?`

---

## 7. Bug Fixes & Improvements

### 7.1 Stale Closure Bug — CareerWorkspace (WebGPU path)

**File:** [CareerWorkspace.tsx:161](../src/workspaces/CareerWorkspace.tsx#L161)

**Problem:** After the WebGPU stream completes, the code saves `output` to Dexie — but `output` captures the React state value at the time the `runAnalysis` function was invoked (empty string), not the final streamed value.

**Fix:** Accumulate the full text in a local `let` variable (same pattern `GrammarWorkspace` uses with `rawText`), then save that to Dexie. This will be naturally resolved by the `useInference` hook which returns `fullText` from `onComplete`.

### 7.2 AbortController Support

**Problem:** There is no way to cancel an in-flight LLM stream. If a user switches workspaces or starts a new request, the old stream keeps running.

**Fix:** `executeSSEStream()` accepts an `AbortSignal`. The `useInference` hook creates an `AbortController` per request and exposes an `abort()` method. Starting a new request auto-aborts the previous one.

### 7.3 Package Identity Rename

**Problem:** [package.json](../package.json) still has `"name": "temp_scaffold"`.

**Fix:** Rename to `"omnibox-ai"`. Search for any other references to `temp_scaffold` across the codebase (HTML title, docs, comments) and update them.

### 7.4 Typed Request Payloads

**Problem:** `body: any` in the current `StreamingClient.stream()` offers no type safety.

**Fix:** Define `OpenAIRequestBody`, `GeminiRequestBody`, `AnthropicRequestBody` interfaces in `src/services/streaming/types.ts`. The `buildProviderRequest()` function returns a typed union.

### 7.5 Redundant Configuration Removal

**Problem:** `buildProviderRequest.ts` redefines default base URLs already defined in `src/config/providers.ts`.

**Fix:** Import `PROVIDER_DEFAULT_URLS` directly from `src/config/providers.ts` inside `src/services/streaming/buildProviderRequest.ts`.

---

## 8. Documentation Updates

After all code changes are complete:

- **Save this refactoring plan** to `docs/refactoring-plan.md`
- **Update `docs/architecture/`** with the new folder structure diagram
- **Verify `AGENTS.md`** still reflects the correct file paths and conventions

---

## 9. Verification Plan

### Build Verification
```bash
npm run build
```
Must complete with zero TypeScript errors.

### Lint Check
```bash
npm run lint
```
Must complete with zero Oxlint warnings/errors.

### Manual Verification
- [ ] Grammar workspace: Fix Grammar + Shift Tone work with WebGPU and a cloud provider
- [ ] Career workspace: ATS Audit, Semantic Suitability, Gap Analysis work correctly
- [ ] Settings panel: API keys persist, privacy mode blocks cloud providers
- [ ] Sidebar collapse/expand works
- [ ] Privacy mode badge shows in header and sidebar
- [ ] AbortController: starting a new inference cancels the previous one
- [ ] Saved resumes load/delete correctly in Career workspace

---

## 10. Execution Order

> [!IMPORTANT]
> Each phase should be completed and verified independently before moving to the next.

| Phase | Task | Key Files |
|-------|------|-----------|
| **1** | Extract `providers.ts` constants + split stores | `config/providers.ts`, `store/useSettingsStore.ts`, `store/useUIStore.ts` |
| **2** | Decompose `StreamingClient` into `services/streaming/` module | All files under `services/streaming/` |
| **3** | Create shared UI components | `ProviderSelector`, `WebGPULoadingOverlay`, `ErrorAlert` |
| **4** | Build `useInference` hook | `hooks/useInference.ts` |
| **5** | Refactor workspaces to use `useInference` + shared components; move `extractTaggedText` to `utils/`; relocate to `features/` | `features/grammar/`, `features/career/`, `features/settings/` |
| **6** | Decompose `App.tsx` into `AppSidebar`, `AppHeader`, `WorkspaceRouter` | `components/layout/` |
| **7** | Bug fixes: stale closure, `AbortController`, package rename, `temp_scaffold` cleanup | Various |
| **8** | Documentation updates | `docs/` |
| **9** | Full build + lint verification | — |
