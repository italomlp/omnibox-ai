# First Google Play alpha: guided owner steps

Use this guide when you have a Play developer account but no Google Play service-account credentials. It prepares OmniBox AI `0.1.0-alpha.1` as an **internal-testing draft**. Console labels can change; follow the matching section and inspect the result before continuing. Nothing in this guide has already created an app, accepted terms, uploaded a bundle, or started testing distribution.

You perform account setup, legal acceptance, credential creation, and the final rollout yourself. Keep JSON credentials, private keys, keystores, and passwords out of chat, Git, issue reports, screenshots, and release attachments. You can complete the first Console upload without a service-account JSON file.

## 1. Collect the release evidence

Open the [release runbook](runbook.md) and locate the signed Android `.aab`, its artifact manifest, source commit, version, upload-certificate fingerprint, and device-test results. Check that the bundle's package is **`com.italomlp.omniboxai`**, its version name is `0.1.0-alpha.1`, and its version code matches the recorded release evidence. Do not substitute an unsigned/debug bundle.

The intended privacy address is [https://italomlp.github.io/omnibox-ai/privacy.html](https://italomlp.github.io/omnibox-ai/privacy.html). It becomes a usable public policy link only after you manually publish Pages and confirm the page opens without signing in. The runbook's Pages section explains the owner-only **Run workflow** action; preparing a file in Git does not publish it.

## 2. Create the free app in Play Console

Sign in to [Play Console](https://play.google.com/console/) with your developer-account owner account. Choose **Home → Create app**, then enter:

| Field | Value |
| --- | --- |
| App name | OmniBox AI |
| Default language | English (United States), `en-US` |
| App or game | App |
| Free or paid | Free |
| Contact email | `italomlp@gmail.com` |

Read the policy/export declarations and Play App Signing terms. **Only you accept them**, then choose **Create app**. Use Productivity when setting the store category. Verify the first uploaded bundle uses `com.italomlp.omniboxai`: package names are permanent and cannot be reused. [Google's create-app instructions](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en) explain creation and package identity.

## 3. Choose Play App Signing and preserve the upload key

When Console asks for signing setup, review **Play App Signing**. For this new app, choose the option for **Google to generate the app signing key**, after you review and accept its terms. Google then uses that key to sign the APKs delivered through Play.

Our separately stored **upload key** signs the `.aab` we send to Play. It is not the Google-generated app signing key and is not the service-account JSON used by the later API upload. Keep its keystore/password backup outside the repository. After the first accepted upload, compare Console's **upload certificate** fingerprint with the recorded local upload fingerprint; separately record the **app signing certificate** fingerprint. They can differ. Do not replace the local upload key merely because the fingerprints differ. If you plan distribution requiring the same signing identity outside Play, review that requirement before choosing Google-generated signing. [Android's signing guide](https://developer.android.com/studio/publish/app-signing) explains the two keys and their responsibilities.

## 4. Prepare truthful app information and the tester list

Use the [draft listing](play-listing-draft.md) for English text, support `italomlp@gmail.com`, Productivity, Free, and the no-ads alpha description. Review the actual signed app before making ads, app access, target audience, content rating, or other declarations. Retain the **NOT LIVE-VERIFIED** inference limitation until a real response is recorded.

For Data safety, examine task/document content sent to chosen providers, API credentials, local records, and third-party behavior. A client-only app is not automatically a “no data collected/shared” app. Do not invent answers or claim encryption, retention, deletion, or provider practices that were not verified. Google currently exempts apps exclusively active on internal testing from the Data safety form; if Console does not require it for this track, record that rather than entering a guessed declaration. Complete accurate declarations before moving to a track that requires them. [Google's Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) defines the scope.

Go to **Test and release → Testing → Internal testing → Testers**. Create/select an email list, add `italomlp@gmail.com`, select that list, and save. This is the tester email, not the service account. A draft does not distribute the app or guarantee an opt-in link; obtain and test the link after your eventual rollout. [Google's internal-testing guide](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en) covers lists and tester access.

## 5. Upload the first signed AAB through Console and save a draft

In **Internal testing → Releases**, choose **Create new release**. Complete signing setup if requested, then upload the reviewed signed `.aab` from step 1. Wait for processing; inspect the package, version code/name, certificate details, and errors. Use `0.1.0-alpha.1` as the release name and the reviewed alpha notes. Select **Save as draft** and confirm the release remains a draft.

**Stop before Start rollout, Publish, or Send for review.** An upload/draft is not a release to testers. If Create new release is disabled, inspect the dashboard's outstanding tasks. Do not accept an unrelated publishing action to get past it. [Google's prepare-release guide](https://support.google.com/googleplay/android-developer/answer/9859348?hl=en) distinguishes saving a draft from rollout.

Confirm the bundle appears in Console's bundle library before setting up CLI access. Fastlane documents that a new app needs initial manual setup and at least one uploaded build before supply can be used. This guide does not promise that all account/API restrictions are cleared merely by saving a draft; diagnose the exact Console/API error if one remains. You do not need the CLI to finish reviewing this first draft. [Fastlane's supply prerequisite](https://docs.fastlane.tools/actions/upload_to_play_store/) is the reason for doing Console first.

## 6. Create a dedicated Cloud project and service account

In [Google Cloud Console](https://console.cloud.google.com/), create/select a dedicated project, for example `OmniBox AI Play Upload`; let Google assign a valid unique project ID. Check the selected project before every action. Open **APIs & Services → Library**, find **Google Play Android Developer API** (Android Publisher, `androidpublisher.googleapis.com`), and enable it. Google no longer requires linking the Play developer account to the Cloud project. [Google's Android Publisher setup](https://developers.google.com/android-publisher/getting_started) describes the current project/API/access sequence.

Open **IAM & Admin → Service Accounts → Create service account**. Name it, for example, `omnibox-play-upload`, record its generated `…@….iam.gserviceaccount.com` email, and finish creation. Skip optional project-role and user-access grants: this uploader needs no broad Cloud Owner, Editor, or project-admin role. Your human account needs permission to create/manage it; that does not mean granting those rights to the uploader. Release rights are granted separately in Play Console in step 8. [Google's service-account creation instructions](https://docs.cloud.google.com/iam/docs/service-accounts-create) describe the optional grants.

## 7. Download the JSON privately

Select that service account → **Keys → Add key → Create new key → JSON → Create**. Move the downloaded file to a private directory outside every repository/worktree, for example `/home/italo/.config/omnibox-ai/play/service-account.json`. Restrict the directory/file to your user (typically directory mode `700`, file mode `600`) and keep a secure backup. The full JSON contains a private key; do not paste it into chat or embed it in the browser app. [Google's key-management instructions](https://docs.cloud.google.com/iam/docs/keys-create-delete) cover creation and storage.

If your organization blocks key creation, stop and have its administrator review the approved authentication approach; do not disable policy as a workaround. This existing lane expects a JSON file path. A leaked key needs revocation/replacement in Cloud, not merely deletion from a local folder or Git history.

## 8. Grant app-level Play testing access only

Back in **Play Console → Users and permissions → Invite new users**, enter the service-account email from step 6. Under **App permissions**, add only OmniBox AI / `com.italomlp.omniboxai`. Grant **View app information (read-only)** and **Release apps to testing tracks**. Leave Account permissions and production/admin/financial/store-management rights off, then invite/save the user.

Play's testing-release permission covers testing tracks generally; it is not an internal-only or draft-only credential boundary. Our lane fixes `track: internal` and `release_status: draft`. Do not grant **Release to production, exclude devices, and use Play App Signing**. The owner manages testers in Console, so the current upload-only lane does not need **Manage testing tracks and edit tester lists**. If permissions fail, check the specific missing operation rather than granting Admin or account-wide access. [Google's permission definitions](https://support.google.com/googleplay/android-developer/answer/9844686?hl=en) explain their scope.

## 9. Validate credentials, then optionally upload a later draft from CLI

Use a managed Ruby supported by Fastlane (currently Ruby 3.2+, preferably 3.3+) and Bundler on your own machine. The checked-in [Gemfile](../../tools/play-upload/Gemfile) pins Fastlane **2.241.1**. Run the following from the checkout containing this tooling; review and retain the generated `Gemfile.lock` before proceeding. Dependencies have not yet been resolved/validated by this guide. [Fastlane's setup guide](https://docs.fastlane.tools/getting-started/android/setup/) explains the Ruby/Bundler prerequisite.

```sh
cd /home/italo/dev/me/omnibox-ai/tools/play-upload
ruby --version
bundle --version
bundle install
bundle exec fastlane --version
export OMNIBOX_PLAY_JSON_KEY=/home/italo/.config/omnibox-ai/play/service-account.json
FASTLANE_SKIP_UPDATE_CHECK=1 FASTLANE_OPT_OUT_USAGE=1 \
  bundle exec fastlane run validate_play_store_json_key \
  json_key:"$OMNIBOX_PLAY_JSON_KEY"
```

This authentication check contacts Google; it does not upload a bundle or prove every package permission. Keep its logs private and scrub them before sharing. [Fastlane's credential-validation action](https://docs.fastlane.tools/actions/validate_play_store_json_key/) describes that check. Confirm the first Console upload succeeded and app-level access is assigned before attempting supply.

The first draft is already in Console, so there is no reason to re-upload identical bytes. For a later revised bundle, use an unused higher version code and record fresh verification/hashes. Resolve an existing outstanding draft in Console before creating another release. After your explicit decision to make the external draft upload, run:

```sh
OMNIBOX_PLAY_JSON_KEY=/home/italo/.config/omnibox-ai/play/service-account.json \
OMNIBOX_PLAY_AAB=/absolute/path/to/reviewed-signed-unused-version.aab \
FASTLANE_SKIP_UPDATE_CHECK=1 FASTLANE_OPT_OUT_USAGE=1 \
  bundle exec fastlane android upload_internal_draft
```

The existing [lane](../../tools/play-upload/fastlane/Fastfile) fixes package `com.italomlp.omniboxai`, internal track, and draft status. It skips listing/images/changelogs, keeps changes unsent for review, and disables automatic review-submission fallback. Do not replace this command with generic `fastlane supply` defaults. After it returns, inspect Console to verify the resulting draft and retained version; an error is not evidence of upload success. No CLI command in this guide has been run with credentials by the preparation agent.

## 10. Review the draft; you own the final rollout

Review the exact bundle, notes, tester list, signing details, warnings, required declarations, and device evidence. Follow the Console preview to understand the next action. **Only you press Start rollout / Publish / Send for review** when ready. These actions can distribute the app or submit changes; none is authorized merely by creating a draft. Internal testing does not establish eligibility for public production; follow any account-specific requirements Google displays. Record the resulting status/link after your action, then use the opt-in link as the selected tester. Keep GitHub release publication and Pages deployment separate owner actions.

## Pending checkpoints at handoff

- No Google Play service-account JSON has been supplied or configured; CLI authentication/upload is blocked until steps 6–9 are completed by you.
- App creation, signing-terms acceptance, first Console AAB acceptance, and draft status require your Console confirmation; this document does not claim them completed.
- Verify the public privacy URL after your manual Pages publish before submitting it as a hosted policy.
- Confirm the actual signed artifact, fingerprint, source hashes, device results, Ruby/Bundler setup, and dependency lockfile using the release evidence; do not treat this guide as their validation.
- Live inference remains **NOT LIVE-VERIFIED** unless a later report records an actual response. Final review/rollout and publication remain yours.
