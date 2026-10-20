# Alpha release runbook

Target: `0.1.0-alpha.1`; web: `https://italomlp.github.io/omnibox-ai/`; Android: `com.italomlp.omniboxai`. Final web deployment, Play rollout/review submission, and GitHub release publication are owner-only actions. Agents must not dispatch the Pages workflow or click publish/rollout buttons.

## 1. Freeze and verify source

1. Review and merge the web candidate onto `main`; preserve the separate mobile branch. Record the full 40-character web and mobile commit SHAs. Do not substitute a branch name, tag, or moving `HEAD` for a recorded source revision.
2. From a clean checkout of each relevant source revision, use Node 24 and run `npm ci`, `npm run lint`, `npm test`, `node --test scripts/release-manifest.check.mjs`, then the platform build. For web, use `npm run build -- --base /omnibox-ai/`. Resolve lint findings before building. Record audit output and build warnings.
3. Test the Pages subpath and privacy link using the built site. Check navigation, refresh, assets, local Library records, empty-provider errors, privacy blocking, and small-screen layout. Record live checks separately; leave live inference **NOT LIVE-VERIFIED** until a real provider response is observed for this revision.
4. Verify the Android bundle's package ID, version name/code, signing certificate, and install on a real supported device. Test session-only keys, import, provider errors, privacy blocking, navigation/back behavior, and the disabled local/speech capabilities. A successful Gradle build is not a device test. Keep the upload keystore, passwords, service-account keys, and recovery material outside the repository and release attachments.

## 2. Create artifacts and manifest

Archive the exact web `dist/` output and retain the signed mobile `.aab` plus any intended tester `.apk`. Use stable artifact filenames and retain build logs. Rebuilding ZIP files can change archive metadata: the manifest is reproducible for the same input bytes, not a promise that independent builds have identical bytes.

Create `verification.json` with actual results only. The following is an **unexecuted template**, deliberately recording no passing tests:

```json
{
  "checks": [
    { "name": "lint", "status": "not-run" },
    { "name": "unit-tests", "status": "not-run" },
    { "name": "manifest-checks", "status": "not-run" },
    { "name": "web-build", "status": "not-run" },
    { "name": "pages-smoke", "status": "not-run" },
    { "name": "android-build", "status": "not-run" },
    { "name": "android-device-smoke", "status": "not-run" }
  ],
  "liveInference": "not-live-verified"
}
```

Allowed check statuses: `passed`, `failed`, `not-run`. Use `live-verified` only after documenting a real response in the human-readable evidence report. Names are lowercase hyphenated identifiers; no additional report fields are accepted. Keep commands, logs, test counts, devices, limitations, and observed responses in a separate scrubbed evidence document. Do not include credentials or task content containing personal data.

```sh
node scripts/release-manifest.mjs \
  --web-sha FULL_40_HEX_WEB_COMMIT \
  --mobile-sha FULL_40_HEX_MOBILE_COMMIT \
  --verification-report /absolute/path/verification.json \
  --output /absolute/path/release-manifest.json \
  --artifact /absolute/path/omnibox-ai-0.1.0-alpha.1-web.zip \
  --artifact /absolute/path/omnibox-ai-0.1.0-alpha.1-android.aab
```

Replace the SHA placeholders with actual full hashes. The tool uses Node built-ins only, requires no credentials, hashes every file and the verification report, records exact supplied SHAs, sorts output deterministically, and refuses to overwrite an existing manifest. All artifact basenames must be unique. It does not infer test success or prove that artifacts were built from the supplied commits. Keep the verification report next to the manifest so its digest can be checked.

## 3. Publish web — owner only

In repository Settings → Pages, select **GitHub Actions** as the publishing source if not already configured. Keep the `github-pages` environment restricted to `main`; add an owner review requirement if desired. Configuration is an owner action. The workflow assumes Pages is already enabled. [GitHub's custom Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) describes the environment and permission requirements.

1. Open Actions → **Publish tested web commit (manual)**.
2. Select `main` as the workflow branch and enter the previously tested full web commit SHA in `tested_commit_sha`.
3. The owner presses **Run workflow** and approves any environment gate. This is the web publish action. The workflow checks main ancestry, detaches at that exact SHA, verifies and builds it for `/omnibox-ai/`, then deploys its artifact. A push, tag, or release does not trigger deployment.
4. Review the run summary's actual source SHA, retain the workflow URL, and smoke-test the public app plus `https://italomlp.github.io/omnibox-ai/privacy.html#limitations`. Record the deployment outcome; an uploaded build artifact alone is not proof of a live deployment.

The action revisions are pinned to immutable commits read from the official `actions/*` tag refs on October 20, 2026. App builds use Node 24. External action services and the manual deployment have not been exercised merely by local checks.

## 4. Prepare Play internal testing

Starting without Google Play service credentials? Follow the numbered [first-release and credential setup guide](play-first-release-guide.md) before using the optional CLI below. The first signed AAB is uploaded through Console and kept as a draft; service-account setup comes afterwards.

The owner creates the Play Console app as a free English productivity app and uses the [draft listing](play-listing-draft.md). Add `italomlp@gmail.com` as the initial internal tester; after the owner rolls out the test, obtain and verify the tester opt-in link. Supply the hosted privacy page only after it is publicly reachable.

Answer Data safety, ads, content rating, target audience, app access, and other Console declarations from the actual signed app behavior and provider flows. Do not copy a blanket “no data collected/shared” answer from the client-only architecture. Entering cloud prompts, network provider traffic, imported documents, and API credentials needs accurate review. Play may require additional setup or testing for this developer account. No Console declarations or upload acceptance are assumed complete here.

For a new app, create it and upload its first build in Play Console before using the optional CLI. Fastlane's [supply documentation](https://docs.fastlane.tools/actions/upload_to_play_store/) states that initial manual setup and a first uploaded build are prerequisites.

Optional later draft upload, run by the owner after prerequisites and authorization:

```sh
cd tools/play-upload
bundle install
# Keep the service-account JSON outside all repository/worktree directories.
OMNIBOX_PLAY_JSON_KEY=/absolute/private/path/play-service-account.json \
OMNIBOX_PLAY_AAB=/absolute/path/omnibox-ai-0.1.0-alpha.1-android.aab \
FASTLANE_SKIP_UPDATE_CHECK=1 FASTLANE_OPT_OUT_USAGE=1 \
  bundle exec fastlane android upload_internal_draft
```

Use a managed supported Ruby and Bundler; resolve and review the generated `Gemfile.lock` before using the lane. The gem itself is pinned in the Gemfile, but a dependency lockfile has not been resolved in this preparation. [Fastlane's Android setup guide](https://docs.fastlane.tools/getting-started/android/setup/) explains Bundler setup. Fastlane/Ruby installation and service-account credentials are not provided or exercised by this release preparation.

This command performs a real external upload and saves an internal **draft** only. It uses a path from `OMNIBOX_PLAY_JSON_KEY`, never embeds credential JSON, skips store metadata/images/changelogs, disables automatic submission-for-review fallback, and does not promote tracks or complete a rollout. It also requires the key file to be outside the checkout. The owner still reviews the exact package/version/signature and Play warnings, then presses the Console **Review / Start rollout / Send for review** action when ready. Do not run the lane merely to test its syntax.

## 5. Publish GitHub release — owner only

Prepare a draft release for `v0.1.0-alpha.1` targeting the recorded web commit, with the release notes, manifest, verification JSON, scrubbed evidence report, and intended web/mobile artifacts. State the separate mobile source SHA explicitly. Mark it as a prerelease. Inspect every attachment for keys, signing material, personal inputs, and accidental debug output. Do not include the upload keystore or service-account file. The owner presses **Publish release** after final review; this does not deploy Pages.

## Rollback and recovery

- **Web:** owner reruns the manual workflow from `main` using a previously verified full SHA in main history that contains the release checks. This rebuilds/deploys that source. If a dependency/service change makes rebuilding impossible, preserve the failure logs and prepare a reviewed corrective commit; do not silently deploy an untested substitute. Local IndexedDB/localStorage is not rolled back by deploying older code, so check schema compatibility and back up important records first.
- **First web release with no known-good predecessor:** owner disables the Pages site in repository Settings if it must be withdrawn, then prepares and verifies a corrective candidate before publishing again. Preserve the repository and release evidence.
- **Play draft:** owner discards or replaces the unpublished draft in Console. **Active track:** owner stops/halts the affected rollout where Console allows it, then supplies a corrected signed bundle with a higher version code. Do not expect a lower version code to install over a newer one. Preserve signing identity.
- **GitHub:** owner edits or withdraws incorrect release materials; record replaced artifact hashes. Removing a release or changing notes does not undo an installed app or a Pages deployment.
- Record what changed, old/new source SHAs, version codes, artifact digests, and follow-up test results in the incident/release evidence. Never delete local user data as an automatic rollback step.

For the verified inherited-domain/Vercel redirect conflict and exact owner steps, use [first web publication](web-first-release-guide.md) before running the web workflow.
