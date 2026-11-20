# Visual Encounters — Browser title release version

The single website HTML page, `index.html`, now shows the exact 16-character
release ID in the browser tab: `VisualEncounters Editor — v<release-id>`.

## Install

1. Copy all files from this patch into the root of your Visual Encounters
   repository, retaining the directory structure.
2. Run your usual `publish.bat` or `publish.sh` from the repository root.
   Those scripts already invoke `tools/update_site_version.py` before commit.
3. Commit and push. The version generator updates `index.html` and
   `site-version.json` in the same release.

For a manual publish, run `py tools/update_site_version.py` on Windows or
`python3 tools/update_site_version.py` on Linux/macOS before staging your
final commit. Do not type or edit the version hash manually.

## Implementation

- Static HTML `<title>` displays the exact version even before JavaScript runs.
- Version is the content-derived 16-character release ID already used by
  the site's cache invalidation, NOT an independent semantic version number.
- `canonical_index()` normalizes the generated title before computing the
  content hash, preventing an endless version-update loop.
- `tests/cache-release.test.js` verifies the title matches the manifest.
- There is only one HTML page; the Legacy, V2.1 and Workshop tabs share it.

## Validation

- Python updater run twice with identical results.
- `node tests/cache-release.test.js` passed.
- `node tests/v21-regression.test.js` passed.
- ZIP integrity verified.
