"""Headless integration of Attack Workshop's save/export/import flow.

Uses about:blank + injected local sources, since this runner blocks local HTTP/file navigation.
"""
from pathlib import Path
import json, zipfile, io
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto('about:blank')
    page.set_content('<html><body><div id="mount"></div></body></html>')
    page.add_script_tag(content=(root/'vendor/jszip.min.js').read_text())
    page.add_script_tag(content=(root/'attack-workshop.js').read_text())
    page.evaluate('''() => {
      window.customAttacks={};
      window.latestZip=null;
      window.mountWorkshop=()=>window.VisualEncountersAttackWorkshop.mount(
        document.querySelector('#mount'),{
          templates:window.customAttacks,
          onChange:()=>{window.changed=(window.changed||0)+1},
          download:(name,body,type)=>{window.latestZip={name,body,type}},
          loadZip:()=>Promise.resolve(window.JSZip)
        });
      window.mountWorkshop();
    }''')
    mount=page.locator('#mount')
    toggle=mount.locator('.ve-aw-field').filter(has_text='Eight-direction effect animations').locator('input')
    assert not toggle.is_checked()
    mount.locator('.ve-aw-toolbar input[type="text"]').fill('Wave_OW')
    mount.get_by_role('button',name='Save attack',exact=True).click()
    assert 'Saved attack Wave_OW' in mount.locator('.ve-aw-status').inner_text()
    mount.get_by_role('button',name='Export attacks ZIP').click()
    page.wait_for_function("window.latestZip && window.latestZip.name.endsWith('.zip')")
    archive_bytes=bytes(page.evaluate('async()=>Array.from(new Uint8Array(await window.latestZip.body.arrayBuffer()))'))
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as z:
        assert 'ATTACK_WORKSHOP_PROJECT.json' in z.namelist()
        project=json.loads(z.read('ATTACK_WORKSHOP_PROJECT.json'))
        assert project['attacks']['Wave_OW']['eight_direction_animations'] is False
        assert 'idle_animation_prefix' not in project['attacks']['Wave_OW']
    # Roundtrip the user's exported ZIP through the real Workshop importer.
    page.evaluate('''() => {window.customAttacks={};window.latestZip=null;window.mountWorkshop();}''')
    mount.locator('input[type=file]').set_input_files(files=[{'name':'my-attacks.zip','mimeType':'application/zip','buffer':archive_bytes}])
    page.wait_for_function("document.querySelector('#mount .ve-aw-status').textContent.includes('Imported 1 attacks')")
    available=page.evaluate('Object.keys(window.customAttacks)')
    assert available==['Wave_OW'],available
    assert not errors,errors
    browser.close()
print('PASS: real Chromium save, ZIP export, ZIP import, default diagonal-only effect animations')
