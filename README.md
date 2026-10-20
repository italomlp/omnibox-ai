# OmniBox AI

A client-side AI productivity workbench built with React, TypeScript, Vite, Zustand, Dexie, and Tailwind CSS v4. Work with grammar and tone, career documents, regular expressions, schemas, TypeScript/JSDoc, browser speech, and a local Library of runs and artifacts.

**Release candidate: 0.1.0-alpha.1. Live provider inference is NOT LIVE-VERIFIED.** Generated output needs review. The alpha is not a production-readiness claim.

- Intended web address: [OmniBox AI on GitHub Pages](https://italomlp.github.io/omnibox-ai/) — availability depends on the owner's manual deployment.
- [Privacy and alpha limitations](https://italomlp.github.io/omnibox-ai/privacy.html#limitations) ([source](public/privacy.html)).
- [Release notes](docs/releases/0.1.0-alpha.1.md), [release runbook](docs/releases/runbook.md), and [draft Play listing](docs/releases/play-listing-draft.md).
- [Report an issue](https://github.com/italomlp/omnibox-ai/issues) or contact [italomlp@gmail.com](mailto:italomlp@gmail.com). Remove credentials and personal content from reports.

## Develop and verify

Use Node.js 24 and npm. There is no app backend to start.

```sh
npm ci
npm run dev
```

Before release, run lint before building:

```sh
npm run lint
npm test
node --test scripts/release-manifest.check.mjs
npm run build
```

For a GitHub project Pages build:

```sh
npm run build -- --base /omnibox-ai/
npm run preview
```

The `dist/` folder is the static web artifact. CI runs install, lint, tests, manifest checks, and build on pushes and pull requests. Deployment has a separate manual workflow: the owner must select a full tested commit SHA from `main` and press **Run workflow**. Pushing a commit, tag, or GitHub release does not deploy the site.

## Providers and privacy

Cloud provider requests use browser `fetch` and your own provider key. Provider charges and terms apply. Browser CORS restrictions can prevent direct connections, including some Anthropic-compatible endpoints. Do not put a secret service key into a public build or use an untrusted proxy.

Web preferences and provider keys persist in localStorage, and IndexedDB stores documents, inputs, outputs, and run records. The app does not encrypt this local data. Privacy Mode blocks cloud inference and cloud fallback; browser speech recognition is blocked because its processing may use vendor network services. Local WebLLM requires WebGPU and explicit model downloads; web Ollama needs a reachable local server with compatible browser/CORS settings. The interface has no advertising or analytics integrations and embeds no remote fonts or CDN scripts.

The Android alpha is maintained on a separate mobile branch with app ID `com.italomlp.omniboxai`. It keeps API keys in memory for the app session and disables WebLLM/WebGPU, Ollama, and speech features. Android signing and store upload are separate release steps; this repository's web workflow does not publish Android builds.

## Known limitations

Live cloud responses, real-device model downloads, browser speech, Android device installation, and store acceptance need their own recorded checks. Automated tests and a successful build do not prove these flows. Browser storage may be cleared or evicted and is not a backup. WebGPU, PDF/DOCX parsing, large local models, and the large WASM/JavaScript assets can use substantial memory, bandwidth, and storage. Review the release notes and verification report for the exact artifact being tested.

The optional `tools/play-upload/` Fastlane configuration prepares only a draft internal Play release when the owner explicitly runs it with external credentials. It is not part of app runtime or CI. No store upload is implied by the configuration.
