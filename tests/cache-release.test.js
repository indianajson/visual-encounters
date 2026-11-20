// Dependency-free smoke test for GitHub Pages release checking and assets.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'site-version.json'), 'utf8'));
assert.match(manifest.version, /^[a-f0-9]{16}$/);
assert.match(html, new RegExp(`const CURRENT_BUILD = "${manifest.version}"; // VE_SITE_BUILD`));
assert.ok(
  html.includes(`<title>VisualEncounters Editor — v${manifest.version}</title> <!-- VE_SITE_TITLE -->`),
  'browser tab title includes the exact generated build ID'
);
for (const filename of ['v21-export.js', 'liberation-editor.js']) {
  const fingerprint = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, filename))).digest('hex').slice(0, 16);
  assert.ok(html.includes(`src="${filename}?v=${fingerprint}"`), `${filename} has the latest hash`);
}
const lib = fs.readFileSync(path.join(root, 'liberation-editor.js'), 'utf8');
assert.match(lib, /window\.veVersionedUrl\(baseFile\)/);
assert.match(lib, /window\.veVersionedUrl\(modUrl\)/);
assert.match(html, /window\.veVersionedUrl\(url\)/);
const match = html.match(/<!-- VE_RELEASE_BOOTSTRAP_START[^>]*-->\s*<script>([\s\S]*?)<\/script>/);
assert.ok(match, 'release bootstrap exists');
function runBoot(newVersion) {
  let replaced = null;
  const location = {
    protocol: 'https:', origin: 'https://indianajson.github.io',
    href: 'https://indianajson.github.io/visual-encounters/index.html',
    replace(url) { replaced = url; }, assign() {}
  };
  const sandbox = {
    URL, Date,
    location,
    window: { location },
    document: {
      baseURI: location.href, hidden: false,
      addEventListener() {}, getElementById() { return null; }
    },
    setInterval() {},
    fetch: async url => {
      assert.match(url, /site-version\.json\?_=/);
      return {ok:true, json: async () => ({version:newVersion})};
    }
  };
  vm.runInNewContext(match[1], sandbox, {filename:'VE_RELEASE_BOOTSTRAP'});
  const asset = sandbox.window.veVersionedUrl('mods/ezencounters.zip');
  assert.ok(asset.includes(`ve_build=${manifest.version}`));
  return new Promise(resolve => setImmediate(() => resolve(replaced)));
}
(async () => {
  assert.equal(await runBoot(manifest.version), null, 'current site does not reload');
  const url = await runBoot('0123456789abcdef');
  assert.ok(url && url.includes('ve_build=0123456789abcdef'), 'old site redirects to a new query URL');
  console.log('PASS: release manifest, fingerprints, versioned mod URLs, navigation');
})().catch(e => { console.error(e); process.exitCode = 1; });
