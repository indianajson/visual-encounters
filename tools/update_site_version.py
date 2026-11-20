#!/usr/bin/env python3
"""Build a deterministic release fingerprint for the static VisualEncounters site.

Run before publishing to GitHub Pages, or run in the GitHub Pages Actions
build step. Uses only the Python standard library. Re-running with unchanged
files is idempotent; changed HTML, JS, images or mod ZIPs yield a new build.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'
VERSION_FILE = ROOT / 'site-version.json'
JS_FILES = ('v21-export.js', 'liberation-editor.js')
ASSET_EXTENSIONS = {'.html', '.js', '.css', '.json', '.zip', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.animation'}
SKIP_TOP = {'tools', 'tests', 'templates', '.git', '.github'}


def canonical_index(content: str) -> str:
    # The release ID must not change simply because we wrote the old ID.
    content, n = re.subn(r'(const CURRENT_BUILD = ")[^"]+("; // VE_SITE_BUILD)',
                         r'\g<1>unbuilt\g<2>', content)
    if n != 1:
        raise SystemExit('Missing/duplicate VE_SITE_BUILD marker in index.html')
    for name in JS_FILES:
        escaped = re.escape(name)
        content = re.sub(r'(?<=src=")' + escaped + r'\?v=[0-9a-f]+(?=")', name, content)
    return content


def source_bytes(path: Path) -> bytes:
    if path == INDEX:
        return canonical_index(path.read_text(encoding='utf-8')).encode('utf-8')
    return path.read_bytes()


def main() -> None:
    html = INDEX.read_text(encoding='utf-8')
    # Fingerprint only deployable website code/resources, not documentation,
    # test fixtures, the generated manifest, or this tool.
    digest = hashlib.sha256()
    paths = sorted(p for p in ROOT.rglob('*') if p.is_file()
                   and p != VERSION_FILE
                   and p.relative_to(ROOT).parts[0] not in SKIP_TOP
                   and p.suffix.lower() in ASSET_EXTENSIONS)
    for path in paths:
        rel = path.relative_to(ROOT).as_posix()
        digest.update(rel.encode('utf-8') + b'\0')
        digest.update(hashlib.sha256(source_bytes(path)).digest())
    build = digest.hexdigest()[:16]

    html, n = re.subn(r'(const CURRENT_BUILD = ")[^"]+("; // VE_SITE_BUILD)',
                      lambda m: m.group(1) + build + m.group(2), html)
    assert n == 1

    # Use the content digest of each script so unchanged scripts can remain
    # cached even when an enemy image or mod archive changes.
    for name in JS_FILES:
        source = (ROOT / name).read_bytes()
        fingerprint = hashlib.sha256(source).hexdigest()[:16]
        rx = r'(?<=src=")' + re.escape(name) + r'(?:\?v=[0-9a-f]+)?(?=")'
        html, replaced = re.subn(rx, name + '?v=' + fingerprint, html)
        if replaced != 1:
            raise SystemExit(f'Expected exactly one script tag for {name}, found {replaced}')

    INDEX.write_text(html, encoding='utf-8')
    VERSION_FILE.write_text(json.dumps({'version': build}, indent=2) + '\n', encoding='utf-8')
    print(f'VisualEncounters release: {build} ({len(paths)} website resources)')


if __name__ == '__main__':
    main()
