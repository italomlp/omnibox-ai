# Early alpha handoff — October 20, 2026

Status: implementation and signed artifacts prepared; **Android release readiness is pending independent final review and the remaining device smoke checks**. No application publication or Play upload has occurred. Account usage limits interrupted the final reviewer and Android QA worker. Do not treat the draft-release Publish button as approval to skip those gates.

## What is preserved

- Repository: https://github.com/italomlp/omnibox-ai
- Web preparation merged: https://github.com/italomlp/omnibox-ai/pull/1
- Exact tested web source: `d52f081051139777fa7f1f6aa2bebc7ef1fd9499`.
- Web CI: https://github.com/italomlp/omnibox-ai/actions/runs/39482675016 (passed); exact-source clean install, lint, 85 tests, 5 manifest CLI checks and production Pages-base build also passed locally.
- Mobile branch: `codex/mobile-alpha`; draft PR https://github.com/italomlp/omnibox-ai/pull/2. Exact built/signed source `1df7b04328d7756e01a9834b49eb1a9f57b76266`.
- Mobile CI: https://github.com/italomlp/omnibox-ai/actions/runs/39485168293 (passed). Mobile has 96 passing tests, strict build, lint and Gradle APK/AAB builds.
- Draft prerelease (six assets): https://github.com/italomlp/omnibox-ai/releases/tag/untagged-fcba9af2f217d4dd0ad0. It is a DRAFT and PRERELEASE, targeted at the mobile SHA above, named QA pending. Nothing has been published.
- Durable local artifacts: `/home/italo/dev/me/omnibox-ai/.release-artifacts/0.1.0-alpha.1/`. This directory is intentionally ignored by Git.
- Signed files: `omnibox-ai-0.1.0-alpha.1.apk` (testing), `omnibox-ai-0.1.0-alpha.1.aab` (Play), plus `omnibox-ai-0.1.0-alpha.1-web.tar.gz`, `release-manifest.json`, `verification-report.json`, `SHA256SUMS.txt`. Uploaded draft assets match these files.

The manifest contains exact source SHAs, sizes, SHA256 hashes and explicit passed/failed/not-run evidence. It does not certify passing checks on its own. Evidence reports and screenshots are preserved in the local artifact directory, not bundled into the application.

## Executed Android evidence

The emulator verified offline bundled startup/Harper, local regex, exact synthetic TXT/PDF/DOCX parsing through the React importer, real Android TXT Downloads picker, key exclusion from settings, key removal with documents and cancelled run retained after cold process restart, background cancellation and external feedback links opening the system browser. See the preserved Android report for exact evidence paths.

The final release APK was separately installed and launched on the emulator. Signature, APK ZIP alignment, app metadata, permissions and archive secret/test-file hygiene pass. Signed-build Back closes the sidebar (settled screenshot preserved); process survives a basic rotation. This does not replace full signed-build keyboard/history/rotation checks. Live cloud inference was not tested and remains NOT LIVE-VERIFIED.

App identity: `com.italomlp.omniboxai`, `0.1.0-alpha.1`, versionCode `1`, min SDK `24`, target SDK `36`, no microphone permission. Android WebLLM/Ollama/speech are disabled at UI and execution boundaries; API keys are session-only. Web behavior remains separate.

## Remaining release gates and exact next actions

1. Resume independent final review of the frozen mobile source. Prior web and release task reviews passed; final whole-release reviewer stopped at account usage limit without a final verdict. The reviewer had reported no policy/credential bypass found so far; that is NOT an approval. Review input `/tmp/omnibox-final-review.diff`, full plan and worker reports. Recreate a diff from Git if temporary files disappeared. Fix important findings, then rebuild/re-sign/re-hash and replace draft assets if source changes.
2. Finish signed-build keyboard, navigation history, overlays and rotation/device checks; record results without claiming unexecuted checks. Existing debug/emulator evidence and signed-launch screenshots are in the artifact directory. If no hardware is available, keep that limitation explicit.
3. Pages is configured with `build_type=workflow` and zero deployments. Workflow: https://github.com/italomlp/omnibox-ai/actions/workflows/pages.yml. **Owner only:** choose main, Run workflow, input `tested_commit_sha=d52f081051139777fa7f1f6aa2bebc7ef1fd9499`. No agent has dispatched it. This exact commit remains a main ancestor even after later documentation commits.
4. **Pages HTTPS issue:** GitHub's Pages API reports inherited account-domain URL `http://www.italomlp.dev/omnibox-ai/`, `cname=null`, `https_enforced=false`, no deployment. Enabling HTTPS returned `The certificate does not exist yet`. No global domain/DNS settings were changed. The requested `https://italomlp.github.io/omnibox-ai/` can redirect through the account domain. After initial owner-triggered deployment/provisioning, verify the real HTTPS URL and enable Enforce HTTPS in repository Pages settings before sharing the app or entering keys. If the certificate does not provision, resolve the inherited-domain settings with the owner; do not bypass browser certificate warnings or silently change their existing site.
5. Play app and credentials do not exist yet. Follow [the first-release guide](play-first-release-guide.md) to create the free app, accept signing terms yourself, upload the signed AAB to an internal DRAFT, add tester `italomlp@gmail.com`, and complete truthful required app declarations. Optional later CLI uses the pinned draft-only Fastlane lane after first Console upload. No service account, Google account change, Play draft, invitation or rollout was performed by agents. Automatic browser approval blocked the intended Play Console navigation after a redirect to an unapproved origin; the user subsequently requested owner setup instructions instead.
6. Once gates pass, the owner performs Play internal rollout and optionally publishes the GitHub prerelease. No agent clicks final publication actions.

## Signing backup and rebuild

Signing key: `/home/italo/.local/share/omnibox-ai/signing/upload-keystore.p12`; alias `omnibox-upload`. Back up the complete private signing directory securely, including its protected password material; do not upload it to the repository, release, chat or shared storage. Keep an encrypted offline backup. Never generate a replacement key for an update without planning upload-key rotation.

Certificate SHA256: `DC:41:CB:70:D2:C4:D7:9A:3B:85:EE:02:1B:29:1C:F0:1C:07:69:C2:48:AE:A0:0D:40:3D:02:95:30:79:DA:3A`.

Mobile worktree: `/home/italo/.codex/worktrees/alpha-android/omnibox-ai`. Build environment: `JAVA_HOME=/tmp/omnibox-android-toolchain/zulu21.48.17-ca-jdk21.0.10-linux_x64`, `ANDROID_HOME=/tmp/omnibox-android-toolchain/sdk`, `GRADLE_USER_HOME=/tmp/omnibox-android-toolchain/gradle`. Run `npm ci`, `npm run lint`, `npm test`, `npm run android:release` with that environment. Temporary toolchains may need reinstalling after reboot; preserve the user-owned signing directory regardless.

The APK was ZIP-aligned with build-tools 36.0.0 and signed with apksigner; the AAB was signed with jarsigner using the same PKCS12 key. Supply the protected password file through the tools' file input, never inline or printed. apksigner should reuse the store password for the key; supplying the same one-line password file twice consumes it and fails. Verify signatures/alignment/app ID before updating the draft.

## Resume and rollback

Read `docs/plans/2026-10-20-web-android-alpha-release.md` and AGENTS.md; inspect the recorded branches and artifacts; resume the first incomplete task and stop before publication. Worktrees were preserved. Source is committed and pushed. Do not repeat completed implementation or regenerate signing material.

Later corrected Android uploads need a higher versionCode. Halt testing distribution before replacing a faulty build. For web, manually deploy a previous tested main SHA; if this is the first publication and it must be withdrawn, disable Pages. See [runbook](runbook.md).
