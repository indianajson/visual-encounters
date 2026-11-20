# Visual Encounters V2.1 — verified nested ZIP/mod exporter

**Install:** Extract this modified-files archive over your Visual Encounters repository root, preserving folders. Do not extract `mods/ezencounters.zip` or `mods/ezencounters-v21-base.zip`: those two files are ZIP assets hosted by the site.

Then run your existing `publish.bat` / `publish.sh`. The release version and cache URLs have already been updated in this package; the publisher will refresh them again if anything else changed.

In the V2.1 editor, choose `Nebulous Liberations`, `EZEncounters`, or `Endless Runner`, enter your exact base area ID, and click **Download V2.1 drop-in ZIP**. Keep **Include hosted character mod ZIPs** on for a self-contained dependency copy. The new **Additional character mod ZIPs** picker allows local mods/overrides not present on the site.

The downloaded *outer* ZIP installs to the ONB server root with the Lua encounter file, the appropriate nested battle ZIP, nested character mod ZIPs, `EXPORT_MANIFEST_V21.json`, and `INSTALL_V21_MISSION.md`. Don't unpack the inner ZIPs.

For Liberations, Tiled mission objects (Bot Config, Encounter Config, boss links, etc.) and separate OW enemy template modules remain your responsibility. See `V21_EXPORT_AUDIT.md`.

An optional server-side compatibility patch is in its **own** archive. Only apply it if your current `liberations/panel_encounters.lua` still validates `enemy.rank` as `0..7`, because the uploaded client package uses indices `1..8`.

**Offline verification:**

```bash
node tests/v21-regression.test.js
node tests/v21-export.test.js
node tests/v21-bundle-integration.test.js
node tests/cache-release.test.js
node tests/theme-settings.test.js
```

Live ONB validation is still needed for character loading, native HP and Tiled mission behavior.
