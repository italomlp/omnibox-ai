# Workspace Header, Career CV Manager, and WebLLM Theme Fixes Plan

## Scope

Correct the reported layout defects in the Grammar & Tone and Career Suite workspace headers, refactor the Career CV upload/save actions to prevent text input squeezing, and adapt the WebLLM model picker and details container to follow light mode correctly with proper drop shadows.

---

## Confirmed Findings

- **Workspace Header Title Alignment**: In both workspaces, the outer header panel uses `md:items-center` for vertical centering. Since the WebLLM model selector expands vertically with its details, the selector becomes much taller. This causes the left title block to shift down to align with the middle of the selector, resulting in a misaligned and awkward layout.
- **Career CV Manager Squeezing**: The CV upload buttons and text input share a single flex row above the small breakpoint (`sm:flex-row`). The text input has `sm:w-40 sm:flex-1` and a `min-w-0` declaration. On narrower tablet viewports, the horizontal space is compressed, forcing the input to shrink below its useful size and cutting off the placeholder or active file name.
- **WebLLM Picker Light Mode**: The popup menu inside `WebLLMModelPicker.tsx` uses hardcoded dark classes like `bg-zinc-950/98`, `bg-zinc-950`, `bg-zinc-900` and light texts like `text-zinc-100` without theme-aware overrides. Consequently, it remains dark with low-contrast light text when light theme is active.
- **Model Details Theme Compliance**: The details container rendered inside the picker has hardcoded `bg-zinc-950/70 border-zinc-800 text-zinc-400` styling, remaining dark gray and visually out of place when the parent UI is in light theme.
- **Popup Layering Shadows**: The popup dropdown shadow is hardcoded to a black shadow (`shadow-black/40`). In dark mode, it does not stand out clearly against the surrounding dark surfaces. A glowing light shadow for dark mode and a dark shadow for light mode are needed to establish proper visual hierarchy.

---

## Decisions

### Workspace Header Alignment
Change the workspace header wrapper to always be vertically stacked (`flex-col`). Keep the header title and description at the top, and place the provider/model chooser component below it. This ensures that any height variations or details expanding inside the model picker only grow the panel downwards, completely avoiding any horizontal layout conflicts or visual centering shifts of the title.

### Career CV Manager Layout
Refactor the CV upload/save controls into an explicit two-line stack:
- **Line 1 (Top)**: The "Upload CV (PDF/DOCX)" button, aligned to the right.
- **Line 2 (Bottom)**: A horizontal flex row containing the document name text input (which grows to fill available space using `flex-1`) on the left, and the Save button on the right.
This gives the document name input ample room and prevents clipping at any viewport size.

### WebLLM Picker Theme Compliance
Avoid hardcoded dark/light colors directly inside `WebLLMModelPicker.tsx`. Instead, define semantic CSS class name conventions (such as `.webllm-picker-trigger`, `.webllm-picker-menu`, and `.webllm-picker-details`) and write their corresponding theme-aware styling under `src/index.css` for both dark (default) and light themes.

### Adaptive Drop Shadows
Under `src/index.css`, implement custom drop shadows:
- **Dark Mode (Default)**: A light shadow with a subtle glowing border (`shadow-[0_25px_50px_-12px_rgba(255,255,255,0.08)]`) to make the menu clearly appear above other dark elements.
- **Light Mode**: A dark shadow (`shadow-[0_25px_50px_-12px_rgba(9,9,11,0.22)]`) matching the light theme.

---

## Implementation

### 1. Adjust Workspace Headers for Vertical Stacking

**Files**

- `src/features/grammar/GrammarWorkspace.tsx`
- `src/features/career/CareerWorkspace.tsx`

**Changes**

1. Locate the workspace header panel `div` inside both files:
   ```tsx
   <div className="surface-nested flex flex-col items-stretch justify-between gap-4 rounded-xl border border-zinc-800/40 p-4 md:flex-row md:items-center">
   ```
2. Replace it with a vertical stack:
   ```tsx
   <div className="surface-nested flex flex-col items-stretch justify-start gap-4 rounded-xl border border-zinc-800/40 p-4">
   ```
3. Locate the provider selector wrapper `div` below it:
   ```tsx
   <div className="w-full min-w-0 md:w-auto md:flex-none">
   ```
4. Replace it with:
   ```tsx
   <div className="w-full min-w-0">
   ```

### 2. Refactor CV Upload and Save Layout

**File**

- `src/features/career/CareerWorkspace.tsx`

**Changes**

1. Locate the CV Manager controls section (around line 381).
2. Refactor the wrapper `div` and its children:
   - Change the controls wrapper to a vertical stack `flex w-full min-w-0 flex-col gap-2 sm:max-w-md sm:flex-none`.
   - Wrap the file upload `<label>` inside a container `div className="flex w-full justify-end"` (Line 1).
   - Wrap the `<input>` and Save `<button>` inside a row `div className="flex w-full items-center gap-2"` (Line 2), setting `flex-1` on the text input and `flex-shrink-0` on the Save button.

### 3. Add Custom Semantic Picker Classes

**File**

- `src/components/shared/WebLLMModelPicker.tsx`

**Changes**

1. Replace hardcoded Tailwind background, border, and text colors with custom class name tokens:
   - Trigger `<button>` classes: replace `border-zinc-800 bg-zinc-950` with `webllm-picker-trigger`.
   - Trigger label: replace `text-zinc-100` with `webllm-picker-trigger-title`.
   - Trigger hardware text: replace `text-zinc-400` with `webllm-picker-trigger-hardware`.
   - Popup menu container: replace `border-zinc-800 bg-zinc-950/98 shadow-2xl shadow-black/40` with `webllm-picker-menu`.
   - Option group separator line: replace `bg-zinc-800/80` with `webllm-picker-tier-line`.
   - Option label header: replace `text-zinc-500` with `webllm-picker-tier-label`.
   - Option items: replace `border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/80` with `webllm-picker-option webllm-picker-option-inactive` (and `webllm-picker-option-active` for active item).
   - Option label: replace `text-zinc-100` with `webllm-picker-option-title`.
   - Option subtitle: replace `text-zinc-400` with `webllm-picker-option-subtitle`.
   - Option parameters count / family badges: replace `border-zinc-700 bg-zinc-900 text-zinc-300` with `webllm-picker-badge`.
   - Option footer metadata badges: replace `border-zinc-800 bg-zinc-900 text-zinc-400` with `webllm-picker-meta-badge`.
   - Details container: replace `border-zinc-800 bg-zinc-950/70 text-zinc-400` with `webllm-picker-details`.
   - Details titles: replace `text-zinc-500` with `webllm-picker-details-title`.
   - Details content: replace `text-zinc-200` with `webllm-picker-details-content`.
   - Warning box: replace `border-amber-500/20 bg-amber-500/10 text-amber-300` with `webllm-picker-warning`.

### 4. Style WebLLM Picker for Dark and Light Themes

**File**

- `src/index.css`

**Changes**

1. Add default (dark mode) styles for the custom picker classes:
   ```css
   .webllm-picker-trigger {
     border-color: rgba(39, 39, 42, 0.8);
     background-color: #09090b;
   }
   .webllm-picker-trigger:hover {
     border-color: rgba(63, 63, 70, 0.8);
   }
   .webllm-picker-trigger-title {
     color: #f4f4f5;
   }
   .webllm-picker-trigger-hardware {
     color: #a1a1aa;
   }
   .webllm-picker-menu {
     background-color: rgba(9, 9, 11, 0.98);
     border-color: rgba(39, 39, 42, 0.8);
     box-shadow: 0 25px 50px -12px rgba(255, 255, 255, 0.08), 0 0 1px 1px rgba(255, 255, 255, 0.1);
   }
   .webllm-picker-tier-line {
     background-color: rgba(63, 63, 70, 0.4);
   }
   .webllm-picker-tier-label {
     color: #71717a;
   }
   .webllm-picker-option-active {
     border-color: rgba(99, 102, 241, 0.4);
     background-color: rgba(99, 102, 241, 0.1);
   }
   .webllm-picker-option-inactive {
     border-color: rgba(39, 39, 42, 0.8);
     background-color: #09090b;
   }
   .webllm-picker-option-inactive:hover {
     border-color: rgba(63, 63, 70, 0.8);
     background-color: rgba(24, 24, 27, 0.8);
   }
   .webllm-picker-option-title {
     color: #f4f4f5;
   }
   .webllm-picker-option-subtitle {
     color: #a1a1aa;
   }
   .webllm-picker-badge {
     border-color: rgba(63, 63, 70, 0.8);
     background-color: rgba(24, 24, 27, 1);
     color: #d4d4d8;
   }
   .webllm-picker-meta-badge {
     border-color: rgba(39, 39, 42, 0.8);
     background-color: rgba(24, 24, 27, 1);
     color: #a1a1aa;
   }
   .webllm-picker-details {
     border-color: rgba(39, 39, 42, 0.8);
     background-color: rgba(9, 9, 11, 0.7);
     color: #a1a1aa;
   }
   .webllm-picker-details-title {
     color: #71717a;
   }
   .webllm-picker-details-content {
     color: #e4e4e7;
   }
   .webllm-picker-warning {
     border-color: rgba(245, 158, 11, 0.2);
     background-color: rgba(245, 158, 11, 0.1);
     color: #fcd34d;
   }
   ```
2. Add light mode overrides under `html.light`:
   ```css
   html.light .webllm-picker-trigger {
     border-color: rgba(9, 9, 11, 0.12);
     background-color: #ffffff;
   }
   html.light .webllm-picker-trigger:hover {
     border-color: rgba(9, 9, 11, 0.22);
   }
   html.light .webllm-picker-trigger-title {
     color: #09090b;
   }
   html.light .webllm-picker-trigger-hardware {
     color: #52525b;
   }
   html.light .webllm-picker-menu {
     background-color: #ffffff;
     border-color: rgba(9, 9, 11, 0.12);
     box-shadow: 0 25px 50px -12px rgba(9, 9, 11, 0.2), 0 0 1px 1px rgba(9, 9, 11, 0.05);
   }
   html.light .webllm-picker-tier-line {
     background-color: rgba(9, 9, 11, 0.1);
   }
   html.light .webllm-picker-option-active {
     border-color: rgba(79, 70, 229, 0.4);
     background-color: rgba(79, 70, 229, 0.06);
   }
   html.light .webllm-picker-option-inactive {
     border-color: rgba(9, 9, 11, 0.1);
     background-color: #ffffff;
   }
   html.light .webllm-picker-option-inactive:hover {
     border-color: rgba(9, 9, 11, 0.18);
     background-color: rgba(9, 9, 11, 0.03);
   }
   html.light .webllm-picker-option-title {
     color: #09090b;
   }
   html.light .webllm-picker-option-subtitle {
     color: #71717a;
   }
   html.light .webllm-picker-badge {
     border-color: rgba(9, 9, 11, 0.08);
     background-color: rgba(9, 9, 11, 0.04);
     color: #27272a;
   }
   html.light .webllm-picker-meta-badge {
     border-color: rgba(9, 9, 11, 0.08);
     background-color: rgba(9, 9, 11, 0.04);
     color: #52525b;
   }
   html.light .webllm-picker-details {
     border-color: rgba(9, 9, 11, 0.12);
     background-color: rgba(244, 244, 245, 0.5);
     color: #52525b;
   }
   html.light .webllm-picker-details-content {
     color: #27272a;
   }
   html.light .webllm-picker-warning {
     border-color: rgba(217, 119, 6, 0.25);
     background-color: rgba(217, 119, 6, 0.08);
     color: #b45309;
   }
   ```

---

## Verification

### Automated

Validate compilation and linter cleanliness by running:
```bash
npm run lint
npm run build
```
Both commands must complete with zero errors and warnings.

### Browser Checks

We will verify layout correct rendering via:
1. Reloading the app at `http://localhost:5173/` or `http://localhost:5174/`.
2. Verifying the layout headers do not vertically center the titles incorrectly when WebGPU details are open.
3. Checking the Career CV name input width at different screen widths. It must wrap into two lines gracefully and not overflow or cut off text input.
4. Toggling Light Mode:
   - Check the `WebLLMModelPicker` dropdown menu. It must render with a white background and dark text.
   - Check the `Model Details` container. It must render with light gray background, matching dark text, and compliant borders.
   - Observe dropdown shadows in both light and dark modes to verify correct contrast depth.
