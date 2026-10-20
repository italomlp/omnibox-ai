# OmniBox AI Web and Android Early Alpha Implementation Plan

**Goal:** Prepare 0.1.0-alpha.1 on October 20, 2026; publish nothing without the user's final action.
**Execution:** Subagents in isolated worktrees, coordinated and reviewed by primary agent. Read AGENTS.md and applicable .agents guides. Use strict TypeScript, React 19, Vite, Zustand, Dexie, Tailwind v4, SDK-free browser fetch, no backend.
**Resume prompt:** Read this plan and AGENTS.md, inspect the recorded branches and artifacts, resume the first incomplete task, and stop before publication.

## Confirmed release contract
- Web: https://italomlp.github.io/omnibox-ai/ via manually triggered Pages workflow checking out an exact tested SHA. No push/merge/tag/release event deploys.
- Android: Capacitor 8 bundled dist assets; app ID com.italomlp.omniboxai; name OmniBox AI; English; free; no ads; version 0.1.0-alpha.1, versionCode 1. Signed AAB in draft Play internal-testing release and signed APK for emulator/testing.
- Public support contact and initial internal tester: italomlp@gmail.com. Do not send invitations/messages.
- User owns final Run workflow, Play rollout, GitHub prerelease publication, and any legal acceptance. No automatic publication. No fallback to APK distribution instead of Play without user instruction.
- React Native rewrite, native offline LLM, native speech, production-store launch are deferred. Target 4–8 hours excluding external setup; never bypass release gates to meet date.

## Tasks, owners and acceptance
- [x] 0 Primary: Save durable plan before implementation.
- [x] 1 Primary: Recheck GitHub repo; create public italomlp/omnibox-ai if absent. Preserve git history and existing dirty changes; explicitly stage only intended files using core.filemode=false per command. Exclude AppleDouble sidecars, .tmp, dist, node_modules and signing secrets. Create codex/web-alpha; commit repaired lockfile and prior validation docs with plan. Create isolated agent worktrees. Record paths and SHAs.
- [ ] 2 Web subagent: Shared early-alpha badge, feedback/limitations, strict TypeScript, true lazy loading for WebLLM and heavyweight workspaces, Pages subpath navigation. Fix rather than suppress lint or strict failures. Preserve privacy hard boundary and bundled parsers. Run targeted tests first for behavior, then lint/full tests/build.
- [ ] 3 Release subagent: CI npm ci → lint → tests → build; manual-only Pages deployment with full SHA input; static privacy page accurately disclosing local data, user-selected cloud requests, web credential storage and speech limitations. Release notes, reproducible artifact manifest tooling, README and rollback/runbook. Never trigger deployment. Primary owns package.json/lockfile integration.
- [ ] 4 Primary: Review and integrate shared/web changes; version package 0.1.0-alpha.1, reconcile lockfile. Commit shared checkpoint. Create codex/mobile-alpha worktree FROM SHARED CHECKPOINT before Android implementation. Android agent can inspect/plan earlier, but must not scaffold before checkpoint.
- [ ] 5 Android subagent: Capacitor 8 config appId/name/webDir dist; no remote server.url. Compatible SDK/JDK/Gradle; safe areas, keyboard, Back closes overlay then history then native exit; external links system browser; inference cancellation on background saved as cancelled run. Keep six tools. Disable Android WebLLM/Ollama/speech with clear reasons at UI AND execution boundaries, including stale settings. No microphone permission. Cloud BYOK, local grammar/regex, document import, IndexedDB persistence remain. Android keys memory-only; exclude from persisted settings and discard previously persisted native keys. Explain restart behavior; web behavior unchanged. Test first for security/state changes. Report manifest changes to primary; don't concurrently edit shared package files.
- [ ] 6 Primary: Review and merge web PR to main with deployment dormant; configure Pages Actions. Use gh for repo/PR/check/release operations and attach created PRs to chat. Keep mobile branch distinct. Verify production web at /omnibox-ai/ and phone width.
- [ ] 7 Primary + Android: Generate persistent upload keystore OUTSIDE Git in user-owned location with restrictive permissions. Never print/store secrets in source, docs, logs or artifacts. Record only location, fingerprint, backup instructions. Build signed release AAB/APK with same key. Verify app ID/version, permissions, signatures; test release APK on emulator.
- [ ] 8 Independent reviewer: Review web and mobile diffs, privacy/network policy, persistence of credentials, workflow publication boundaries and signing exclusion. Fix important findings; rerun affected gates.
- [ ] 9 Primary: Create artifact manifest with web/mobile commit SHA, filenames, SHA256, test results. Create draft GitHub prerelease and attach signed artifacts/notes, never publish.
- [ ] 10 Primary: Prepare new free Play app with account user already has. Accurate support/privacy/app-content/listing declarations only. Initial tester italomlp@gmail.com, no messages. Upload signed AAB and alpha notes to draft internal test. Hand legal acceptance to user at point of action; resume afterwards. Leave rollout untouched.
- [ ] 11 Primary: Deliver exact workflow/draft links, tested SHAs, user-only buttons, evidence, limitations, signing backup and rollback. Commit/push progress and keep worktrees if unfinished.

## Interface and ownership contracts
- Primary owns package.json, package-lock.json, shared plan and integration. Workers send dependency requirements; don't race on lockfiles.
- Web owner: strict tsconfigs, App/header/route lazy loading, useWebLLM lazy runtime, alpha metadata/UI. Release owner: .github workflows, public/privacy.html, README/release docs and artifact tooling. Android owner: android/, capacitor config, src/platform native adapters, native-only capability/persistence integration and tests; coordinate overlapping App/settings/inference edits with primary AFTER web integration.
- Capabilities must be enforced before any native-disabled inference/download/speech action; no silent cloud fallback. Privacy mode always wins. Session-only Android keys stay out of storage even following migration; local documents/runs survive process restart.
- Web feedback: repository issue link. Native external HTTP(S) links use system browser, preserving internal query navigation.

## Required verification
- [ ] Clean npm ci from committed lockfile; lint zero diagnostics; strict typecheck, all original 72 tests plus targeted tests; web build with no hidden warning suppression.
- [ ] All six tools + Workbench/Library/settings load. Harper issue/apply; regex matches; invalid JSON/empty schema; TXT/PDF/DOCX fixtures import/save/reopen.
- [ ] Deterministic mocked streaming success/error/abort tests; privacy cloud rejection; native disabled provider and speech rejection; migration cannot restore native API keys; never call mocks live verification.
- [ ] Emulator signed APK: launch, Back/overlays/keyboard/rotation, offline restart, background cancellation, DB persistence, keys disappear after process death. No microphone permission. Inspect logs.
- [ ] Production web at Pages subpath and mobile width, record screenshots/evidence. Verify exact tested SHA in deployment instructions.
- [ ] Signed AAB/APK signature/appId/version/permissions; scan tracked files/artifacts for secrets and accidental test data.
- Live providers only when explicitly available credentials permit; otherwise release notes say NOT LIVE-VERIFIED. Crashes/privacy bypass/signing failure/unusable core flow block affected release; optional failures disabled and documented.

## Publication, rollback and checkpoints
- Web user clicks Run workflow with recorded SHA; no deployment dispatch by agent. GitHub release remains draft until user's Publish action. Play user clicks internal rollout; agent leaves draft.
- Rollback: deploy previous tested web SHA; halt Android testing distribution and ship incremented versionCode for correction. New app has no previous release, so disable Pages if first alpha must be withdrawn.
- On interruption: commit/push completed tasks, update this plan's state, links and exact next commands; preserve worktrees and signing files. Never claim ready without evidence.

## Current state / recovery log
- Baseline HEAD: ee41c9b9b31e4ec6a115a7a891dc50868c8d1627; primary checkout /home/italo/dev/me/omnibox-ai on main before setup.
- Prior validation: npm ci repaired; lint clean; 72 tests pass; build passes with large main chunk. Lock repair has no existing dependency version changes. Existing modified file modes are pre-existing and must remain unstaged.
- Metadata backup: /tmp/omnibox-appledouble-backup-20261020; protected .agents metadata untouched. Existing .tmp is unrelated.
- GitHub gh auth works with network-enabled execution. No origin configured. Repo returned 404 during planning; public creation authorized. SDK /home/italo/Android/Sdk exists; system Java 17. ADB listener requires network-enabled execution; emulator not yet verified.
- Branches/worktrees/commits/PRs/runs/artifacts/signing fingerprint: append after creation, never invent values.
- Next action: establish web branch and baseline commit, then native managed worktrees and delegate workers.

### Execution checkpoint 1
- Repository created: https://github.com/italomlp/omnibox-ai (public). Origin configured. Baseline and web branch push underway. Plan/lock/docs checkpoint 892efc96f53c2c5bcad1dd2c50e75d4081b45815.
- Web worker /root/web_readiness: /home/italo/.codex/worktrees/alpha-web-readiness/omnibox-ai. Release worker /root/release_preparation: /home/italo/.codex/worktrees/alpha-release-preparation/omnibox-ai. Android worker /root/android_packaging: /home/italo/.codex/worktrees/alpha-android/omnibox-ai (tooling only until shared checkpoint).
- Worker briefs/reports: /tmp/omnibox-{web,release,android}-{brief,report}.md. Reports written on completion.
- Next: integrate web/release commits, send shared checkpoint to Android worker; finish private signing and Play draft preparation.

### Execution checkpoint 2
- GitHub main and codex/web-alpha pushed. Public repository https://github.com/italomlp/omnibox-ai.
- Private signing key generated at /home/italo/.local/share/omnibox-ai/signing/upload-keystore.p12 (alias omnibox-upload). SHA256 certificate DC:41:CB:70:D2:C4:D7:9A:3B:85:EE:02:1B:29:1C:F0:1C:07:69:C2:48:AE:A0:0D:40:3D:02:95:30:79:DA:3A. Back up the complete signing directory privately; never commit/upload credentials.
- Compatible npm audit fix removed all high-severity findings, including malicious-PDF advisory. Remaining three moderate findings are Mammoth's Node CLI argparse/sprintf-js dependency chain; do not force downgrade Mammoth to 0.3.29. Verify browser bundle reachability and document residual.
- Play Console browser navigation blocked by automatic approval: intended play.google.com resolved to unapproved google.play origin. User asked about CLI; Fastlane draft lane being prepared. No service-account key provided and new app/initial build require Console. DO NOT retry blocked origin or alternative browser to circumvent review. Await explicit origin authorization or user's Console setup.
- Android SDK36 prepared; API37 emulator booted by Android worker. Web worker reports 76 tests, strict build, 401KB main entry with deferred WebLLM large-chunk warning retained. Review pending.
