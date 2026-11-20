# Visual Encounters — automatic browser update handling

## What changed

- The browser/tab title displays `VisualEncounters Editor — v<build ID>`, using the exact ID from `site-version.json`. `tools/update_site_version.py` updates this automatically on each publish and excludes the generated title from the release fingerprint so builds remain deterministic.

- `index.html` checks `site-version.json` using a fresh, timestamped request and `cache: 'no-store'`.
- On a **new page visit**, if the published site has a newer build, the browser loads the HTML under a new `?ve_build=` URL. This bypasses the old cached index page.
- The editor's `v21-export.js` and `liberation-editor.js` URLs have individual content hashes (`?v=`), so changed JavaScript is fetched while unchanged JS can stay cached.
- Downloads of `mods/*.zip`, the V2.1 base battle ZIP, and the example OW animation are versioned **on demand**. The large mod library is not fetched every time someone opens the page.
- A **currently open editing tab** sees an optional update notice on returning to the tab or within about two minutes. It does not automatically reload and throw away unsaved edits.
- Site version checks fail open when offline, if GitHub Pages deployment is in progress, or if the manifest is unavailable.

## How to publish (critical)

**Each release must regenerate the release manifest**. If you publish a new site without running the version generator, the browser cannot detect the new release.

### Option A: GitHub Pages published from a branch (your existing setup)

1. Update the site files as usual.
2. In the repository root, run `python tools/update_site_version.py` (or `py tools/update_site_version.py` on Windows).
3. Commit and push **both** `index.html` and `site-version.json` with the changed files.
4. After GitHub Pages deploys the new commit, visits automatically check for and load the published release.

### Option B: fully automatic on each push (GitHub Actions Pages)

1. Review `templates/deploy-pages.yml.example` and copy it to `.github/workflows/deploy-pages.yml`.
2. In GitHub repository settings, navigate to **Pages → Build and deployment → Source → GitHub Actions**.
3. Push changes to `main`. The workflow runs the version generator as part of the publish build. No version bump command is required locally.
4. If your Pages branch isn't `main`, adapt the workflow trigger.

**Do not enable a second competing Pages workflow without reconciling the existing one.** This sample is opt-in and is not installed as an active workflow.

## Troubleshooting

- **First install:** browsers that cached a pre-patch `index.html` cannot run the new updater until they receive it. They may need one hard refresh or to wait for the previous cached HTML to expire. Future releases update automatically.
- **Cache still appears old:** confirm `site-version.json` is deployed, is returning a JSON object with `version`, and that the `index.html` `CURRENT_BUILD` value matches the manifest in the *same* release.
- **Changes in already open tabs:** automatic forced reload is intentionally disabled to preserve unsaved editing work. Use the "Load new version" notice.
- **Very recent deployment:** GitHub Pages/CDN edges may not have fully propagated yet. A new URL bypasses a local cached response but cannot force an origin to serve files before publication completes.
- **Images:** existing images may be cached by URL; new image filenames or asset URL versioning are appropriate for replaced images. Main HTML/JS and mod package freshness is covered by this patch.
- **If migrating to a host with custom response headers:** serve HTML and `site-version.json` with `Cache-Control: no-cache`, and immutable hashed assets with long-lived caching. GitHub Pages does not support project-configurable response headers.

## Validation

Run `python tools/update_site_version.py` twice without changing resources: the generated build ID and `index.html` must remain identical. Changing any site HTML/JS/mod ZIP/image produces a new release build. Tests in `tests/cache-release.test.js` validate the manifest, script fingerprints, and local versioned mod fetches.
