# Early alpha handoff — October 20, 2026

Status: **all agent-side implementation, independent review, signing and emulator gates passed**. Owner hosting/account setup still blocks publication. No application publication or Play upload has occurred.

## What is preserved

- Repository: https://github.com/italomlp/omnibox-ai
- Web preparation merged: https://github.com/italomlp/omnibox-ai/pull/1
- Exact tested web source: `d52f081051139777fa7f1f6aa2bebc7ef1fd9499`.
- Web CI: https://github.com/italomlp/omnibox-ai/actions/runs/39482675016 (passed); exact-source clean install, lint, 85 tests, 5 manifest CLI checks and production Pages-base build also passed locally.
- Mobile branch: `codex/mobile-alpha`; PR https://github.com/italomlp/omnibox-ai/pull/2. Exact built/signed source `44ebafae397cc0176b07142dff6adea173fd1326`.
- Mobile CI: https://github.com/italomlp/omnibox-ai/actions/runs/39488234587 (passed). Mobile has 96 passing tests, strict build, lint and Gradle APK/AAB builds.
- Draft prerelease (nine assets, including review and emulator evidence): https://github.com/italomlp/omnibox-ai/releases/tag/untagged-98c563d3b2bf95ce3313. It is a DRAFT and PRERELEASE, targeted at the mobile SHA above, prepared for owner review. Nothing has been published.
- Durable local artifacts: `/home/italo/dev/me/omnibox-ai/.release-artifacts/0.1.0-alpha.1/`. This directory is intentionally ignored by Git.
- Signed files: `omnibox-ai-0.1.0-alpha.1.apk` (testing), `omnibox-ai-0.1.0-alpha.1.aab` (Play), plus `omnibox-ai-0.1.0-alpha.1-web.tar.gz`, `release-manifest.json`, `verification-report.json`, `SHA256SUMS.txt`. Uploaded draft assets match these files.

The manifest contains exact source SHAs, sizes, SHA256 hashes and explicit passed/failed/not-run evidence. It does not certify passing checks on its own. Evidence reports and screenshots are preserved locally and attached to the draft; they are not bundled into the application.

## Executed Android evidence

The emulator verified offline bundled startup/Harper, local regex, exact synthetic TXT/PDF/DOCX parsing through the React importer, real Android TXT Downloads picker, key exclusion from settings, key removal with documents and cancelled run retained after cold process restart, background cancellation and external feedback links opening the system browser. See the preserved Android report for exact evidence paths.

The signed APK passed keyboard/palette and overlay Back behavior, history navigation, root minimization, portrait/landscape draft retention, offline cold startup, and session-key removal with documents retained across process restart. The emulator is API37 / WebView145. Independent source review passed with no actionable findings, including the final Android-only sticky-header safe-area fix. The final same-key signed APK update retained the saved document and passed scrolled portrait/landscape header spacing, no double inset at the top, and keyboard/Back regression. The crash buffer was empty. Evidence is recorded in the QA report. No physical phone was available; live cloud inference remains **NOT LIVE-VERIFIED**.

App identity: `com.italomlp.omniboxai`, `0.1.0-alpha.1`, versionCode `1`, min SDK `24`, target SDK `36`, no microphone permission. Android WebLLM/Ollama/speech are disabled at UI and execution boundaries; API keys are session-only. Web behavior remains separate.

## Remaining release gates and exact next actions

1. Resolve the inherited Pages redirect using [the web publication guide](web-first-release-guide.md). The requested GitHub URL currently redirects to an account-site custom domain served by Vercel and returns404. This needs your decision about the stale account Pages association; no DNS or existing-site setting was changed by agents.
2. **Owner web publication:** open [Publish tested web commit](https://github.com/italomlp/omnibox-ai/actions/workflows/pages.yml), choose branch **main**, **Run workflow**, `tested_commit_sha=d52f081051139777fa7f1f6aa2bebc7ef1fd9499`. Verify HTTPS, tools and the public privacy page afterward. No agent dispatched this workflow.
3. **Owner Play setup:** follow [the first-release guide](play-first-release-guide.md). Create the free app, accept terms yourself, use Play App Signing, upload the signed AAB/code1 to an internal draft, add tester `italomlp@gmail.com`, and complete truthful required declarations. You do not need a service-account JSON for this first Console upload. Optional later draft-only Fastlane setup is documented; Ruby/tooling and authentication were not runtime-validated.
4. Review the internal draft, then perform **Start rollout / Publish / Send for review** yourself when Console requires it. No Play app, draft, upload or invitation has been created by agents. Automatic browser approval blocked the Console redirect; you subsequently requested owner setup guidance instead. Consequently there is no Play draft link to hand over yet.
5. Optionally publish the [GitHub prerelease](https://github.com/italomlp/omnibox-ai/releases/tag/untagged-98c563d3b2bf95ce3313) after reviewing its evidence. It remains a draft. GitHub publication, Pages publication and Play rollout are separate actions.

## Signing backup and rebuild

Signing key: `/home/italo/.local/share/omnibox-ai/signing/upload-keystore.p12`; alias `omnibox-upload`. Back up the complete private signing directory securely, including its protected password material; do not upload it to the repository, release, chat or shared storage. Keep an encrypted offline backup. Never generate a replacement key for an update without planning upload-key rotation.

Certificate SHA256: `DC:41:CB:70:D2:C4:D7:9A:3B:85:EE:02:1B:29:1C:F0:1C:07:69:C2:48:AE:A0:0D:40:3D:02:95:30:79:DA:3A`.

Mobile worktree: `/home/italo/.codex/worktrees/alpha-android/omnibox-ai`. Build environment: `JAVA_HOME=/tmp/omnibox-android-toolchain/zulu21.48.17-ca-jdk21.0.10-linux_x64`, `ANDROID_HOME=/tmp/omnibox-android-toolchain/sdk`, `GRADLE_USER_HOME=/tmp/omnibox-android-toolchain/gradle`. Run `npm ci`, `npm run lint`, `npm test`, `npm run android:release` with that environment. Temporary toolchains may need reinstalling after reboot; preserve the user-owned signing directory regardless.

The APK was ZIP-aligned with build-tools 36.0.0 and signed with apksigner; the AAB was signed with jarsigner using the same PKCS12 key. Supply the protected password file through the tools' file input, never inline or printed. apksigner should reuse the store password for the key; supplying the same one-line password file twice consumes it and fails. Verify signatures/alignment/app ID before updating the draft.

## Resume and rollback

Read `docs/plans/2026-10-20-web-android-alpha-release.md` and AGENTS.md; inspect the recorded branches and artifacts; resume the first incomplete task and stop before publication. Worktrees were preserved. Source is committed and pushed. Do not repeat completed implementation or regenerate signing material.

Later corrected Android uploads need a higher versionCode. Halt testing distribution before replacing a faulty build. For web, manually deploy a previous tested main SHA; if this is the first publication and it must be withdrawn, disable Pages. See [runbook](runbook.md).

## Final artifact checksums

| Artifact | SHA256 |
| --- | --- |
| APK | `ca37731fefe4eb313d49ee5f2e0f5f3a38aca74091773307af5551e6126cc98f` |
| AAB | `584a59b145f26847fe1d29813fdf7356965f805bf3b82a90e2706627dc821e66` |
| Web archive | `79542c7ff5bc8d17c801158ae03eb5cb9e54de9fc6db0487a1af5f7854c85ffe` |

GitHub uploaded asset digests match these local files. Superseded1df7b04 artifacts are preserved only under the local `previous-1df7b04/` directory; use the canonical files above. Android PR2 remains separate from web main and is reviewed/ready, with no source implementation left for the owner.
