# Electron Readiness (Future Work Only)

This document is a packaging guide for a future Electron build. It is **not** current Electron support and must not be read as permission to add Node integration, IPC broadening, or renderer privilege.

## Security posture

- Keep the renderer unprivileged.
- Use `contextIsolation: true` and `nodeIntegration: false`.
- Prefer no preload at all; add a preload only for a specific native capability that cannot be served by browser APIs.
- If preload is required, expose a tiny allowlist only (`clipboard`, `files`, `storage`, `speech`, etc.) and keep every method narrow, typed, and capability-scoped.
- Do not create a generic IPC bridge.

## Protocol and asset loading

- Package the app behind a secure custom app protocol (for example `app://`), not `file://`.
- Keep renderer fetches and local asset loading compatible with that protocol.
- Treat Vite asset resolution as a packaging requirement: verify root assets, hashed chunks, static imports, and favicon paths still resolve under the app protocol.
- Keep `index.html` favicon/base assumptions stable and avoid file-path-only behavior.

## CSP and provider/network implications

- Ship a CSP that allows the renderer to load only what the app genuinely needs.
- Allow local asset loading and the current provider request targets explicitly; do not widen `connect-src` more than required.
- Preserve the privacy-mode boundary: cloud provider requests still require the existing policy gate.
- If Ollama remains a localhost target, keep loopback connectivity intentional and auditable in CSP and request handling.

## WebGPU model cache/download policy

- Treat WebGPU model downloads as user-managed local assets, not embedded app content.
- Cache models in app-scoped storage and make the cache location/size visible to the user.
- Support clear/download/delete flows so model storage can be reclaimed without reinstalling the app.
- Do not assume browser-storage semantics match Electron storage; define a stable migration path for cached models before packaging.

## IndexedDB / profile data / backup

- Keep Runs, Documents, Artifacts, and preferences in the Electron profile data directory via the existing browser storage model until a native adapter is required.
- Plan for profile backup and restore as a packaging concern: data should survive app restarts and be portable with the user profile.
- Provide explicit export/import or backup guidance for local data before introducing any new storage backend.
- Do not silently move user data between profiles.

## OS keychain (optional future adapter)

- Treat OS keychain usage as optional future work.
- Use it only for secrets such as provider API keys.
- Never store prompts, documents, runs, or model artifacts in the keychain.
- Keep a browser-storage fallback so the app still works without native secret storage.

## Electron smoke-test checklist

- App launches under the custom protocol with no console CSP errors.
- Deep links open the correct route/tool.
- Static assets, icons, and favicons load correctly.
- Renderer has no `window.require`, no Node globals, and no direct filesystem access.
- Privacy mode still blocks cloud-provider requests.
- Ollama localhost requests still work when enabled.
- WebGPU model download/cache/delete flows work and persist across restart.
- IndexedDB-backed runs/documents/artifacts survive close/reopen.
- Export/import or backup flows restore local data correctly.
- Any preload-exposed capability works only through the explicit allowlist.
