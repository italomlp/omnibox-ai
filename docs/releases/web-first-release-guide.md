# First web alpha publication: resolve the inherited Pages redirect

Nothing here has been published by an agent. The owner retains the final **Run workflow** action. The web application and its exact-source archive are prepared; account-level routing must be corrected before the intended URL can serve it.

## What was verified

On October 20, 2026:

- `https://italomlp.github.io/omnibox-ai/` returned a GitHub HTTP 301 redirect to `http://www.italomlp.dev/omnibox-ai/`.
- `https://www.italomlp.dev/omnibox-ai/` reached Vercel, redirected through `/omnibox-ai` to `/en/omnibox-ai`, and returned HTTP 404. Its TLS connection is valid; this is a routing issue, not a browser certificate warning to bypass.
- The account-site repository `italomlp/italomlp.github.io` has a legacy Pages configuration with custom domain `www.italomlp.dev`, source branch `master`, source path `/`. Its current default branch is `main`.
- The OmniBox repository has no custom domain (`cname=null`) and therefore inherits that account-site domain. It is configured for Actions publishing, has no deployment, and HTTPS enforcement currently returns `The certificate does not exist yet`.

No account-site, Vercel, DNS, custom-domain or global settings were modified. Merely running the OmniBox publish workflow will not repair the inherited redirect to the Vercel 404 path.

## Owner steps for the originally selected GitHub Pages URL

1. Open the account-site [Pages settings](https://github.com/italomlp/italomlp.github.io/settings/pages). Confirm that `www.italomlp.dev` is the stale GitHub Pages custom-domain association you want removed. This changes where account/project `github.io` links redirect; do not remove it if you intentionally still need that association.
2. Remove that **GitHub Pages custom-domain association** and save. Check whether GitHub removes the `CNAME` file from its configured publishing branch (`master`); do not leave a stale file that will restore the association on the next legacy build. Do not delete the repository, change the actual domain's DNS, or alter the Vercel project. The existing portfolio is served by Vercel and does not require this stale GitHub Pages association, but the owner must approve the redirect change.
3. Open [OmniBox Pages settings](https://github.com/italomlp/omnibox-ai/settings/pages). Keep publishing source **GitHub Actions**, with no custom domain. Confirm GitHub now reports the intended `https://italomlp.github.io/omnibox-ai/` location and enable **Enforce HTTPS** when available. Before the first deployment a GitHub 404 is expected; a redirect to `www.italomlp.dev` means the old association still applies. Allow time for caches/provisioning rather than bypassing browser warnings.
4. Once ready to publish, open [Publish tested web commit](https://github.com/italomlp/omnibox-ai/actions/workflows/pages.yml), choose workflow branch **main**, click **Run workflow**, and set `tested_commit_sha` to:

   ```text
   d52f081051139777fa7f1f6aa2bebc7ef1fd9499
   ```

   This commit was clean-installed, linted, tested (85 application tests and 5 manifest checks), strict-compiled and built at `/omnibox-ai/`. Later documentation merges do not invalidate it: it remains a main ancestor and the workflow checks that ancestry before building exactly this SHA.
5. Wait for the selected workflow to finish. Open its deployment URL over HTTPS. Verify Workbench, all six tool routes, Library, settings, and `privacy.html#limitations`. Confirm the banner says `0.1.0-alpha.1 · Early alpha` and there are no missing asset requests. Do not enter provider keys or share the site while the URL is HTTP, redirects to the portfolio, or fails certificate validation.
6. Use the verified public privacy URL in the [Play first-release guide](play-first-release-guide.md). Web publication is separate from Play internal rollout and publishing the GitHub prerelease.

If you intentionally need to keep the account-site redirect, stop before step 2. A separate repository custom domain or hosting project is needed instead; that also requires building for the chosen URL base path and validating it. The prepared workflow uses `/omnibox-ai/` and must not be assumed suitable for a new custom-domain root. No such alternative domain, DNS change or production host was provisioned without your choice.

## After publication

Check **Enforce HTTPS** once GitHub finishes provisioning. Keep API credentials out of public issues and screenshots. For rollback, manually deploy a previously tested main SHA; if withdrawing the very first release, disable only the OmniBox Pages site, not the existing portfolio or account-site repository.

[GitHub: custom domains for Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages) · [GitHub: securing Pages with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
