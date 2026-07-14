# Styling

Use Tailwind CSS v4 only.

- Do not create `tailwind.config.js` or install Tailwind v3 setup packages.
- Keep CSS-first theme definitions and custom utilities in `src/index.css`.
- Default design is dark-mode-first with zinc/slate surfaces, `bg-zinc-950`, and `text-zinc-100`.
- Use glass panels with transparent borders and `backdrop-blur` for dashboard surfaces.
- Use subtle indigo, violet, or emerald accents for processing/local status.
- Keep light mode neutral slate: white/zinc surfaces, clear text contrast, restrained indigo/emerald accents.
- Avoid mobile horizontal overflow. Inputs/selects inside flex or grid containers should use `min-w-0 w-full`.
- Prefer semantic theme utilities/classes over broad global `!important` overrides when editing existing styles.
