# WebLLM Model Picker Styling Refactor Design Spec

## Goal Description
We will refactor the styling of the WebLLM model picker component (`WebLLMModelPicker.tsx`) to remove its custom `.webllm-picker-*` CSS classes from `src/index.css`. Instead, we will register a custom Tailwind CSS v4 `light:` variant globally, and apply inline, theme-aware Tailwind classes directly to the component.

---

## Technical Details

### 1. Custom Tailwind Variant
Register the `light:` variant in `src/index.css` to allow theme selection in dark-mode-first setup:
```css
@custom-variant light (&:where(.light, .light *));
```

### 2. Style Mapping in Component
We will update `src/components/shared/WebLLMModelPicker.tsx` to use inline Tailwind utility classes with `light:` prefix:
- **Trigger button:** `border-zinc-800 bg-zinc-950 hover:border-zinc-700 light:border-zinc-200 light:bg-white light:hover:border-zinc-300`
- **Menu Container:** `bg-zinc-950/98 border-zinc-800 shadow-[0_25px_50px_-12px_rgba(255,255,255,0.08),0_0_1px_1px_rgba(255,255,255,0.1)] light:bg-white light:border-zinc-200 light:shadow-[0_25px_50px_-12px_rgba(9,9,11,0.2),0_0_1px_1px_rgba(9,9,11,0.05)]`
- **Option Container:** (Active) `border-indigo-500/40 bg-indigo-500/10 light:border-indigo-600/40 light:bg-indigo-600/5` / (Inactive) `border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/80 light:border-zinc-200 light:bg-white light:hover:border-zinc-300 light:hover:bg-zinc-50`
- **Model Details Section:** `border-zinc-800 bg-zinc-950/70 text-zinc-400 light:border-zinc-200 light:bg-zinc-50/50 light:text-zinc-600`
- **Badges:** `border-zinc-700 bg-zinc-900 text-zinc-300 light:border-zinc-200 light:bg-zinc-100 light:text-zinc-700`
- **Warning text:** `border-amber-500/25 bg-amber-500/10 text-amber-300 light:border-amber-600/25 light:bg-amber-600/8 light:text-amber-700`

---

## Verification Plan

### Automated Verification
Run linting and typescript building to ensure zero errors:
```bash
npm run lint
npm run build
```

### Manual Verification
1. Open the application.
2. Verify visual appearance of the WebLLM Model Picker in **Dark Mode** (both collapsed trigger state and expanded option state, plus details section).
3. Toggle to **Light Mode**.
4. Verify visual compliance (proper borders, background colors, shadow depth, contrast, and layout alignment) of the WebLLM Model Picker.
