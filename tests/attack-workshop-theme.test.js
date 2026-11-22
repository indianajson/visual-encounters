/* Regression: Attack Workshop must use the site's existing light/dark palette. */
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const theme = fs.readFileSync(path.join(root, 'visual-theme.css'), 'utf8');
const css = fs.readFileSync(path.join(root, 'attack-workshop.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(theme, /body\.dark-mode\s*\{/);
for (const token of ['--ve-theme-page','--ve-theme-panel','--ve-theme-text','--ve-theme-muted','--ve-theme-danger','--ve-control-popup-bg','--ve-control-hover-bg','--ve-focus-ring']) {
  assert.equal((theme.match(new RegExp(token + ':', 'g'))||[]).length, 2, `Both light/dark should define ${token}`);
}
const view = '#ve-attack-view';
assert.equal((theme.match(new RegExp(view,'g'))||[]).length, 10, 'Attack view must be covered by each shared control selector and view palette');
assert.match(css, /\.ve-aw-shape-on\s*\{[^}]*var\(--ve-control-selected-bg\)[^}]*var\(--ve-control-selected-text\)/s);
assert.match(css, /\.ve-aw-status\[data-ok="false"\]\s*\{[^}]*var\(--ve-theme-danger\)/s);
assert.match(css, /button:hover:not\(:disabled\)\s*\{[^}]*var\(--ve-control-hover-bg\)/s);
assert.match(css, /@media\s*\(max-width:\s*650px\)/);
// The Attack Workshop must not introduce palette hex codes detached from site theme tokens.
assert.doesNotMatch(css, /#[\da-fA-F]{3,8}\b/, 'Attack Workshop CSS has hardcoded palette colors');
for (const name of ['visual-theme.css','attack-workshop.css']) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex').slice(0,16);
  assert.ok(html.includes(`href="${name}?v=${hash}"`), `Style cache fingerprint missing for ${name}`);
}
console.log('PASS: Attack Workshop uses light/dark tokens, native inputs, focus, hover, contrast states, responsive styles and versioned CSS');
