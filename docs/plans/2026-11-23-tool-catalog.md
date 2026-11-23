# Build-time tool catalog

`src/tools/catalog.ts` is the authoritative inventory. Each entry records its stable ID and version, user-facing title and description, category, capabilities, actions, default action (when applicable), quick-start status, optional legacy workspace, enabled flag, feature folder, entry module and exported React component. All current tools are enabled.

To add a tool, create a dedicated, non-overlapping feature folder and a named, no-props React page export, then add its metadata and implementation paths to the catalog. Use existing `ToolPage`, `ToolHeader`, `SplitPane`, provider selector, inference and run-persistence components when they fit. Tool-specific prompts and validation belong in the feature. Add new categories to the category definitions and build validator before referencing them.

To disable a tool, set its catalog `enabled` field to `false`, then rebuild and redeploy. The Vite plugin validates metadata and module exports, generates imports only for enabled entries, and fails a production build if another module imports a disabled feature folder. Restart the development server after editing the catalog. Re-enable by setting the flag to `true` and rebuilding.

Disabled tools are absent from navigation, quick starts, the command palette, and execution loaders. Canonical and legacy tool URLs fall back to the workbench. Their existing runs and artifacts remain visible as read-only records, with delete and bulk clear disabled while such records exist. IDs and data are retained for later re-enablement. Existing pins are kept but hidden while a tool is disabled.

Build exclusion is a distribution guarantee, not a security boundary against a party that can modify source, build artifacts, or a development server. Shared code used by other tools remains in the bundle. Move genuinely shared code outside a feature folder before disabling that feature.

Validation: `npm test`, `npm run lint`, then `npm run build`. Run `npm run test:disabled-build` to build an isolated copy with Grammar disabled, test navigation and inspect emitted assets. The existing workspace has unrelated uncommitted local-model changes and they must be preserved.
