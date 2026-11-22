# Visual Encounters — split Attack & Enemy Workshops

Extract this archive at the **root of the existing Visual Encounters repository**. It includes complete changed files, the independent Attack Workshop JavaScript/CSS, the updated Enemy Template Workshop, release cache fingerprints, docs and regression tests. Unchanged hosted mod ZIPs and web assets are intentionally not included in this smaller patch.

Top navigation: **Attack Template Workshop** (edit phase attacks) and **Enemy Template Workshop** (assign attacks, movement policies, OW/battle HP). **V2.1 format** remains the separate battle encounter editor.

Save an attack and export **Attack Workshop ZIP**. Save an enemy and export **All Enemy Templates ZIP**. Extract both *outer* ZIPs into the server root; keep image and animation resources in their existing `/server/assets/...` directory. New Lua registries auto-load the generated custom registries. Tiled Bot Configs still choose which enemies spawn.

For the matching server runtime source and **optional** independent battle-HP handoff, install/merge the server patch separately. Do not overwrite the recent optimized `instance.lua` with a snapshot from Nov 20.

After copying files, run the site's existing publisher to update deployment/cache versions. To check locally with Node.js:

```
node tests/attack-workshop.test.js
node tests/cache-release.test.js
node tests/theme-settings.test.js
node tests/v21-export.test.js
node tests/v21-package-catalog.test.js
node tests/v21-regression.test.js
```

Read `TEMPLATE_WORKSHOPS_GUIDE.md` for schema, phase example and all runtime limitations.
