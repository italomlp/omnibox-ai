# Workspace URL Sync and Layout Fixes Plan

## Scope

Make each workspace linkable through a safe query parameter and correct the reported History, Career, Grammar, Settings, and WebLLM picker layout defects. Keep the app a client-side SPA and do not expose user content or configuration in URLs.

## Confirmed Findings

- `http://localhost:5173/?workspace=career` renders Grammar because navigation is only persisted Zustand state. The app has no router dependency or browser-history integration.
- The Settings WebLLM picker is the persistent global choice for `selectedModels.webgpu`. It must remain, but its label and layout should make clear that it is the preferred WebLLM model rather than a separate execution-only selector.
- `WebLLMModelPicker` renders its option panel as an absolute `z-30` child. Its Settings ancestors use `backdrop-filter`, which creates stacking contexts. Raising the child z-index cannot make it reliably stack above sibling cards.
- Activity History positions the search icon absolutely without centering it against the shared control height. Its Grammar and Career filter buttons omit flex alignment.
- Grammar and Career place a full-width `ProviderSelector` inside a header row. When WebGPU is active, the picker’s vertical label, control, and detail content force the title and selector into mismatched alignment.
- Career allows the CV upload, document-name input, and save button to wrap independently.

## Decisions

### Workspace URL Contract

Use one canonical query parameter:

```text
?workspace=grammar|career|history|settings
```

- A valid query value wins over the persisted workspace during initial load.
- A missing or invalid value falls back to the persisted valid workspace, then `grammar`.
- The application canonicalizes fallback values with `history.replaceState` while preserving unrelated query parameters and `location.hash`.
- Explicit in-app workspace changes create a browser-history entry with `history.pushState`.
- `popstate` updates Zustand without writing another history entry.
- URLs must contain workspace metadata only. Do not add prompts, history IDs, CV content, model IDs, provider settings, privacy mode, or API keys.

### Settings WebLLM Picker

Retain the Settings picker. It is the only global, persistent way to configure the preferred WebLLM model, and its value is used by inference selection. Rename it to **Preferred WebLLM model** and place it in a WebGPU-specific detail row so it does not compete with the generic provider-card header.

### Picker Rendering Strategy

- Render the Settings picker options in normal document flow below its trigger. This avoids card stacking and clipping problems for the configuration page.
- Render compact workspace picker options in a React portal attached to `document.body`. Position the popup from the trigger rectangle and assign it an explicit popover layer.
- Preserve the existing listbox keyboard behavior, outside-click dismissal, Escape close, and trigger-focus restoration across both render modes.

## Implementation

### 1. Type and Synchronize Workspace Navigation

**Files**

- `src/store/useUIStore.ts`
- `src/App.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/WorkspaceRouter.tsx`
- `src/features/history/HistoryWorkspace.tsx`
- `docs/architecture/decisions.md`

**Changes**

1. Define and export `WORKSPACE_IDS`, `WorkspaceId`, and an `isWorkspaceId` validator beside the UI store or layout router.
2. Change `UIState.activeWorkspace` and `setActiveWorkspace` from `string` to `WorkspaceId`.
3. Validate persisted workspace state during Zustand hydration so corrupted or legacy values resolve to `grammar`.
4. Add an App-owned workspace URL synchronization hook. It must:
   - Read and validate `workspace` before the first workspace render.
   - Subscribe to `popstate` and update the store without pushing history.
   - Expose `navigateWorkspace(workspace)` for user-initiated navigation.
   - Preserve non-workspace parameters and the hash when it writes URLs.
5. Pass `navigateWorkspace` to `AppSidebar` rather than passing the store setter directly.
6. Pass the same navigation callback through `WorkspaceRouter` to `HistoryWorkspace`; use it after a history item writes its reload payload.
7. Update the navigation decision to describe query-param links and browser back/forward behavior.

### 2. Fix History Search and Filter Controls

**File**

- `src/features/history/HistoryList.tsx`

**Changes**

1. Center the search icon with `top-1/2 -translate-y-1/2`, add `pointer-events-none`, and retain adequate input left padding.
2. Make the Grammar & Tone and Career Suite filter buttons `inline-flex items-center` with a shared icon/text gap.
3. Keep the All Activities button on the same control scale and preserve its existing selected-state styling.

### 3. Stabilize Provider Header Layout

**Files**

- `src/components/shared/ProviderSelector.tsx`
- `src/features/grammar/GrammarWorkspace.tsx`
- `src/features/career/CareerWorkspace.tsx`

**Changes**

1. Change the provider header layout to a responsive grid or constrained flex row: title content remains `min-w-0`, controls stack on narrow widths, and the selector receives a bounded desktop width.
2. Make `ProviderSelector` own only provider/model controls. Avoid nested full-width wrappers that add unnecessary vertical space in a desktop row.
3. Remove the redundant `persistSelectedModel('webgpu', model)` call from `ProviderSelector`; `useInference.setSelectedModel` already persists the selection.
4. Ensure native provider/model controls use existing `.control-standard` or `.control-touch` styles rather than bespoke compact dimensions.

### 4. Keep Career CV Actions Together

**File**

- `src/features/career/CareerWorkspace.tsx`

**Changes**

1. Group upload, document-name input, and save button in a responsive grid or non-wrapping flex row at `sm` and above.
2. Allow an intentional vertical stack below `sm`, with each item sized for touch and the name input using available space.
3. Retain accessible labels, the hidden file input, and the icon-only save button's accessible name.

### 5. Repair WebLLM Picker Layering

**Files**

- `src/components/shared/WebLLMModelPicker.tsx`
- `src/features/settings/SettingsPanel.tsx`
- `src/index.css`

**Changes**

1. Add a picker presentation prop, such as `menuMode: 'flow' | 'portal'`, with Settings using `flow` and `ProviderSelector` using `portal`.
2. For the portal mode, calculate and update popup position while open on scroll and resize. Constrain height with dynamic viewport units so it remains usable near the viewport edge.
3. Add named layer conventions in `src/index.css`: header `10`, mobile backdrop `20`, sidebar `30`, popover `40`, modal `50`.
4. Move the WebGPU picker out of the Settings generic header controls into a full-width WebGPU detail row. Display the complete model ID in readable, selectable wrapped text rather than a clipped code control.
5. Update the picker label to **Preferred WebLLM model** and keep model metadata available.

## Verification

### Automated

Run in this order:

```bash
npm run lint
npm run build
```

Both commands must complete without warnings or errors.

### Browser Checks

Use `agent-browser` against the Vite app at desktop and mobile widths.

- Open direct links for every valid workspace and confirm the matching workspace renders.
- Open an invalid workspace value and confirm the fallback is Grammar with a canonical URL.
- Navigate through the sidebar, then use browser back and forward. Confirm workspace and URL stay synchronized.
- Reload a History entry and confirm the target workspace and URL change together.
- Check the History search icon at 390px and desktop width; it must not overlap placeholder text or typed content.
- Check History Grammar & Tone and Career Suite filter buttons for aligned icons and labels.
- Select WebGPU in Grammar and Career at 390px, 768px, and desktop width. The header title, description, and controls must align without excess empty space or horizontal overflow.
- Check the Career CV controls at the same widths. They must stack only below the small-screen breakpoint and remain aligned otherwise.
- Open the Settings picker and a workspace-header picker. Options must be visible, clickable, keyboard reachable, and above surrounding content without clipping.
- Verify the Settings picker retains model selection and the full selected model ID remains readable.

## Out of Scope

- Persisting History search, filters, sort order, selected records, prompts, or reload payloads in the URL.
- Replacing the SPA with path-based routing or adding a router dependency.
- Changing provider credentials, privacy behavior, or inference fallback policy.
