/*
 * VisualEncounters - Nebulous Liberations editor integration
 *
 * The Nebulous Liberations mode deliberately reuses the original VisualEncounters
 * toolbar, battle grid, enemy/obstacle selectors, tile properties, and variation
 * controls. There is no JSON/code editing UI.
 *
 * Output schema:
 * return {
 *   minimum_steps_before_encounter = 80,
 *   encounter_chance_per_step = 0.05,
 *   encounters = { ... },
 *   special_encounters = { ... },
 *   bosses = { ... }
 * }
 */
(function () {
    'use strict';

    const SECTION_KEYS = ['encounters', 'special_encounters', 'bosses'];
    const SECTION_LABELS = {
        encounters: 'Encounters',
        special_encounters: 'Special Encounters',
        bosses: 'Boss Encounters'
    };
    const DEFAULT_PATH = '/server/assets/ezlibs-assets/ezencounters/ezencounters.zip';
    const MATRIX_KEYS = ['teams', 'tiles', 'positions', 'obstacle_positions'];

    const state = {
        activeView: 'legacy',
        activeSection: 'encounters',
        selectedEnemyRewardAlias: '',
        selectedEnemyRewardRank: 'default',
        categoryBattlefieldDefaults: { encounters: false, special_encounters: false, bosses: false },
        legacyConfig: null,
        data: {
            minimum_steps_before_encounter: 80,
            encounter_chance_per_step: 0.05,
            encounters: [],
            special_encounters: [],
            bosses: []
        },
        legacyToolbar: null,
        legacyContainer: null,
        legacyLoadInput: null
    };

    function el(tag, attrs, children) {
        const node = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([key, value]) => {
            if (key === 'class') node.className = value;
            else if (key === 'text') node.textContent = value;
            else if (key === 'html') node.innerHTML = value;
            else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
            else if (value !== undefined && value !== null) node.setAttribute(key, String(value));
        });
        (children || []).forEach(child => node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child));
        return node;
    }

    function addStyles() {
        if (document.getElementById('nebulous-editor-styles')) return;
        const css = `
            #ve-main-tabs{display:flex;gap:8px;margin:0 0 14px;padding:10px;background:#292929;border-radius:6px;flex-wrap:wrap}
            #ve-main-tabs button,#ve-nebulous-controls button{border:0;border-radius:4px;padding:9px 14px;cursor:pointer;font-weight:600}
            #ve-main-tabs button{background:#555;color:#fff}#ve-main-tabs button.active{background:#1769d2}
            #ve-nebulous-view[hidden],#ve-legacy-view[hidden]{display:none!important}
            #ve-nebulous-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 12px;margin:0 0 10px;background:#e8e8e8;border-radius:5px;color:#222}
            #ve-nebulous-view .ve-reward-editor{border:1px solid var(--ve-border,#d9dee7);border-radius:8px;padding:14px;margin-top:14px;background:var(--ve-surface,#fff)}
            #ve-nebulous-view .ve-reward-editor h3{margin:0 0 8px;font-size:16px}
            #ve-nebulous-view .ve-reward-editor .ve-reward-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:10px 0}
            #ve-nebulous-view .ve-reward-editor label{display:block;font-size:12px;margin:0}
            #ve-nebulous-view .ve-reward-editor input,#ve-nebulous-view .ve-reward-editor select{box-sizing:border-box;display:block;width:100%;padding:7px;margin-top:4px;border-radius:5px;border:1px solid var(--ve-border,#d9dee7);background:var(--ve-surface,#fff);color:inherit}
            #ve-nebulous-view .ve-reward-editor button{padding:6px 10px;cursor:pointer}
            #ve-nebulous-view .ve-reward-editor .ve-reward-kind{border-top:1px solid var(--ve-border,#d9dee7);margin-top:10px;padding-top:10px}
            #ve-nebulous-view .ve-reward-editor .ve-reward-kind h4{margin:0;font-size:14px}
            #ve-nebulous-view .ve-reward-editor .ve-reward-help{font-size:12px;line-height:1.5;opacity:.8;margin:6px 0}
            #ve-nebulous-view .ve-reward-editor .ve-chip-row{padding:8px 0;border-top:1px dashed var(--ve-border,#d9dee7)}
            #ve-nebulous-view #ve-area-rewards{grid-column:1/-1;margin-top:0}
            body.dark-mode #ve-nebulous-controls{background:#383838;color:#eee}
            #ve-nebulous-controls .ve-section-tabs{display:flex;gap:7px;flex-wrap:wrap}
            #ve-nebulous-controls .ve-schema-note{flex-basis:100%;font-size:12px;line-height:1.45;opacity:.85}
            #ve-nebulous-controls button{background:#ccc;color:#222}
            #ve-nebulous-controls button.active{background:#1769d2;color:white}
            body.dark-mode #ve-nebulous-controls button{background:#555;color:#eee}
            #ve-nebulous-controls button.ve-action{background:#1769d2;color:#fff}
            #ve-nebulous-status{font-size:13px;white-space:pre-wrap;margin:4px 0 10px;padding:8px 10px;border-radius:4px;display:none}
            #ve-nebulous-status.ok{display:block;background:#dff0d8;color:#285b26}
            #ve-nebulous-status.bad{display:block;background:#f2dede;color:#8a2525}
            body.dark-mode #ve-nebulous-status.ok{background:#29432a;color:#d8f2d2}
            body.dark-mode #ve-nebulous-status.bad{background:#4a2929;color:#ffdede}
            /* Nebulous-only workspace: keep the legacy grid and controls intact. */
            #ve-nebulous-view{--ve-border:#d9dee7;--ve-muted:#64748b;--ve-surface:#fff;--ve-soft:#f4f7fb}
            #ve-nebulous-view .toolbar{margin:0 0 12px;align-items:center}
            #ve-nebulous-view .toolbar #variation-select{min-width:180px;max-width:320px;flex:1}
            #ve-nebulous-view #ve-nebulous-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px 20px;padding:16px;margin-bottom:12px;background:var(--ve-surface);border:1px solid var(--ve-border);border-radius:10px}
            #ve-nebulous-view #ve-nebulous-controls .ve-section-tabs{grid-column:1/-1;border-bottom:1px solid var(--ve-border);padding-bottom:12px}
            #ve-nebulous-view #ve-nebulous-controls .ve-schema-note{grid-column:1/-1;margin:0}
            #ve-nebulous-view #ve-nebulous-controls .ve-manual-toggle{display:flex;align-items:center;gap:8px;min-width:0;font-size:13px}
            #ve-nebulous-view #ve-nebulous-controls .ve-manual-toggle select{max-width:100%;padding:7px;border-radius:5px}
            #ve-nebulous-view #ve-nebulous-controls button{min-height:34px}
            #ve-nebulous-view #ve-nebulous-controls .ve-actions{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--ve-border);padding-top:12px}
            #ve-nebulous-view #grid-panel{padding:16px;min-width:0}
            #ve-nebulous-view .ve-workspace{display:grid;grid-template-columns:minmax(0, 1fr) minmax(290px,350px);gap:16px;align-items:start}
            #ve-nebulous-view .ve-battlefield,#ve-nebulous-view .ve-sidebar-section,#ve-nebulous-view .ve-details{background:var(--ve-surface);border:1px solid var(--ve-border);border-radius:9px;padding:14px;min-width:0}
            #ve-nebulous-view .ve-battlefield h2,#ve-nebulous-view .ve-sidebar-section h3,#ve-nebulous-view .ve-details h3{margin:0 0 12px;font-size:17px}
            #ve-nebulous-view .ve-battlefield .ve-help{font-size:12px;color:var(--ve-muted);margin:0 0 12px;line-height:1.5}
            #ve-nebulous-view .ve-grid-scroll{overflow-x:auto;overflow-y:visible;padding:6px 4px 14px;max-width:100%}
            #ve-nebulous-view .ve-grid-scroll #battle-grid{width:max-content;margin-bottom:0}
            #ve-nebulous-view .ve-sidebar{display:flex;flex-direction:column;gap:14px;min-width:0}
            #ve-nebulous-view .ve-sidebar-section .properties-panel{margin:0;padding:0;box-shadow:none}
            #ve-nebulous-view .ve-sidebar-section label,#ve-nebulous-view .ve-details label{display:block;margin:0 0 10px;font-size:13px}
            #ve-nebulous-view .ve-sidebar-section input:not([type=checkbox]),#ve-nebulous-view .ve-sidebar-section select,#ve-nebulous-view .ve-details input:not([type=checkbox]){box-sizing:border-box;width:100%;max-width:100%;padding:8px;min-height:34px;border:1px solid var(--ve-border);border-radius:5px}
            #ve-nebulous-view .ve-sidebar-section input[type=checkbox],#ve-nebulous-view .ve-details input[type=checkbox]{width:auto;margin-right:6px}
            #ve-nebulous-view .ve-details{margin-top:16px}
            #ve-nebulous-view .ve-details .properties-panel{margin:0;padding:0;box-shadow:none}
            #ve-nebulous-view .ve-details .ve-config-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
            #ve-nebulous-view .ve-details h3{margin-top:8px}
            #ve-nebulous-view .ve-details .freedom-mission-options{padding:12px;border-radius:6px}
            #ve-nebulous-view .ve-sidebar-empty{color:var(--ve-muted);font-size:13px;line-height:1.5}
            body.dark-mode #ve-nebulous-view{--ve-border:#525866;--ve-muted:#b8c1ce;--ve-surface:#30343b;--ve-soft:#383d45}
            body.dark-mode #ve-nebulous-view #ve-nebulous-controls{background:var(--ve-surface);color:#eee}
            body.dark-mode #ve-nebulous-view .ve-battlefield,body.dark-mode #ve-nebulous-view .ve-sidebar-section,body.dark-mode #ve-nebulous-view .ve-details{background:var(--ve-surface)}
            @media(max-width:1150px){#ve-nebulous-view .ve-workspace{grid-template-columns:minmax(0,1fr)}#ve-nebulous-view .ve-sidebar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}
            @media(max-width:700px){#ve-nebulous-view #ve-nebulous-controls{grid-template-columns:1fr}#ve-nebulous-view .ve-sidebar{display:flex}#ve-nebulous-view .ve-details .ve-config-grid{grid-template-columns:1fr}#ve-nebulous-view .ve-workspace{gap:10px}}
        `;
        document.head.appendChild(el('style', { id: 'nebulous-editor-styles', text: css }));
    }

    function addUXStyles() {
        if (document.getElementById('ve-ux-styles')) return;
        const css = `
            :root {color-scheme:light}
            body {margin:0;background:#edf2f8;color:#182437;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;image-rendering:auto}
            body.dark-mode {background:#111827;color:#e6ecf5;color-scheme:dark}
            #ve-main-tabs {display:flex;align-items:center;gap:9px;margin:0;border-radius:0;padding:14px clamp(16px,3vw,38px);background:#121e30;color:#eff6ff;border-bottom:1px solid #253652}
            #ve-main-tabs .ve-brand {display:flex;flex-direction:column;gap:3px;min-width:180px;margin-right:auto;line-height:1.2}
            #ve-main-tabs .ve-brand strong {font-size:20px;font-weight:750;letter-spacing:-.025em}
            #ve-main-tabs .ve-brand span {font-size:12px;color:#9aaecb}
            #ve-main-tabs button {background:#22314a;color:#dce8f7;border-radius:8px;min-height:38px;padding:8px 17px;font:inherit;font-weight:650;border:1px solid transparent}
            #ve-main-tabs button.active {background:#2360cb;color:#fff;border-color:#5688ec}
            #ve-main-tabs button:hover:not(.active) {background:#2e4263}
            #ve-legacy-view,#ve-nebulous-view {--ve-bg:#fff;--ve-soft:#f6f8fc;--ve-text:#172439;--ve-muted:#62728b;--ve-line:#dce3ed;--ve-blue:#2164d9;--ve-accent:#eaf2ff;max-width:1850px;margin:0 auto;padding:22px clamp(12px,2vw,34px) 40px}
            body.dark-mode #ve-legacy-view,body.dark-mode #ve-nebulous-view {--ve-bg:#252f40;--ve-soft:#1c2738;--ve-text:#ecf2fb;--ve-muted:#b0c0d3;--ve-line:#43516a;--ve-blue:#78a9ff;--ve-accent:#293b5b}
            #ve-legacy-view .toolbar,#ve-nebulous-view .toolbar {display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:12px 14px;background:var(--ve-bg);color:var(--ve-text);border:1px solid var(--ve-line);border-radius:12px;margin:0 0 14px;box-shadow:0 2px 10px #091d4210}
            #ve-legacy-view .toolbar button,#ve-nebulous-view .toolbar button {font:inherit;font-size:13px;font-weight:650;min-height:36px;padding:7px 12px;border:1px solid var(--ve-line);color:var(--ve-text);background:var(--ve-soft);border-radius:7px;cursor:pointer}
            #ve-legacy-view .toolbar button:hover,#ve-nebulous-view .toolbar button:hover {border-color:var(--ve-blue);background:var(--ve-accent)}
            #ve-legacy-view .toolbar button:disabled,#ve-nebulous-view .toolbar button:disabled {opacity:.5;cursor:not-allowed}
            #ve-legacy-view .toolbar #save-config,#ve-nebulous-view .toolbar #save-config {background:#2360cb;color:white;border-color:#2360cb}
            #ve-legacy-view .toolbar #variation-select,#ve-nebulous-view .toolbar #variation-select {flex:1 1 230px;min-width:160px;max-width:370px;min-height:36px}
            #ve-legacy-view .toolbar > label,#ve-nebulous-view .toolbar > label {margin-left:auto!important;color:var(--ve-text)!important;font-size:13px;display:flex;align-items:center;gap:5px;white-space:nowrap}
            #ve-legacy-view .container,#ve-nebulous-view .container {display:block;max-width:100%;margin:0}
            #ve-legacy-view #grid-panel,#ve-nebulous-view #grid-panel {padding:0!important;box-shadow:none!important;background:transparent!important;border:none!important;min-width:0}
            #ve-legacy-view .ve-workspace,#ve-nebulous-view .ve-workspace {--ve-grid-scale:.85;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(350px,405px)!important;gap:18px!important;align-items:start}
            #ve-legacy-view .ve-battlefield,#ve-nebulous-view .ve-battlefield,#ve-legacy-view .ve-sidebar-section,#ve-nebulous-view .ve-sidebar-section {min-width:0;background:var(--ve-bg)!important;color:var(--ve-text);border:1px solid var(--ve-line)!important;border-radius:13px!important;box-shadow:0 2px 12px #091d4210;padding:17px!important}
            #ve-legacy-view .ve-battlefield,#ve-nebulous-view .ve-battlefield {padding:20px!important}
            #ve-legacy-view .ve-battlefield-heading,#ve-nebulous-view .ve-battlefield-heading {display:flex;flex-wrap:wrap;align-items:center;gap:12px;justify-content:space-between}
            #ve-legacy-view .ve-battlefield-heading h2,#ve-nebulous-view .ve-battlefield-heading h2 {font-size:19px!important;margin:0!important;letter-spacing:-.025em}
            #ve-legacy-view .ve-grid-controls,#ve-nebulous-view .ve-grid-controls {display:flex;align-items:center;gap:8px}
            #ve-legacy-view .ve-zoom-label,#ve-nebulous-view .ve-zoom-label {font-size:12px;color:var(--ve-muted)}
            #ve-legacy-view #ve-grid-zoom,#ve-nebulous-view #ve-grid-zoom {min-height:32px;min-width:72px;padding:5px 8px;border-radius:7px;background:var(--ve-soft);color:var(--ve-text);border:1px solid var(--ve-line)}
            #ve-legacy-view #ve-clear-tile,#ve-nebulous-view #ve-clear-tile {min-height:32px;background:var(--ve-soft);color:var(--ve-text);border:1px solid var(--ve-line);border-radius:7px;padding:5px 10px;cursor:pointer;font:inherit;font-size:12px}
            #ve-legacy-view #ve-clear-tile:disabled,#ve-nebulous-view #ve-clear-tile:disabled {opacity:.45;cursor:not-allowed}
            #ve-legacy-view .ve-grid-help,#ve-nebulous-view .ve-grid-help {font-size:13px;color:var(--ve-muted);line-height:1.55;margin:9px 0 15px;max-width:720px}
            #ve-legacy-view .ve-grid-scroll,#ve-nebulous-view .ve-grid-scroll {max-width:100%;overflow-x:auto!important;overflow-y:visible!important;background:var(--ve-soft);border:1px solid var(--ve-line);border-radius:11px;padding:18px 14px!important;scrollbar-gutter:stable}
            #ve-legacy-view #battle-grid,#ve-nebulous-view #battle-grid {width:max-content;zoom:var(--ve-grid-scale);margin:0!important}
            #ve-legacy-view .tile,#ve-nebulous-view .tile {border-radius:8px!important;transition:border-color .15s ease,box-shadow .15s ease;outline:none}
            #ve-legacy-view .tile::after,#ve-nebulous-view .tile::after {content:attr(data-coordinate);position:absolute;top:3px;left:4px;z-index:7;font:650 12px/1.2 system-ui,sans-serif;color:#172439;background:#eef3f9e8;border:1px solid #aebed4b0;border-radius:4px;padding:3px 5px;pointer-events:none}
            #ve-legacy-view .tile.selected,#ve-nebulous-view .tile.selected {border-color:#2875e4!important;box-shadow:0 0 0 3px #3a8af55c,0 6px 12px #102d5a33!important}
            #ve-legacy-view .tile:focus-visible,#ve-nebulous-view .tile:focus-visible {outline:3px solid #f59e0b;outline-offset:2px}
            #ve-legacy-view .ve-grid-footer,#ve-nebulous-view .ve-grid-footer {display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;color:var(--ve-muted);font-size:12px}
            #ve-legacy-view .ve-team-legend,#ve-nebulous-view .ve-team-legend {display:flex;gap:13px;flex-wrap:wrap}
            #ve-legacy-view .ve-legend-item,#ve-nebulous-view .ve-legend-item {display:inline-flex;align-items:center;gap:6px}
            #ve-legacy-view .ve-legend-item::before,#ve-nebulous-view .ve-legend-item::before {content:'';width:10px;height:10px;border-radius:3px;background:#b6bdc9}
            #ve-legacy-view .ve-legend-red::before,#ve-nebulous-view .ve-legend-red::before {background:#dc4a5d}
            #ve-legacy-view .ve-legend-blue::before,#ve-nebulous-view .ve-legend-blue::before {background:#4174db}
            #ve-legacy-view .ve-sidebar,#ve-nebulous-view .ve-sidebar {position:sticky;top:16px;display:flex!important;flex-direction:column!important;gap:12px;max-height:calc(100vh - 32px);overflow-y:auto;overscroll-behavior:contain;padding:1px 5px 8px 1px;min-width:0;scrollbar-width:thin}
            #ve-legacy-view .ve-inspector-heading,#ve-nebulous-view .ve-inspector-heading {display:flex;align-items:flex-start;gap:11px;margin:0 0 11px}
            #ve-legacy-view .ve-step-number,#ve-nebulous-view .ve-step-number {background:var(--ve-accent);color:var(--ve-blue);font:750 11px/1.2 system-ui,sans-serif;letter-spacing:.05em;min-width:27px;height:27px;border-radius:7px;display:grid;place-items:center}
            #ve-legacy-view .ve-inspector-heading h3,#ve-nebulous-view .ve-inspector-heading h3 {font-size:16px!important;margin:1px 0 3px!important;line-height:1.2}
            #ve-legacy-view .ve-inspector-subtitle,#ve-nebulous-view .ve-inspector-subtitle {font-size:12px;color:var(--ve-muted);line-height:1.45;margin:0}
            #ve-legacy-view .ve-empty-state,#ve-nebulous-view .ve-empty-state {background:var(--ve-soft);border:1px dashed var(--ve-line);padding:13px 14px;border-radius:8px;font-size:13px;color:var(--ve-muted);line-height:1.55;margin:0}
            #ve-legacy-view .ve-empty-state[hidden],#ve-nebulous-view .ve-empty-state[hidden] {display:none!important}
            #ve-legacy-view .ve-tile-section #tile-properties,#ve-nebulous-view .ve-tile-section #tile-properties {margin:0!important;padding:0!important;border:0!important;box-shadow:none!important}
            #ve-legacy-view .ve-tile-section #tile-properties > h3,#ve-nebulous-view .ve-tile-section #tile-properties > h3 {display:none}
            #ve-legacy-view .ve-encounter-section #variation-properties,#ve-nebulous-view .ve-encounter-section #variation-properties {display:block!important;margin:0!important;padding:0!important;box-shadow:none!important}
            #ve-legacy-view .ve-no-encounter #variation-properties,#ve-nebulous-view .ve-no-encounter #variation-properties {display:none!important}
            #ve-legacy-view .ve-sidebar label,#ve-nebulous-view .ve-sidebar label {font:inherit;font-size:12px;line-height:1.45;color:var(--ve-text);display:block;margin:9px 0 4px}
            #ve-legacy-view .ve-sidebar label:has(input[type=checkbox]),#ve-nebulous-view .ve-sidebar label:has(input[type=checkbox]) {display:flex;align-items:center;gap:6px}
            #ve-legacy-view .ve-sidebar input:not([type=checkbox]),#ve-nebulous-view .ve-sidebar input:not([type=checkbox]),#ve-legacy-view .ve-sidebar select,#ve-nebulous-view .ve-sidebar select {width:100%;max-width:100%;min-height:36px;padding:7px 9px;box-sizing:border-box;border-radius:7px;border:1px solid var(--ve-line);background:var(--ve-soft);color:var(--ve-text);font:inherit;font-size:13px;margin-top:4px}
            #ve-legacy-view .ve-sidebar input:focus-visible,#ve-nebulous-view .ve-sidebar input:focus-visible,#ve-legacy-view .ve-sidebar select:focus-visible,#ve-nebulous-view .ve-sidebar select:focus-visible {outline:2px solid var(--ve-blue);outline-offset:1px}
            #ve-legacy-view .ve-inspector-subgroup,#ve-nebulous-view .ve-inspector-subgroup {margin-top:10px;padding-top:8px;border-top:1px solid var(--ve-line)}
            #ve-legacy-view .ve-inspector-subgroup h4,#ve-nebulous-view .ve-inspector-subgroup h4 {margin:6px 0;font-size:13px;color:var(--ve-text)}
            #ve-legacy-view #ve-area-basics summary,#ve-nebulous-view #ve-area-basics summary,#ve-nebulous-view .ve-area-section summary {cursor:pointer;font-weight:700;font-size:13px;padding:8px 0;color:var(--ve-text)}
            #ve-legacy-view .ve-small-help,#ve-nebulous-view .ve-small-help {font-size:12px;color:var(--ve-muted);line-height:1.5;margin:4px 0 10px}
            #ve-nebulous-view .ve-info-note {font-size:12px;line-height:1.5;margin:0 0 8px;background:var(--ve-accent);color:var(--ve-text);border-left:3px solid var(--ve-blue);padding:8px 10px;border-radius:5px}
            #ve-nebulous-view .ve-sidebar .ve-reward-editor {border:none!important;box-shadow:none!important;background:transparent!important;padding:0!important;margin:0!important}
            #ve-nebulous-view .ve-rewards-section .ve-reward-editor > h3 {display:none}
            #ve-nebulous-view .ve-sidebar .ve-reward-editor .ve-reward-kind {margin-top:13px;padding-top:13px}
            #ve-nebulous-view .ve-sidebar .ve-reward-editor .ve-reward-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 9px}
            #ve-nebulous-view .ve-sidebar .ve-reward-editor label {margin:3px 0 6px}
            #ve-nebulous-view .ve-sidebar .ve-reward-editor input,#ve-nebulous-view .ve-sidebar .ve-reward-editor select {margin-top:5px}
            #ve-nebulous-view .ve-area-section {display:block!important}
            #ve-nebulous-view #ve-nebulous-controls {background:var(--ve-bg)!important;color:var(--ve-text)!important;border:1px solid var(--ve-line)!important;border-radius:12px;padding:15px!important;margin:0 0 14px!important;box-shadow:0 2px 10px #091d4210}
            #ve-nebulous-view #ve-nebulous-controls .ve-schema-note {color:var(--ve-muted)!important;font-size:12px}
            #ve-nebulous-view #ve-nebulous-controls button {border-radius:7px;font-weight:650}
            #ve-nebulous-view #ve-nebulous-controls .ve-section-tabs button {padding:9px 13px;background:var(--ve-soft);border:1px solid var(--ve-line);color:var(--ve-text)}
            #ve-nebulous-view #ve-nebulous-controls .ve-section-tabs button.active {background:#2360cb;color:#fff;border-color:#2360cb}
            #ve-nebulous-view #ve-nebulous-controls .ve-actions {border-top:1px solid var(--ve-line);padding-top:10px}
            #ve-nebulous-view #ve-nebulous-controls .ve-actions button.ve-action {background:#2360cb;color:#fff}
            #ve-nebulous-view #ve-encounter-mode-settings {border:1px solid var(--ve-line);background:var(--ve-soft);padding:10px;margin:5px 0;border-radius:8px}
            #ve-nebulous-view .ve-reward-editor .ve-chip-row {border-color:var(--ve-line)}
            #ve-legacy-view .select2-container,#ve-nebulous-view .select2-container {max-width:100%!important}
            body.dark-mode .select2-container--default .select2-selection__rendered {color:#eaf1fc!important}
            @media (max-width:1190px) {
              #ve-legacy-view .ve-workspace,#ve-nebulous-view .ve-workspace {grid-template-columns:minmax(0,1fr)!important}
              #ve-legacy-view .ve-sidebar,#ve-nebulous-view .ve-sidebar {position:static;max-height:none;overflow:visible;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;align-items:start;padding:0}
            }
            @media (max-width:650px) {
              #ve-main-tabs {padding:13px 14px;flex-wrap:wrap}
              #ve-main-tabs .ve-brand {flex-basis:100%;margin-bottom:4px}
              #ve-legacy-view,#ve-nebulous-view {padding:12px 10px 22px}
              #ve-legacy-view .ve-sidebar,#ve-nebulous-view .ve-sidebar {display:flex!important;flex-direction:column;gap:10px}
              #ve-legacy-view .ve-battlefield,#ve-nebulous-view .ve-battlefield {padding:13px!important}
              #ve-legacy-view .ve-grid-scroll,#ve-nebulous-view .ve-grid-scroll {padding:10px!important}
              #ve-legacy-view .ve-grid-footer,#ve-nebulous-view .ve-grid-footer {align-items:flex-start}
              #ve-legacy-view .toolbar > label,#ve-nebulous-view .toolbar > label {margin-left:0!important}
            }
        `;
        document.head.appendChild(el('style', { id: 've-ux-styles', text: css }));
    }

    function status(message, ok) {
        const node = document.getElementById('ve-nebulous-status');
        if (!node) return;
        node.textContent = message;
        node.className = ok ? 'ok' : 'bad';
    }

    function showStatus(message, ok) {
        status(message, ok);
    }

    function setLegacyControlsForMode(isNebulous) {
        document.querySelectorAll('.ve-nebulous-enemy-advanced, .ve-nebulous-encounter-advanced').forEach(field => {
            field.style.display = isNebulous ? '' : 'none';
        });
        ['#load-config', '#save-config', '#clear-all', '#new-config', '#add-variation'].forEach(selector => {
            const node = document.querySelector(selector);
            if (node) node.style.display = isNebulous ? 'none' : '';
        });
        const loadInput = document.getElementById('load-file');
        if (loadInput) loadInput.disabled = isNebulous;
        updateManualControls();
        // Liberation music is configured by the Tiled Liberation Config object.
        // The callback field is not part of the current encounter table schema.
        ['#music-path', '#results-callback'].forEach(selector => {
            const input = document.querySelector(selector);
            if (input && input.closest('label')) input.closest('label').style.display = isNebulous ? 'none' : '';
        });
        // Keep the original Download Mods checkbox available in both modes.
        const downloadMods = document.querySelector('label:has(#download-mods)');
        if (downloadMods) downloadMods.style.display = '';
    }

    function activeEncounter() {
        return state.activeView === 'new' && typeof config !== 'undefined' &&
            currentVariationIndex >= 0 && config.encounters[currentVariationIndex];
    }

    // A checked category override forces manual battlefield authoring for
    // every encounter in that category. Otherwise, each encounter chooses
    // manual or automatic independently.
    function manualEnabled(variation) {
        return manualEnabledForSection(variation, state.activeSection);
    }

    function manualEnabledForSection(variation, section) {
        if (state.categoryBattlefieldDefaults[section]) return true;
        return !!(variation && variation.manual_battlefield_override === true);
    }

    function initializeManualMatrices(variation) {
        MATRIX_KEYS.forEach(key => ensureMatrix(variation, key));
    }

    function updateManualControls() {
        const variation = activeEncounter();
        const health = document.getElementById('ve-encounter-persistent-health');
        const noResults = document.getElementById('ve-encounter-no-results');
        if (health) health.checked = !!(variation && variation.persistent_health);
        if (noResults) noResults.checked = !!(variation && variation.no_results);
        const enabled = manualEnabled(variation);
        const categoryToggle = document.getElementById('ve-category-manual-battlefield');
        if (categoryToggle) categoryToggle.checked = !!state.categoryBattlefieldDefaults[state.activeSection];
        const mode = document.getElementById('ve-encounter-battlefield-mode');
        const categoryForced = !!state.categoryBattlefieldDefaults[state.activeSection];
        if (mode) {
            mode.disabled = !variation || categoryForced;
            mode.value = categoryForced || (variation && variation.manual_battlefield_override === true)
                ? 'manual' : 'automatic';
        }
        // The world-panel terrain is calculated at battle start. For Nebulous
        // missions flip permission is derived from that terrain on the server,
        // never from an authored encounter's saved checkbox state.
        const freedom = document.getElementById('freedom-mission-options');
        if (freedom && !document.getElementById('ve-nebulous-flip-help')) {
            freedom.appendChild(el('p', { id: 've-nebulous-flip-help', class: 've-reward-help', text: 'Nebulous: flipping is automatically enabled ONLY when the player is surrounded by dark panels. Authored flip values are ignored.' }));
        }
        const flipInput = document.getElementById('player-can-flip');
        if (flipInput && state.activeView === 'new') {
            flipInput.checked = false;
            flipInput.disabled = true;
            const wrap = flipInput.closest('label');
            if (wrap) wrap.style.display = 'none';
        }
        const flipLabel = document.getElementById('ve-nebulous-flip-help');
        if (flipLabel) flipLabel.hidden = state.activeView !== 'new';
        if (flipInput && state.activeView !== 'new') {
            flipInput.disabled = false;
            const wrap = flipInput.closest('label');
            if (wrap) wrap.style.display = '';
        }
        const modeNote = document.getElementById('ve-encounter-mode-note');
        if (modeNote) modeNote.textContent = categoryForced
            ? 'Locked: the category-wide manual override is enabled.'
            : 'Choose whether this encounter uses an authored or runtime-generated battlefield.';
        const neutral = document.querySelector('#tile-team option[value="0"]');
        if (neutral) neutral.disabled = state.activeView === 'new';
        ['tile-team', 'tile-type'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.disabled = state.activeView === 'new' && !enabled;
        });
        const note = document.getElementById('ve-manual-note');
        if (note) note.textContent = enabled
            ? 'Manual battlefield: Teams, tiles, enemy positions and obstacles are exported. Player spawn is always editable.'
            : 'Automatic battlefield: Runtime chooses teams, tiles and enemy/obstacle positions. Player spawn is always exported.';
    }

    function ensureMatrix(variation, key) {
        if (!Array.isArray(variation[key])) {
            variation[key] = key === 'teams'
                ? defaultTeamPositions.map(row => [...row])
                : Array.from({ length: 3 }, () => Array(6).fill(key === 'tiles' ? 1 : 0));
        }
        return variation[key];
    }

    function updateTopTabs() {
        document.querySelectorAll('#ve-main-tabs button').forEach(button => {
            button.classList.toggle('active', button.dataset.view === state.activeView);
        });
        document.getElementById('ve-legacy-view').hidden = state.activeView !== 'legacy';
        document.getElementById('ve-nebulous-view').hidden = state.activeView !== 'new';
    }

    function activateSection(section) {
        if (!SECTION_KEYS.includes(section)) return;
        if (state.activeView === 'new' && typeof config !== 'undefined') {
            state.data[state.activeSection] = config.encounters;
        }
        state.activeSection = section;
        config = {
            minimum_steps_before_encounter: state.data.minimum_steps_before_encounter,
            encounter_chance_per_step: state.data.encounter_chance_per_step,
            encounters: state.data[section]
        };
        if (!Array.isArray(config.encounters)) config.encounters = state.data[section] = [];
        refreshSectionTabs();
        refreshEditorForActiveData();
        status(SECTION_LABELS[section] + ' ready. Use the battle grid and existing editor controls to build encounters.', true);
    }

    function refreshSectionTabs() {
        SECTION_KEYS.forEach(section => {
            const button = document.getElementById('ve-section-' + section);
            if (button) {
                button.classList.toggle('active', section === state.activeSection);
                const count = state.data[section] ? state.data[section].length : 0;
                const countNode = button.querySelector('.ve-count');
                if (countNode) countNode.textContent = '(' + count + ')';
            }
        });
    }

    function refreshEditorForActiveData() {
        // All of these are the original VisualEncounters functions and operate on
        // the currently-bound config.encounters array.
        currentVariationIndex = -1;
        selectedTile = null;
        $('#tile-properties').hide();
        $('#variation-properties').show();
        $('#min-steps').val(config.minimum_steps_before_encounter);
        $('#encounter-chance').val(config.encounter_chance_per_step);
        refreshVariationDropdown();
        if (config.encounters.length > 0) {
            selectVariation(0);
        } else {
            $('#variation-select').val('');
            $('#delete-variation').prop('disabled', true);
            $('.tile').removeClass('selected');
            $('.tile-bg,.tile-team,.tile-entity').css('background-image', 'none');
            $('#variation-weight').val('');
            $('#music-path').val('');
            $('#results-callback').val('');
            $('#freedom-mission').prop('checked', false);
            $('#freedom-mission-options').hide();
        }
        refreshSectionTabs();
        updateManualControls();
        updateRewardEditors();
        syncWorkspaceStatus();
    }

    // One shared workspace for both tabs. Original form nodes are MOVED, never
    // copied, so Select2, jQuery listeners, and Lua import/export keep working.
    function groupVariationFields() {
        const variation = document.getElementById('variation-properties');
        if (!variation || variation.querySelector('#ve-area-basics')) return;
        const oldHeadings = Array.from(variation.children).filter(node => node.tagName === 'H3');
        oldHeadings.forEach(node => node.remove());
        const area = el('details', { id: 've-area-basics', class: 've-inspector-subgroup' }, [
            el('summary', { text: 'Area encounter frequency' }),
            el('p', { class: 've-small-help', text: 'Applies to regular random overworld encounters; not the number of runner or liberation battles.' })
        ]);
        const encounter = el('div', { id: 've-battle-options', class: 've-inspector-subgroup' }, [
            el('h4', { text: 'Battle settings' })
        ]);
        ['min-steps', 'encounter-chance'].forEach(id => {
            const field = document.getElementById(id);
            if (field && field.closest('label')) area.appendChild(field.closest('label'));
        });
        ['variation-weight', 'music-path', 'results-callback', 'freedom-mission'].forEach(id => {
            const field = document.getElementById(id);
            if (field && field.closest('label')) encounter.appendChild(field.closest('label'));
        });
        const freedom = document.getElementById('freedom-mission-options');
        if (freedom) encounter.appendChild(freedom);
        const advanced = el('div', { class: 've-nebulous-encounter-advanced ve-inspector-subgroup', style: 'display:none;' }, [
            el('h4', { text: 'Managed battle options (non-Liberation)' }),
            el('label', {}, [el('input', { id: 've-encounter-persistent-health', type: 'checkbox' }), ' Persist HP-recovery battle rewards' ]),
            el('label', {}, [el('input', { id: 've-encounter-no-results', type: 'checkbox' }), ' Exclude encounter from native battle reward processing' ])
        ]);
        encounter.appendChild(advanced);
        variation.appendChild(encounter);
        variation.appendChild(area);
    }

    function createWorkspace(isNebulous) {
        const panel = document.getElementById('grid-panel');
        if (!panel || panel.querySelector('.ve-workspace')) return;
        const heading = panel.querySelector(':scope > h2');
        const grid = document.getElementById('battle-grid');
        const variation = document.getElementById('variation-properties');
        const tile = document.getElementById('tile-properties');
        const statusBox = panel.querySelector(':scope > .status-container');
        if (!heading || !grid || !variation || !tile) return;
        groupVariationFields();
        const areaBasics = document.getElementById('ve-area-basics');
        if (areaBasics) areaBasics.open = !isNebulous;

        const workspace = el('div', { class: 've-workspace' });
        const battlefield = el('section', { class: 've-battlefield', 'aria-label': 'Battlefield editor' });
        const sidebar = el('aside', { class: 've-sidebar', 'aria-label': 'Encounter and tile inspector' });
        const fieldHeader = el('div', { class: 've-battlefield-heading' });
        const gridControls = el('div', { class: 've-grid-controls' });
        const zoom = el('select', { id: 've-grid-zoom', 'aria-label': 'Battlefield zoom', title: 'Battlefield zoom' }, [
            el('option', { value: '0.7', text: '70%' }),
            el('option', { value: '0.85', text: '85%' }),
            el('option', { value: '1', text: '100%' }),
            el('option', { value: '1.15', text: '115%' })
        ]);
        let zoomValue = '0.85';
        try { zoomValue = localStorage.getItem('veGridZoom') || zoomValue; } catch (_) { /* private mode */ }
        if (Array.from(zoom.options).some(item => item.value === zoomValue)) zoom.value = zoomValue;
        zoom.addEventListener('change', () => {
            workspace.style.setProperty('--ve-grid-scale', zoom.value);
            try { localStorage.setItem('veGridZoom', zoom.value); } catch (_) { /* optional preference */ }
        });
        workspace.style.setProperty('--ve-grid-scale', zoom.value);
        gridControls.appendChild(el('label', { class: 've-zoom-label', text: 'Zoom' }));
        gridControls.appendChild(zoom);
        const clearSelection = el('button', { id: 've-clear-tile', type: 'button', text: 'Deselect tile', onClick: () => {
            clearTileSelection();
            syncWorkspaceStatus();
        }});
        gridControls.appendChild(clearSelection);
        fieldHeader.appendChild(heading);
        fieldHeader.appendChild(gridControls);
        battlefield.appendChild(fieldHeader);
        battlefield.appendChild(el('p', { class: 've-grid-help', text: 'Select a tile to edit its team, terrain, or contents. Right-click a tile for quick actions. Arrow keys navigate when a tile is focused.' }));
        const gridScroll = el('div', { class: 've-grid-scroll', role: 'region', 'aria-label': '6 by 3 battlefield, horizontally scrollable' });
        gridScroll.appendChild(grid);
        battlefield.appendChild(gridScroll);
        battlefield.appendChild(el('div', { class: 've-grid-footer' }, [
            el('div', { class: 've-team-legend' }, [
                el('span', { class: 've-legend-item ve-legend-red', text: 'Player side' }),
                el('span', { class: 've-legend-item ve-legend-blue', text: 'Enemy side' }),
                el('span', { class: 've-legend-item ve-legend-neutral', text: 'Neutral' })
            ]),
            el('div', { id: 've-grid-summary', class: 've-grid-summary', role: 'status', text: '6 × 3 · 18 tiles' })
        ]));

        const tileSection = el('section', { class: 've-sidebar-section ve-tile-section' });
        tileSection.appendChild(el('div', { class: 've-inspector-heading' }, [
            el('span', { class: 've-step-number', text: '01' }),
            el('div', {}, [el('h3', { text: 'Tile inspector' }), el('p', { id: 've-selection-summary', class: 've-inspector-subtitle', text: 'No tile selected' })])
        ]));
        tileSection.appendChild(el('p', { id: 've-tile-placeholder', class: 've-empty-state', text: 'Select a tile on the grid to edit its team, tile type, enemy, obstacle, or player spawn.' }));
        tileSection.appendChild(tile);
        const encounterSection = el('section', { class: 've-sidebar-section ve-encounter-section' });
        encounterSection.appendChild(el('div', { class: 've-inspector-heading' }, [
            el('span', { class: 've-step-number', text: '02' }),
            el('div', {}, [el('h3', { text: 'Encounter setup' }), el('p', { id: 've-encounter-summary', class: 've-inspector-subtitle', text: 'Scenario options remain available while editing tiles' })])
        ]));
        encounterSection.appendChild(variation);
        if (isNebulous) {
            const mode = document.getElementById('ve-encounter-mode-settings');
            const battle = variation.querySelector('#ve-battle-options');
            if (mode && battle) battle.insertBefore(mode, battle.firstChild);
        }
        sidebar.appendChild(tileSection);
        sidebar.appendChild(encounterSection);

        if (isNebulous) {
            const rewards = el('section', { class: 've-sidebar-section ve-rewards-section' });
            rewards.appendChild(el('div', { class: 've-inspector-heading' }, [
                el('span', { class: 've-step-number', text: '03' }),
                el('div', {}, [el('h3', { text: 'Battle rewards' }), el('p', { class: 've-inspector-subtitle', text: 'For regular ezencounters and Endless Runner reuse' })])
            ]));
            rewards.appendChild(el('p', { class: 've-info-note', text: 'Nebulous Liberation battles themselves never grant battle rewards; liberation panel loot is separate.' }));
            rewards.appendChild(el('div', { id: 've-encounter-rewards', class: 've-reward-editor' }));
            sidebar.appendChild(rewards);
            const defaults = el('details', { class: 've-sidebar-section ve-area-section' }, [
                el('summary', { text: 'Area-wide reward defaults' }),
                el('p', { class: 've-small-help', text: 'These apply when an encounter has no more-specific rewards. Enemy fallback tables are preserved on import/export.' })
            ]);
            const areaRewards = document.getElementById('ve-area-rewards');
            if (areaRewards) defaults.appendChild(areaRewards);
            sidebar.appendChild(defaults);
        }
        workspace.appendChild(battlefield);
        workspace.appendChild(sidebar);
        panel.appendChild(workspace);
        if (statusBox) panel.appendChild(statusBox);
        enhanceGridAccessibility();
        syncWorkspaceStatus();
    }

    // Restore original nodes before switching modes. Keeps mode-specific DOM
    // intact without duplicating IDs or re-registering input listeners.
    function teardownWorkspace() {
        const panel = document.getElementById('grid-panel');
        const workspace = panel && panel.querySelector('.ve-workspace');
        if (!workspace) return;
        const heading = workspace.querySelector('.ve-battlefield-heading > h2');
        const grid = document.getElementById('battle-grid');
        const variation = document.getElementById('variation-properties');
        const tile = document.getElementById('tile-properties');
        const mode = document.getElementById('ve-encounter-mode-settings');
        const controls = document.getElementById('ve-nebulous-controls');
        if (mode && controls) controls.insertBefore(mode, document.getElementById('ve-manual-note'));
        const areaRewards = document.getElementById('ve-area-rewards');
        if (areaRewards && controls) controls.insertBefore(areaRewards, controls.querySelector('.ve-actions'));
        const statusBox = panel.querySelector(':scope > .status-container');
        [heading, grid, variation, tile].forEach(node => { if (node) panel.insertBefore(node, workspace); });
        workspace.remove();
        if (statusBox) panel.appendChild(statusBox);
    }

    function arrangeNebulousWorkspace() { createWorkspace(true); }
    function restoreLegacyWorkspace() { teardownWorkspace(); }

    function enhanceGridAccessibility() {
        const grid = document.getElementById('battle-grid');
        if (!grid) return;
        grid.querySelectorAll('.tile').forEach(tile => {
            const row = Number(tile.dataset.row), col = Number(tile.dataset.col);
            const coordinate = String.fromCharCode(65 + col) + (row + 1);
            tile.dataset.coordinate = coordinate;
            tile.setAttribute('role', 'button');
            tile.setAttribute('tabindex', '0');
            tile.setAttribute('aria-label', 'Battle tile ' + coordinate);
        });
    }

    function syncWorkspaceStatus() {
        const workspace = document.querySelector((window.__veNebulousMode ? '#ve-nebulous-view' : '#ve-legacy-view') + ' .ve-workspace');
        if (!workspace) return;
        const active = config && config.encounters && config.encounters[currentVariationIndex];
        workspace.classList.toggle('ve-no-encounter', !active);
        const selection = workspace.querySelector('#ve-selection-summary');
        const empty = workspace.querySelector('#ve-tile-placeholder');
        const clear = workspace.querySelector('#ve-clear-tile');
        const encounterSummary = workspace.querySelector('#ve-encounter-summary');
        if (encounterSummary) encounterSummary.textContent = active ? (active.name || 'Selected encounter') + ' · ' + (active.enemies || []).length + ' enemies' : 'Select or add an encounter';
        const selected = !!(active && selectedTile);
        if (selection) selection.textContent = selected ? ('Tile ' + String.fromCharCode(65 + selectedTile.col) + (selectedTile.row + 1) + ' · Row ' + (selectedTile.row + 1) + ', column ' + (selectedTile.col + 1)) : 'No tile selected';
        if (empty) empty.hidden = selected;
        if (clear) clear.disabled = !selected;
        if (active && selectedTile) {
            const node = document.querySelector('.tile[data-row="' + selectedTile.row + '"][data-col="' + selectedTile.col + '"]');
            if (node) node.setAttribute('aria-pressed', 'true');
        }
        document.querySelectorAll('.tile:not(.selected)').forEach(tile => tile.setAttribute('aria-pressed', 'false'));
        const summary = workspace.querySelector('#ve-grid-summary');
        if (summary) {
            const enemies = (active && Array.isArray(active.positions)) ? active.positions.flat().filter(x => Number(x) > 0).length : ((active && active.enemies) || []).length;
            const obstacles = (active && Array.isArray(active.obstacle_positions)) ? active.obstacle_positions.flat().filter(x => Number(x) > 0).length : ((active && active.obstacles) || []).length;
            summary.textContent = '6 × 3 · ' + enemies + ' enemies · ' + obstacles + ' obstacles';
        }
        enhanceGridAccessibility();
    }

    function activateView(view) {
        if (view === state.activeView) return;
        if (state.activeView === 'new') {
            state.data[state.activeSection] = config.encounters;
            state.data.minimum_steps_before_encounter = config.minimum_steps_before_encounter;
            state.data.encounter_chance_per_step = config.encounter_chance_per_step;
        } else {
            state.legacyConfig = config;
        }

        state.activeView = view;
        window.__veNebulousMode = view === 'new';
        if (view === 'new') {
            state.data[state.activeSection] = (state.data[state.activeSection] || []).map(normalizeEncounter);
            config = {
                minimum_steps_before_encounter: state.data.minimum_steps_before_encounter,
                encounter_chance_per_step: state.data.encounter_chance_per_step,
                encounters: state.data[state.activeSection]
            };
            if (!Array.isArray(config.encounters)) config.encounters = state.data[state.activeSection] = [];
            teardownWorkspace();
            state.legacyContainer.parentNode.removeChild(state.legacyContainer);
            state.legacyToolbar.parentNode.removeChild(state.legacyToolbar);
            const root = document.getElementById('ve-nebulous-view');
            root.appendChild(state.legacyToolbar);
            root.appendChild(state.legacyContainer);
            arrangeNebulousWorkspace();
            setLegacyControlsForMode(true);
            refreshEditorForActiveData();
            status('Nebulous Liberations mode. Build encounters with the same visual battle grid and property panels.', true);
        } else {
            restoreLegacyWorkspace();
            config = state.legacyConfig || config;
            const root = document.getElementById('ve-legacy-view');
            root.appendChild(state.legacyToolbar);
            root.appendChild(state.legacyContainer);
            setLegacyControlsForMode(false);
            currentVariationIndex = -1;
            selectedTile = null;
            refreshVariationDropdown();
            if (config.encounters && config.encounters.length) selectVariation(Math.min(0, config.encounters.length - 1));
            updateMainConfigFields();
            createWorkspace(false);
        }
        updateTopTabs();
        syncWorkspaceStatus();
    }

    function luaString(value) {
        return '"' + String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
    }

    function serializeLua(value, depth) {
        const indent = '    '.repeat(depth);
        const childIndent = '    '.repeat(depth + 1);
        const inlineEntryLimit = 112;
        function keyFor(key) {
            if (/^[1-9][0-9]*$/.test(String(key))) return '[' + String(Number(key)) + ']';
            return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : '[' + luaString(key) + ']';
        }

        function primitive(item) {
            if (item === null || item === undefined) return 'nil';
            if (typeof item === 'string') return luaString(item);
            if (typeof item === 'number') {
                if (!Number.isFinite(item)) throw new Error('Cannot export NaN or Infinity.');
                return String(item);
            }
            if (typeof item === 'boolean') return item ? 'true' : 'false';
            return null;
        }

        // Keep short values (enemy definitions, options, and simple arrays) on
        // one line. Larger tables fall back to the structured layout below.
        function inline(item) {
            const scalar = primitive(item);
            if (scalar !== null) return scalar;
            if (Array.isArray(item)) {
                const values = item.map(inline);
                if (values.some(value => value === null)) return null;
                return '{ ' + values.join(', ') + ' }';
            }
            if (item && typeof item === 'object') {
                const entries = Object.entries(item).filter(([, child]) => child !== undefined);
                const values = entries.map(([key, child]) => {
                    const serialized = inline(child);
                    return serialized === null ? null : keyFor(key) + ' = ' + serialized;
                });
                if (values.some(value => value === null)) return null;
                return entries.length ? '{ ' + values.join(', ') + ' }' : '{}';
            }
            return null;
        }

        const scalar = primitive(value);
        if (scalar !== null) return scalar;

        if (Array.isArray(value)) {
            if (!value.length) return '{}';
            // Keep each list entry on its own line. Object entries (enemy and
            // obstacle definitions) and nested arrays (battlefield rows) stay
            // inline, matching the encounter-table layout used by the server.
            const lines = value.map(item => {
                const itemInline = inline(item);
                const useInline = itemInline !== null && itemInline.length <= inlineEntryLimit;
                return childIndent + (useInline ? itemInline : serializeLua(item, depth + 1)) + ',';
            });
            return '{\n' + lines.join('\n') + '\n' + indent + '}';
        }
        if (value && typeof value === 'object') {
            const entries = Object.entries(value).filter(([, item]) => item !== undefined);
            if (!entries.length) return '{}';
            // Encounter/configuration tables use one property per line. Only
            // their contained short records and row arrays are kept inline.
            return '{\n' + entries.map(([key, item]) => {
                return childIndent + keyFor(key) + ' = ' + serializeLua(item, depth + 1) + ',';
            }).join('\n') + '\n' + indent + '}';
        }
        throw new Error('Unsupported encounter value: ' + typeof value);
    }

    // The legacy parser uses `pair.split('=')` and loses nested reward
    // definitions. Parse only data-only Lua literals and local table aliases:
    // no eval, no Lua execution, and no implicit callback/function evaluation.
    function parseNebulousLiteralLua(source) {
        let i = 0;
        const aliases = Object.create(null);
        const fail = message => { throw new Error(message + ' near character ' + i); };
        const skip = () => {
            while (i < source.length) {
                if (/\s/.test(source[i])) { i++; continue; }
                if (source.startsWith('--[[', i)) {
                    const end = source.indexOf(']]', i + 4);
                    if (end < 0) fail('Unterminated comment');
                    i = end + 2; continue;
                }
                if (source.startsWith('--', i)) {
                    const end = source.indexOf('\n', i + 2);
                    i = end < 0 ? source.length : end + 1; continue;
                }
                break;
            }
        };
        const id = () => {
            skip(); const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i));
            if (!match) fail('Expected identifier');
            i += match[0].length; return match[0];
        };
        const stringValue = () => {
            const quote = source[i++]; let result = '';
            while (i < source.length) {
                const c = source[i++];
                if (c === quote) return result;
                if (c !== '\\') { result += c; continue; }
                if (i >= source.length) fail('Unterminated string escape');
                const escaped = source[i++];
                result += ({ n: '\n', r: '\r', t: '\t' })[escaped] ?? escaped;
            }
            fail('Unterminated string');
        };
        function value() {
            skip();
            if (source[i] === '{') return table();
            if (source[i] === '"' || source[i] === "'") return stringValue();
            const number = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(source.slice(i));
            if (number) { i += number[0].length; return Number(number[0]); }
            const name = id();
            if (name === 'true') return true;
            if (name === 'false') return false;
            if (name === 'nil') return null;
            if (Object.prototype.hasOwnProperty.call(aliases, name)) {
                return JSON.parse(JSON.stringify(aliases[name]));
            }
            fail('Unsupported expression or unknown local: ' + name);
        }
        function table() {
            if (source[i] !== '{') fail('Expected table');
            i++; const array = []; const object = {}; let keyed = false;
            while (true) {
                skip();
                if (source[i] === '}') { i++; break; }
                if (i >= source.length) fail('Unterminated table');
                let key;
                if (source[i] === '[') {
                    i++; key = value(); skip();
                    if (source[i++] !== ']') fail('Missing ]');
                    skip(); if (source[i++] !== '=') fail('Missing = after bracket key');
                } else {
                    const start = i;
                    const test = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i));
                    if (test) {
                        i += test[0].length; skip();
                        if (source[i] === '=') { i++; key = test[0]; }
                        else i = start;
                    }
                }
                if (key === undefined) array.push(value());
                else { keyed = true; object[key] = value(); }
                skip();
                if (source[i] === ',' || source[i] === ';') { i++; continue; }
                if (source[i] !== '}') fail('Expected comma or table closing brace');
            }
            if (!keyed) return array;
            array.forEach((v, n) => { object[n + 1] = v; });
            return object;
        }
        while (true) {
            skip(); if (i >= source.length) fail('Missing return statement');
            const directive = id();
            if (directive === 'return') {
                const output = value();
                if (!output || Array.isArray(output) || typeof output !== 'object') fail('Expected return table');
                skip(); if (i < source.length) fail('Unexpected content after return table');
                return output;
            }
            if (directive !== 'local') fail('Only local encounter tables and return are supported');
            const name = id(); skip();
            if (source[i++] !== '=') fail('Expected = in local declaration');
            aliases[name] = value();
            if (!aliases[name] || typeof aliases[name] !== 'object') fail('Expected local table');
            skip(); if (source[i] === ';') i++;
        }
    }

    function validateRewardConfig(rewards, location) {
        if (rewards === undefined || rewards === false) return;
        if (!rewards || typeof rewards !== 'object' || Array.isArray(rewards)) {
            throw new Error('Invalid rewards for ' + location + ': expected a table or false.');
        }
        for (const name of ['money', 'bugfrags', 'health']) {
            const config = rewards[name];
            if (config === undefined || config === false) continue;
            if (!config || typeof config !== 'object' || Array.isArray(config)) {
                if (!Number.isInteger(Number(config)) || Number(config) < 0) throw new Error('Invalid ' + name + ' reward for ' + location);
                continue;
            }
            for (const field of ['base', 'score_multiplier', 'min_score', 'max_score', ...(name === 'health' ? ['threshold'] : [])]) {
                if (config[field] !== undefined && (!Number.isFinite(Number(config[field])) || Number(config[field]) < 0)) {
                    throw new Error('Invalid ' + name + '.' + field + ' for ' + location);
                }
            }
        }
        if (rewards.chips !== undefined) {
            if (!Array.isArray(rewards.chips)) throw new Error('chips must be a list for ' + location);
            for (const chip of rewards.chips) {
                if (!chip || typeof chip.card_id !== 'string' || !chip.card_id.trim() || !chip.code || typeof chip.code !== 'string') {
                    throw new Error('Every chip reward needs a card_id and code for ' + location);
                }
                if (chip.chance !== undefined && (chip.chance < 0 || chip.chance > 1)) throw new Error('Chip chance must be between 0 and 1.');
            }
        }
    }

    function makeRewardEditor(root, label, getCurrent, setCurrent, isEncounter) {
        root.replaceChildren();
        root.appendChild(el('h3', { text: label }));
        root.appendChild(el('p', { class: 've-reward-help', text: 'These rewards apply to ezencounters and Endless Runner battles using this definition. Nebulous Liberations NEVER grants battle rewards; its panel and mission loot are independent. Chip packets do not yet persist inventory.' }));
        const active = isEncounter ? activeEncounter() : state.data;
        if (!active) { root.appendChild(el('p', { text: 'Choose an encounter first.' })); return; }
        const current = getCurrent();
        if (Array.isArray(current.config) && current.config.length === 0) current.config = {};
        const mode = current.disabled ? 'disabled' : (current.config !== undefined ? 'configured' : 'inherit');
        const select = el('select', { 'aria-label': label + ' mode' }, [
            el('option', { value: 'inherit', text: isEncounter ? 'Inherit area / enemy rewards' : 'No area-wide default (use enemy fallback)' }),
            el('option', { value: 'configured', text: 'Configure rewards' }),
            el('option', { value: 'disabled', text: 'Disable rewards for this ' + (isEncounter ? 'encounter' : 'area') })
        ]);
        select.value = mode;
        select.addEventListener('change', () => {
            if (select.value === 'disabled') setCurrent(undefined, true);
            else if (select.value === 'inherit') setCurrent(undefined, false);
            else setCurrent(current.config && typeof current.config === 'object' ? current.config : {}, false);
            saveToLocalStorage(); updateRewardEditors();
        });
        root.appendChild(el('label', {}, ['Reward mode', select]));
        if (mode !== 'configured') return;
        const rewards = current.config && typeof current.config === 'object' ? current.config : {};
        for (const kind of ['money', 'bugfrags', 'health']) {
            const section = el('section', { class: 've-reward-kind' });
            section.appendChild(el('h4', { text: { money: 'Monies', bugfrags: 'BugFrags', health: 'HP recovery' }[kind] }));
            const form = el('div', { class: 've-reward-grid' });
            const previous = rewards[kind] && typeof rewards[kind] === 'object' ? rewards[kind] :
                (typeof rewards[kind] === 'number' ? { base: rewards[kind] } : {});
            const definitions = [
                ['base', 'Base amount', 1],
                ['score_multiplier', 'Per busting score', 1],
                ['min_score', 'Minimum score', 1],
                ['max_score', 'Maximum score', 1]
            ];
            if (kind === 'health') definitions.push(['threshold', 'Only if HP ≤', 1]);
            for (const [key, title, step] of definitions) {
                const input = el('input', { type: 'number', min: '0', step: String(step), placeholder: 'Unspecified' });
                input.value = previous[key] ?? '';
                input.addEventListener('change', () => {
                    const value = input.value.trim();
                    const next = { ...(rewards[kind] && typeof rewards[kind] === 'object' ? rewards[kind] : previous) };
                    if (value === '') delete next[key];
                    else if (!Number.isFinite(Number(value)) || Number(value) < 0) { status('Reward values must be nonnegative numbers.', false); return; }
                    else next[key] = Number(value);
                    if (Object.keys(next).length === 0) delete rewards[kind];
                    else rewards[kind] = next;
                    setCurrent(rewards, false); saveToLocalStorage();
                });
                form.appendChild(el('label', {}, [title, input]));
            }
            section.appendChild(form); root.appendChild(section);
        }
        const chipSection = el('section', { class: 've-reward-kind' });
        chipSection.appendChild(el('h4', { text: 'BattleChip drops' }));
        chipSection.appendChild(el('p', { class: 've-reward-help', text: 'Cards are selected using their package ID and code. Chance: 0–1. No native chip inventory persistence is implemented.' }));
        (Array.isArray(rewards.chips) ? rewards.chips : []).forEach((chip, index) => {
            const row = el('div', { class: 've-chip-row' });
            const grid = el('div', { class: 've-reward-grid' });
            for (const [key, title, kind] of [
                ['card_id', 'Card package ID', 'text'], ['code', 'Code', 'text'],
                ['chance', 'Chance (0–1)', 'number'], ['min_score', 'Minimum score', 'number'], ['max_score', 'Maximum score', 'number']
            ]) {
                const input = el('input', { type: kind, placeholder: 'Unspecified', ...(kind === 'number' ? { min: '0', step: key === 'chance' ? '0.01' : '1' } : {}) });
                input.value = chip[key] ?? '';
                input.addEventListener('change', () => {
                    if (input.value.trim() === '') delete chip[key];
                    else chip[key] = kind === 'number' ? Number(input.value) : input.value.trim();
                    setCurrent(rewards, false); saveToLocalStorage();
                });
                grid.appendChild(el('label', {}, [title, input]));
            }
            row.appendChild(grid);
            row.appendChild(el('button', { type: 'button', onClick: () => {
                rewards.chips.splice(index, 1);
                if (!rewards.chips.length) delete rewards.chips;
                setCurrent(rewards, false); saveToLocalStorage(); updateRewardEditors();
            } }, ['Remove Chip']));
            chipSection.appendChild(row);
        });
        chipSection.appendChild(el('button', { type: 'button', onClick: () => {
            if (!Array.isArray(rewards.chips)) rewards.chips = [];
            rewards.chips.push({ card_id: '', code: '*' });
            setCurrent(rewards, false); saveToLocalStorage(); updateRewardEditors();
        } }, ['Add BattleChip']));
        root.appendChild(chipSection);
    }


    function updateEnemyFallbackRewardEditor() {
        const host = document.getElementById('ve-enemy-fallback-rewards');
        if (!host) return;
        host.replaceChildren();
        host.appendChild(el('h3', { text: 'Enemy fallback rewards' }));
        host.appendChild(el('p', { class: 've-reward-help', text: 'Optional rewards for ordinary managed ezencounters and runner battles, indexed by enemy alias and authored rank (1–8). Nebulous missions never grant native battle rewards.' }));
        const existing = state.data.enemy_rewards && typeof state.data.enemy_rewards === 'object' ? state.data.enemy_rewards : {};
        const aliases = new Set(Object.keys(existing));
        SECTION_KEYS.forEach(section => (state.data[section] || []).forEach(encounter =>
            (encounter.enemies || []).forEach(enemy => { if (enemy && enemy.name) aliases.add(enemy.name); })));
        if (!aliases.size) {
            host.appendChild(el('p', { class: 've-reward-help', text: 'Place an enemy in any encounter to configure its fallback reward rules.' }));
            return;
        }
        const names = Array.from(aliases).sort((a,b) => a.localeCompare(b));
        if (!names.includes(state.selectedEnemyRewardAlias)) state.selectedEnemyRewardAlias = names[0];
        const aliasControl = el('select', { 'aria-label': 'Enemy alias for fallback rewards' }, names.map(name => el('option', { value: name, text: name })));
        aliasControl.value = state.selectedEnemyRewardAlias;
        aliasControl.addEventListener('change', () => { state.selectedEnemyRewardAlias = aliasControl.value; updateEnemyFallbackRewardEditor(); });
        host.appendChild(el('label', {}, ['Enemy alias', aliasControl]));
        const rankControl = el('select', { 'aria-label': 'Enemy fallback rank' }, [
            el('option', { value: 'default', text: 'Default reward (all unspecified ranks)' }),
            ...Array.from({length:8}, (_, i) => el('option', { value: String(i+1), text: 'Rank ' + (i+1) }))
        ]);
        rankControl.value = state.selectedEnemyRewardRank;
        rankControl.addEventListener('change', () => { state.selectedEnemyRewardRank = rankControl.value; updateEnemyFallbackRewardEditor(); });
        host.appendChild(el('label', {}, ['Reward rank', rankControl]));
        const alias = state.selectedEnemyRewardAlias;
        const rank = state.selectedEnemyRewardRank;
        const rootRule = existing[alias];
        const complex = rootRule && typeof rootRule === 'object' && (rootRule.ranks !== undefined || rootRule.default !== undefined);
        // Preserve the exact simple alias-reward table when no rank overrides exist.
        const readConfig = () => {
            if (rank === 'default') return complex ? rootRule.default : rootRule;
            return complex && rootRule.ranks ? rootRule.ranks[rank] : undefined;
        };
        const editor = el('div', { class: 've-reward-editor' });
        makeRewardEditor(editor, (rank === 'default' ? 'Default rewards' : 'Rank ' + rank + ' rewards'),
            () => ({ config: readConfig(), disabled: readConfig() === false }),
            (config, disabled) => {
                if (!state.data.enemy_rewards || typeof state.data.enemy_rewards !== 'object') state.data.enemy_rewards = {};
                const map = state.data.enemy_rewards;
                const desired = disabled ? false : config;
                if (rank === 'default') {
                    if (complex) {
                        const node = map[alias] || {};
                        if (desired === undefined) delete node.default;
                        else node.default = desired;
                        if (!Object.keys(node).length) delete map[alias];
                        else map[alias] = node;
                    } else {
                        if (desired === undefined) delete map[alias];
                        else map[alias] = desired;
                    }
                } else {
                    const original = map[alias];
                    const node = original && typeof original === 'object' && (original.ranks !== undefined || original.default !== undefined)
                        ? original : (original === undefined ? {} : {default: original});
                    if (!node.ranks) node.ranks = {};
                    if (desired === undefined) delete node.ranks[rank];
                    else node.ranks[rank] = desired;
                    if (!Object.keys(node.ranks).length) delete node.ranks;
                    if (!Object.keys(node).length) delete map[alias];
                    else map[alias] = node;
                }
            }, false);
        host.appendChild(editor);
    }

    function updateRewardEditors() {
        const persist = document.getElementById('ve-area-persistent-health');
        if (persist) persist.checked = !!state.data.persistent_health;
        const single = document.getElementById('ve-encounter-rewards');
        if (single) makeRewardEditor(single, 'Encounter Rewards', () => {
            const encounter = activeEncounter();
            return { config: encounter && encounter.rewards, disabled: !!(encounter && (encounter.no_battle_rewards || encounter.rewards === false)) };
        }, (config, disabled) => {
            const encounter = activeEncounter(); if (!encounter) return;
            if (config === undefined) delete encounter.rewards;
            else encounter.rewards = config;
            if (disabled) encounter.no_battle_rewards = true;
            else delete encounter.no_battle_rewards;
        }, true);
        const area = document.getElementById('ve-area-rewards');
        if (area) makeRewardEditor(area, 'Area Default Rewards', () => ({
            config: state.data.rewards === false ? undefined : state.data.rewards,
            disabled: state.data.rewards === false
        }), (config, disabled) => {
            if (disabled) state.data.rewards = false;
            else if (config === undefined) delete state.data.rewards;
            else state.data.rewards = config;
        }, false);
        updateEnemyFallbackRewardEditor();
    }


function validateEnemyRecords(entry) {
    if (!Array.isArray(entry.enemies)) throw new Error('Encounter "' + entry.name + '" needs an enemies list.');
    entry.enemies.forEach((enemy, index) => {
        const location = entry.name + ' enemy #' + (index + 1);
        if (!enemy || typeof enemy.name !== 'string' || !enemy.name.trim()) {
            throw new Error(location + ' needs a valid enemy alias.');
        }
        const rank = Number(enemy.rank ?? 1);
        if (!Number.isInteger(rank) || rank < 1 || rank > 8) {
            throw new Error(location + ': rank must be a 1-based value between 1 and 8.');
        }
        for (const key of ['health', 'starting_hp', 'max_hp']) {
            if (enemy[key] === undefined || enemy[key] === null) continue;
            const number = Number(enemy[key]);
            if (!Number.isInteger(number) || number <= 0) {
                throw new Error(location + ': ' + key + ' must be a positive whole number.');
            }
        }
        if (enemy.scale !== undefined && (!Number.isFinite(Number(enemy.scale)) || Number(enemy.scale) <= 0)) {
            throw new Error(location + ': scale must be a positive number.');
        }
        if (enemy.max_hp !== undefined && enemy.health !== undefined && Number(enemy.health) > Number(enemy.max_hp)) {
            throw new Error(location + ': starting health cannot exceed the requested maximum HP.');
        }
    });
    if (entry.manual_battlefield_override === true && !Array.isArray(entry.positions)) {
        throw new Error('Manual encounter "' + entry.name + '" has no enemy-position matrix.');
    }
    if (entry.manual_battlefield_override === true) {
        if (Array.isArray(entry.teams)) entry.teams.flat().forEach(team => {
            if (team !== 1 && team !== 2) throw new Error(entry.name + ': authored team must be 1 (enemy) or 2 (player).');
        });
        if (Array.isArray(entry.tiles)) entry.tiles.flat().forEach(tile => {
            if (!Number.isInteger(tile) || tile < 1 || tile > 18) throw new Error(entry.name + ': tile type must be 1..18.');
        });
        if (Array.isArray(entry.obstacle_positions)) entry.obstacle_positions.flat().forEach(index => {
            if (!Number.isInteger(index) || index < 0 || index > (entry.obstacles || []).length) {
                throw new Error(entry.name + ': obstacle position references an invalid obstacle index.');
            }
        });
    }
    if (Array.isArray(entry.positions)) {
        entry.positions.forEach((row, rowIndex) => {
            if (!Array.isArray(row) || row.length !== 6) throw new Error(entry.name + ': positions row ' + (rowIndex + 1) + ' must have six columns.');
            row.forEach(index => {
                if (!Number.isInteger(Number(index)) || index < 0 || index > entry.enemies.length) {
                    throw new Error(entry.name + ': position references an invalid enemy index.');
                }
            });
        });
    }
}

    function buildLua() {
        if (state.activeView === 'new') {
            state.data[state.activeSection] = config.encounters;
            state.data.minimum_steps_before_encounter = config.minimum_steps_before_encounter;
            state.data.encounter_chance_per_step = config.encounter_chance_per_step;
        }
        const minSteps = Number(state.data.minimum_steps_before_encounter);
        const chance = Number(state.data.encounter_chance_per_step);
        if (!Number.isInteger(minSteps) || minSteps < 0) throw new Error('Minimum steps must be a whole number greater than or equal to 0.');
        if (!Number.isFinite(chance) || chance < 0 || chance > 1) throw new Error('Encounter chance must be between 0 and 1.');

        const names = new Set();
        SECTION_KEYS.forEach(section => {
            const entries = state.data[section] || [];
            entries.forEach((entry, index) => {
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(SECTION_LABELS[section] + ' entry ' + (index + 1) + ' is invalid.');
                if (!entry.name || typeof entry.name !== 'string') throw new Error(SECTION_LABELS[section] + ' entry ' + (index + 1) + ' needs a name.');
                if (!entry.path || typeof entry.path !== 'string') entry.path = DEFAULT_PATH;
                if (names.has(entry.name)) throw new Error('Duplicate encounter name "' + entry.name + '". Names must be unique across all three categories.');
                names.add(entry.name);
                if (entry.weight !== undefined && !Number.isFinite(Number(entry.weight))) throw new Error('Invalid weight on ' + entry.name + '.');
                validateRewardConfig(entry.rewards, entry.name);
                validateEnemyRecords(entry);
            });
        });
        validateRewardConfig(state.data.rewards, 'area defaults');
        if (state.data.enemy_rewards !== undefined && (typeof state.data.enemy_rewards !== 'object' || Array.isArray(state.data.enemy_rewards) || state.data.enemy_rewards === null)) {
            throw new Error('Enemy reward fallbacks must be a table keyed by enemy alias.');
        }
        const allowedKeys = [
            'name', 'path', 'weight', 'enemies', 'obstacles',
            'positions', 'obstacle_positions', 'player_positions', 'tiles', 'teams',
            'freedom_mission', 'rewards', 'no_battle_rewards',
            'persistent_health', 'no_results'
        ];
        const cleanEntries = section => (state.data[section] || []).map(entry => {
            const clean = {};
            allowedKeys.forEach(key => {
                if (entry[key] !== undefined && (key === 'player_positions' || !MATRIX_KEYS.includes(key) || manualEnabledForSection(entry, section))) {
                    clean[key] = entry[key];
                }
            });
            if (clean.freedom_mission && typeof clean.freedom_mission === 'object') {
                if (!clean.freedom_mission.enabled) delete clean.freedom_mission;
                else clean.freedom_mission = {
                    enabled: true,
                    turn_count: Number(clean.freedom_mission.turn_count ?? clean.freedom_mission.turns ?? 5),
                    player_can_flip: false // server enables only for terrain == surrounded
                };
            }
            return clean;
        });
        const output = {
            minimum_steps_before_encounter: minSteps,
            encounter_chance_per_step: chance,
            ...(state.data.rewards !== undefined ? { rewards: state.data.rewards } : {}),
            ...(state.data.enemy_rewards !== undefined ? { enemy_rewards: state.data.enemy_rewards } : {}),
            ...(state.data.persistent_health !== undefined ? { persistent_health: !!state.data.persistent_health } : {}),
            encounters: cleanEntries('encounters'),
            special_encounters: cleanEntries('special_encounters'),
            bosses: cleanEntries('bosses')
        };
        return '-- Nebulous Liberations encounter table\n-- Generated by VisualEncounters Editor\n-- Terrain is runtime context; omitted matrices use automatic formations.\n\nreturn ' + serializeLua(output, 0) + '\n';
    }

    function downloadText(filename, content) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = el('a', { href: url, download: filename });
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function downloadNebulousMods() {
        const checkbox = document.getElementById('download-mods');
        if (!checkbox || !checkbox.checked) return;
        if (typeof window.downloadModFiles !== 'function') {
            throw new Error('The original mod downloader is unavailable.');
        }
        if (typeof window.showDownloadInfoModal === 'function' && !document.querySelector('.modal-overlay')) {
            window.showDownloadInfoModal();
        }

        // The legacy downloader reads config.encounters. Temporarily provide it
        // with every Nebulous category so it collects all required enemy mods.
        const previousConfig = config;
        const combinedEntries = SECTION_KEYS.reduce((all, section) => {
            const entries = state.data[section] || [];
            entries.forEach(entry => all.push(entry));
            return all;
        }, []);
        config = {
            minimum_steps_before_encounter: state.data.minimum_steps_before_encounter,
            encounter_chance_per_step: state.data.encounter_chance_per_step,
            encounters: combinedEntries
        };
        try {
            return await window.downloadModFiles();
        } finally {
            config = previousConfig;
        }
    }

    function parseImportedLua(source) {
        const parsed = parseNebulousLiteralLua(source);
        if (Array.isArray(parsed.rewards) && parsed.rewards.length === 0) parsed.rewards = {};
        if (Array.isArray(parsed.enemy_rewards) && parsed.enemy_rewards.length === 0) parsed.enemy_rewards = {};
        const result = {
            minimum_steps_before_encounter: Number(parsed.minimum_steps_before_encounter ?? 80),
            encounter_chance_per_step: Number(parsed.encounter_chance_per_step ?? 0.05),
            ...(parsed.rewards !== undefined ? { rewards: parsed.rewards } : {}),
            ...(parsed.enemy_rewards !== undefined ? { enemy_rewards: parsed.enemy_rewards } : {}),
            ...(parsed.persistent_health !== undefined ? { persistent_health: !!parsed.persistent_health } : {}),
            encounters: [], special_encounters: [], bosses: []
        };
        SECTION_KEYS.forEach(section => {
            const values = parsed[section];
            if (!Array.isArray(values)) return;
            result[section] = values.map(value => {
                if (typeof value === 'string') {
                    if (!parsed[value]) throw new Error('Undefined ' + section + ' reference: ' + value);
                    return JSON.parse(JSON.stringify(parsed[value]));
                }
                return value;
            });
        });
        return result;
    }

    function normalizeEncounter(entry) {
        const grid = (source, fallback) => {
            const rows = Array.isArray(source) ? source : [];
            return Array.from({ length: 3 }, (_, row) => {
                const values = Array.isArray(rows[row]) ? rows[row] : [];
                return Array.from({ length: 6 }, (_, col) => values[col] === undefined ? fallback : values[col]);
            });
        };
        const value = Object.assign({
            name: 'NewEncounter', path: DEFAULT_PATH, weight: 10,
            enemies: [], obstacles: [],
            freedom_mission: { enabled: false, turn_count: 5, player_can_flip: false }
        }, entry || {});
        value.enemies = Array.isArray(value.enemies) ? value.enemies : [];
        value.obstacles = Array.isArray(value.obstacles) ? value.obstacles : [];
        if (Array.isArray(value.rewards) && value.rewards.length === 0) value.rewards = {};
        delete value.terrain;
        delete value.music;
        delete value.results_callback;
        // Preserve explicit true/false; imported Lua has no editor metadata,
        // so authored teams indicate a manual encounter on import.
        if (value.manual_battlefield_override !== true && value.manual_battlefield_override !== false) {
            value.manual_battlefield_override = Array.isArray(value.teams);
        }
        // Automatic formations do not author positions in Lua. The editor still
        // needs an editable preview of each enemy, so place up to nine preview
        // markers on the enemy side. This metadata is not exported unless the
        // user switches the encounter to manual battlefield mode.
        if (value.manual_battlefield_override === false && !Array.isArray(value.positions) && value.enemies.length) {
            value.positions = Array.from({ length: 3 }, () => Array(6).fill(0));
            value.enemies.slice(0, 9).forEach((enemy, index) => {
                value.positions[index % 3][3 + Math.floor(index / 3)] = index + 1;
            });
        }
        ['positions', 'obstacle_positions', 'player_positions', 'tiles', 'teams'].forEach(key => {
            if (Array.isArray(value[key])) value[key] = grid(value[key], key === 'tiles' ? 1 : 0);
            else delete value[key];
        });
        // Nebulous Liberation encounters are single-player. Keep the first
        // imported player marker and clear any additional markers, matching
        // the legacy editor's one-player placement behavior.
        if (value.player_positions) {
            let foundPlayer = false;
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 6; col++) {
                    if (Number(value.player_positions[row][col]) > 0) {
                        if (foundPlayer) value.player_positions[row][col] = 0;
                        else foundPlayer = true;
                    }
                }
            }
        }
        if (!value.freedom_mission || typeof value.freedom_mission !== 'object') {
            value.freedom_mission = { enabled: false, turn_count: 5, player_can_flip: false };
        } else {
            value.freedom_mission = {
                enabled: !!value.freedom_mission.enabled,
                turn_count: Number(value.freedom_mission.turn_count ?? value.freedom_mission.turns ?? 5),
                player_can_flip: !!value.freedom_mission.player_can_flip
            };
        }
        return value;
    }

    function loadNebulousData(data) {
        state.categoryBattlefieldDefaults = { encounters: false, special_encounters: false, bosses: false };
        if (Array.isArray(data.rewards) && data.rewards.length === 0) data.rewards = {};
        if (Array.isArray(data.enemy_rewards) && data.enemy_rewards.length === 0) data.enemy_rewards = {};
        state.data = {
            minimum_steps_before_encounter: Number(data.minimum_steps_before_encounter ?? 80),
            encounter_chance_per_step: Number(data.encounter_chance_per_step ?? 0.05),
            ...(data.rewards !== undefined ? { rewards: data.rewards } : {}),
            ...(data.enemy_rewards !== undefined ? { enemy_rewards: data.enemy_rewards } : {}),
            ...(data.persistent_health !== undefined ? { persistent_health: !!data.persistent_health } : {}),
            encounters: Array.isArray(data.encounters) ? data.encounters.map(normalizeEncounter) : [],
            special_encounters: Array.isArray(data.special_encounters) ? data.special_encounters.map(normalizeEncounter) : [],
            bosses: Array.isArray(data.bosses) ? data.bosses.map(normalizeEncounter) : []
        };
        config = {
            minimum_steps_before_encounter: state.data.minimum_steps_before_encounter,
            encounter_chance_per_step: state.data.encounter_chance_per_step,
            encounters: state.data[state.activeSection]
        };
        refreshEditorForActiveData();
        status('Loaded Nebulous Liberations encounter table.', true);
    }

    function buildNebulousControls() {
        const tabs = el('div', { class: 've-section-tabs' }, SECTION_KEYS.map(section =>
            el('button', { id: 've-section-' + section, type: 'button', class: section === state.activeSection ? 'active' : '', onClick: () => activateSection(section) }, [
                SECTION_LABELS[section], ' ', el('span', { class: 've-count', text: '(' + state.data[section].length + ')' })
            ])
        ));
        const importInput = el('input', { id: 've-nebulous-import', type: 'file', accept: '.lua,.txt', style: 'display:none' });
        importInput.addEventListener('change', async event => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            try { loadNebulousData(parseImportedLua(await file.text())); }
            catch (error) { status('Could not load Lua file: ' + error.message, false); }
            importInput.value = '';
        });
        return el('div', { id: 've-nebulous-controls' }, [
            tabs,
            el('div', { class: 've-schema-note', text: 'Runtime terrain determines automatic teams and player positioning. In Nebulous battles, flipping is allowed ONLY when surrounded, regardless of authored Freedom Mission settings. Manual team matrices take precedence over terrain-generated teams; verify them for surrounded formations. Encounter reward tables can be authored here for use in ordinary ezencounters or Endless Runner battles, but Nebulous battle rewards remain disabled. Liberation music comes from the Tiled Liberation Config → Encounter Music reference.' }),
            el('label', { class: 've-manual-toggle' }, [
                el('input', { id: 've-category-manual-battlefield', type: 'checkbox', onChange: event => {
                    state.categoryBattlefieldDefaults[state.activeSection] = event.target.checked;
                    // Category-wide manual mode takes precedence over every
                    // encounter setting, without destroying individual choices.
                    if (event.target.checked) {
                        (state.data[state.activeSection] || []).forEach(initializeManualMatrices);
                    }
                    updateManualControls();
                    updateGrid();
                    saveToLocalStorage();
                } }),
                ' Force manual battlefield for this category'
            ]),
            el('div', { id: 've-encounter-mode-settings', class: 've-encounter-mode-settings' }, [
                el('label', { class: 've-manual-toggle' }, [
                    'Battlefield mode: ',
                    el('select', { id: 've-encounter-battlefield-mode', onChange: event => {
                        const variation = activeEncounter();
                        if (!variation || state.categoryBattlefieldDefaults[state.activeSection]) return;
                        variation.manual_battlefield_override = event.target.value === 'manual';
                        if (manualEnabled(variation)) initializeManualMatrices(variation);
                        updateManualControls();
                        updateGrid();
                        saveToLocalStorage();
                    } }, [
                        el('option', { value: 'manual', text: 'Manual battlefield' }),
                        el('option', { value: 'automatic', text: 'Automatic battlefield' })
                    ])
                ]),
                el('div', { id: 've-encounter-mode-note', class: 've-schema-note' })
            ]),
            el('div', { id: 've-manual-note', class: 've-schema-note' }),
            el('p', { class: 've-schema-note', text: 'Save exports encounters.lua and optionally packages already hosted in mods/. It does NOT compile ezencounters.zip or regenerate character mod HP presets. Keep mods/ezencounters.zip and specialized mod ZIPs synchronized with your live server.' }),
            el('label', { class: 've-manual-toggle' }, [
                el('input', { type: 'checkbox', id: 've-area-persistent-health', onChange: event => {
                    state.data.persistent_health = !!event.target.checked;
                    saveToLocalStorage();
                } }),
                ' Allow persistent HP-recovery rewards in ordinary managed ezencounters battles (not Nebulous)'
            ]),
            el('div', { id: 've-area-rewards', class: 've-reward-editor' }),
            el('div', { id: 've-enemy-fallback-rewards', class: 've-reward-editor' }),
            el('div', { class: 've-actions' }, [
            el('button', { type: 'button', class: 've-action', onClick: () => {
                const name = prompt('Enter a name for the new encounter (letters and numbers only):');
                if (name === null) return;
                const sanitized = name.replace(/\s/g, '').replace(/[^a-zA-Z0-9_]/g, '');
                if (!sanitized) { status('Enter a valid encounter name.', false); return; }
                addNewVariation(sanitized);
                refreshSectionTabs();
            } }, ['Add Encounter']),
            el('button', { type: 'button', onClick: () => importInput.click() }, ['Load Lua']),
            el('button', { type: 'button', class: 've-action', onClick: async () => {
                try {
                    downloadText('encounters.lua', buildLua());
                    const modResult = await downloadNebulousMods();
                    if (modResult && modResult.failed && modResult.failed.length) {
                        status('Exported encounters.lua and required_mods.zip with missing mods: ' + modResult.failed.join(', ') + '. Check the downloader audit inside the ZIP.', false);
                    } else {
                        status('Exported encounters.lua' + (modResult ? ' and copied the hosted mods into required_mods.zip.' : '.'), true);
                    }
                } catch (error) {
                    status('Save failed: ' + error.message, false);
                }
            } }, ['Save Lua + Mods'])
            ]),
            importInput
        ]);
    }


// Mod alias + rank are NOT a unique enemy identifier. Two identical viruses
// can have different current HP, maximum HP, nickname, and sprite scale.
// This is intentionally Nebulous-only; the original legacy editor remains untouched.
function setNebulousEnemyAtTile(variation, row, col, attributes) {
    const blank = () => Array.from({ length: 3 }, () => Array(6).fill(0));
    if (!Array.isArray(variation.positions)) variation.positions = blank();
    if (!Array.isArray(variation.obstacle_positions)) variation.obstacle_positions = blank();
    if (!Array.isArray(variation.player_positions)) variation.player_positions = blank();
    if (!Array.isArray(variation.enemies)) variation.enemies = [];
    const oldIndex = Number(variation.positions[row][col]) || 0;
    const oldEnemy = oldIndex > 0 ? variation.enemies[oldIndex - 1] : null;
    // An imported file may deliberately reuse one enemy record for multiple
    // positions. Copy-on-write preserves every other tile's values.
    const shared = oldIndex > 0 && variation.positions.some((values, r) =>
        values.some((value, c) => (r !== row || c !== col) && Number(value) === oldIndex));
    const updated = { ...(oldEnemy || {}), name: attributes.name, rank: attributes.rank };
    delete updated.starting_hp;
    for (const key of ['nickname', 'health', 'max_hp', 'scale']) {
        if (attributes[key] === undefined) delete updated[key];
        else updated[key] = attributes[key];
    }
    if (oldEnemy && !shared) {
        variation.enemies[oldIndex - 1] = updated;
    } else {
        variation.enemies.push(updated);
        variation.positions[row][col] = variation.enemies.length;
    }
    variation.obstacle_positions[row][col] = 0;
    variation.player_positions[row][col] = 0;
}

function parseEnemyField(id, integer, label) {
    const input = document.getElementById(id);
    if (!input || input.value.trim() === '') return undefined;
    const number = Number(input.value);
    if (!Number.isFinite(number) || number <= 0 || (integer && !Number.isInteger(number))) {
        throw new Error(label + ' must be a positive ' + (integer ? 'whole number.' : 'number.'));
    }
    return number;
}

    function installNebulousEditorOverrides() {
        ['ve-encounter-persistent-health', 've-encounter-no-results'].forEach(id => {
            document.addEventListener('change', event => {
                if (event.target && event.target.id === id && window.__veNebulousMode) {
                    const active = activeEncounter();
                    if (!active) return;
                    const key = id === 've-encounter-persistent-health' ? 'persistent_health' : 'no_results';
                    if (event.target.checked) active[key] = true;
                    else delete active[key];
                    saveToLocalStorage();
                }
            });
        });
        const originalUpdateTileImage = window.updateTileImage;
        const originalUpdateGrid = window.updateGrid;
        const originalUpdateTileFields = window.updateTileFields;
        const originalSaveToLocalStorage = window.saveToLocalStorage;
        const originalCleanupEnemies = window.cleanupEnemies;
        const originalAddNewVariation = window.addNewVariation;
        const originalUpdateEnemyOnTile = window.updateEnemyOnTile;
        let hydratingEnemyFields = false;

        function withPreviewMatrices(variation, callback) {
            const temporary = [];
            const defaults = {
                positions: () => Array.from({ length: 3 }, () => Array(6).fill(0)),
                obstacle_positions: () => Array.from({ length: 3 }, () => Array(6).fill(0)),
                player_positions: () => Array.from({ length: 3 }, () => Array(6).fill(0)),
                tiles: () => Array.from({ length: 3 }, () => Array(6).fill(1)),
                teams: () => defaultTeamPositions.map(row => [...row])
            };
            Object.entries(defaults).forEach(([key, factory]) => {
                if (!Array.isArray(variation[key])) { variation[key] = factory(); temporary.push(key); }
            });
            try { return callback(); }
            finally { temporary.forEach(key => { delete variation[key]; }); }
        }

        window.updateTileImage = function(row, col) {
            if (!window.__veNebulousMode) return originalUpdateTileImage(row, col);
            const variation = config.encounters[currentVariationIndex];
            if (!variation) return;
            return withPreviewMatrices(variation, () => originalUpdateTileImage(row, col));
        };

        window.updateGrid = function() {
            if (!window.__veNebulousMode) return originalUpdateGrid();
            const variation = config.encounters[currentVariationIndex];
            if (!variation) return;
            withPreviewMatrices(variation, () => {
                for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) originalUpdateTileImage(row, col);
            });
        };

        window.updateTileFields = function() {
            if (!window.__veNebulousMode) return originalUpdateTileFields();
            const variation = config.encounters[currentVariationIndex];
            if (!variation) return;
            hydratingEnemyFields = true;
            try {
                withPreviewMatrices(variation, () => originalUpdateTileFields());
            } finally {
                hydratingEnemyFields = false;
            }
            const row = selectedTile && selectedTile.row;
            const col = selectedTile && selectedTile.col;
            const index = row === null || row === undefined || !Array.isArray(variation.positions)
                ? 0 : Number(variation.positions[row][col]) || 0;
            const enemy = index > 0 && variation.enemies ? variation.enemies[index - 1] : null;
            const startHp = document.getElementById('enemy-health');
            if (startHp && enemy && enemy.health == null && enemy.starting_hp != null) startHp.value = String(enemy.starting_hp);
            const maxHp = document.getElementById('enemy-max-hp');
            const scale = document.getElementById('enemy-scale');
            if (maxHp) maxHp.value = enemy && enemy.max_hp != null ? String(enemy.max_hp) : '';
            if (scale) scale.value = enemy && enemy.scale != null ? String(enemy.scale) : '';
        };

        // Hover and right-click handlers in the original grid read all four
        // matrices unconditionally. Automatic Nebulous encounters deliberately
        // omit these matrices, so supply read-safe previews for those handlers.
        const originalUpdateTilePopup = window.updateTilePopup;
        window.updateTilePopup = function(event, tile) {
            if (!window.__veNebulousMode) return originalUpdateTilePopup(event, tile);
            const variation = config.encounters[currentVariationIndex];
            if (!variation) { $('#tile-popup').hide(); return; }
            return withPreviewMatrices(variation, () => originalUpdateTilePopup(event, tile));
        };
        const originalHandleTileRightClick = window.handleTileRightClick;
        window.handleTileRightClick = function(event, tile) {
            if (!window.__veNebulousMode) return originalHandleTileRightClick(event, tile);
            const variation = config.encounters[currentVariationIndex];
            if (!variation) { event.preventDefault(); return; }
            return withPreviewMatrices(variation, () => originalHandleTileRightClick(event, tile));
        };


window.updateEnemyOnTile = function() {
    if (!window.__veNebulousMode) return originalUpdateEnemyOnTile();
    if (hydratingEnemyFields || !selectedTile || currentVariationIndex < 0) return;
    const variation = config.encounters[currentVariationIndex];
    if (!variation) return;
    const name = String(document.getElementById('enemy-type').value || '').trim();
    if (!name) return;
    const def = enemyDictionary.find(item => item.name === name);
    const rank = Number(document.getElementById('enemy-rank').value || (def && def.ranks[0].value) || 1);
    try {
        if (!Number.isInteger(rank) || rank < 1 || rank > 8) throw new Error('Rank must be between 1 and 8.');
        const nickname = String(document.getElementById('enemy-nickname').value || '').trim();
        const attrs = {
            name, rank,
            nickname: nickname || undefined,
            health: parseEnemyField('enemy-health', true, 'Starting HP'),
            max_hp: parseEnemyField('enemy-max-hp', true, 'Maximum HP'),
            scale: parseEnemyField('enemy-scale', false, 'Battle scale')
        };
        if (attrs.health !== undefined && attrs.max_hp !== undefined && attrs.health > attrs.max_hp) {
            throw new Error('Starting HP cannot exceed maximum HP.');
        }
        setNebulousEnemyAtTile(variation, selectedTile.row, selectedTile.col, attrs);
        cleanupEnemies(variation);
        updateTileImage(selectedTile.row, selectedTile.col);
        saveToLocalStorage();
        syncWorkspaceStatus();
    } catch (error) {
        status('Enemy settings: ' + error.message, false);
    }
};

// Legacy fields are handled by the original editor; these two are
// intentionally Nebulous-only. No special handling by enemy name.
['enemy-max-hp', 'enemy-scale'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('change', () => {
        if (window.__veNebulousMode) updateEnemyOnTile();
    });
});

        window.cleanupEnemies = function(variation) {
            if (window.__veNebulousMode && (!variation || !Array.isArray(variation.positions))) return;
            return originalCleanupEnemies(variation);
        };

        window.handleNebulousContentType = function(type) {
            if (!window.__veNebulousMode || !selectedTile || currentVariationIndex < 0) return;
            const variation = config.encounters[currentVariationIndex];
            const row = selectedTile.row, col = selectedTile.col;
            const makeGrid = () => Array.from({ length: 3 }, () => Array(6).fill(0));
            // Liberation team ownership comes from runtime terrain, not editor data.
            // Player spawn is a preference; runtime relocates it if its team is invalid.

            if (type === 'player') {
                if (!Array.isArray(variation.player_positions)) variation.player_positions = makeGrid();
                // Legacy behavior: exactly one player spawn marker.
                for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) variation.player_positions[r][c] = 0;
                variation.player_positions[row][col] = 1;
                if (variation.positions) variation.positions[row][col] = 0;
                if (variation.obstacle_positions) variation.obstacle_positions[row][col] = 0;
            } else if (type === 'enemy' || type === 'obstacle') {
                if (!Array.isArray(variation.positions)) variation.positions = makeGrid();
                if (!Array.isArray(variation.obstacle_positions)) variation.obstacle_positions = makeGrid();
                if (!Array.isArray(variation.player_positions)) variation.player_positions = makeGrid();
                variation.positions[row][col] = 0;
                variation.obstacle_positions[row][col] = 0;
                variation.player_positions[row][col] = 0;
            } else {
                if (variation.positions) variation.positions[row][col] = 0;
                if (variation.obstacle_positions) variation.obstacle_positions[row][col] = 0;
                if (variation.player_positions) variation.player_positions[row][col] = 0;
            }

            if (type === 'enemy') {
                $('#enemy-properties').show(); $('#obstacle-properties').hide();
                $('#enemy-nickname, #enemy-health, #enemy-max-hp, #enemy-scale').val('');
                const firstEnemy = enemyDictionary[0].name;
                $('#enemy-type').val(firstEnemy).trigger('change');
                updateEnemyOnTile();
            } else if (type === 'obstacle') {
                $('#enemy-properties').hide(); $('#obstacle-properties').show();
                const firstObstacle = obstacleDictionary[1].name;
                $('#obstacle-type').val(firstObstacle).trigger('change');
                updateObstacleOnTile();
            } else {
                $('#enemy-properties').hide(); $('#obstacle-properties').hide();
            }
            updateGrid();
            saveToLocalStorage();
        };

        window.addNewVariation = function(name) {
            if (!window.__veNebulousMode) return originalAddNewVariation(name);
            let uniqueName = name, suffix = 1;
            const names = new Set(SECTION_KEYS.flatMap(section => (state.data[section] || []).map(item => item.name)));
            while (names.has(uniqueName)) uniqueName = name + '_' + suffix++;
            const entry = {
                name: uniqueName, path: DEFAULT_PATH, weight: 10, enemies: [], obstacles: [],
                // Legacy-compatible single-player spawn at the center of the
                // player-side 3x3 field (row 2, column 2; Lua indices).
                player_positions: [
                    [0, 0, 0, 0, 0, 0],
                    [0, 1, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0]
                ],
                freedom_mission: { enabled: false, turn_count: 5, player_can_flip: false },
                manual_battlefield_override: false
            };
            if (manualEnabled(entry)) initializeManualMatrices(entry);
            config.encounters.push(entry);
            currentVariationIndex = config.encounters.length - 1;
            refreshVariationDropdown();
            selectVariation(currentVariationIndex);
            updateManualControls();
            saveToLocalStorage();
            status('Added ' + uniqueName + '. Place the player and enemies on the default 3×3 sides, or leave positions empty for runtime generation.', true);
        };

        // The legacy editor registers multiple change handlers for these controls.
        // Capture our Nebulous edits first and stop those handlers from applying
        // legacy-only player deletion and matrix creation rules.
        ['tile-team', 'tile-type', 'content-type'].forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            input.addEventListener('change', event => {
                if (id === 'content-type') {
                    if (!window.__veNebulousMode) return;
                    event.stopImmediatePropagation();
                    window.handleNebulousContentType(input.value);
                    return;
                }
                if (!window.__veNebulousMode) return;
                event.stopImmediatePropagation();
                const variation = activeEncounter();
                if (!variation || !selectedTile || !manualEnabled(variation)) return;
                const key = id === 'tile-team' ? 'teams' : 'tiles';
                const fallback = key === 'tiles' ? 1 : 0;
                const value = Number.parseInt(input.value, 10);
                ensureMatrix(variation, key)[selectedTile.row][selectedTile.col] = Number.isFinite(value) ? value : fallback;
                updateTileImage(selectedTile.row, selectedTile.col);
                saveToLocalStorage();
            }, true);
        });

        const originalSelectVariation = window.selectVariation;
        window.selectVariation = function(index) {
            const result = originalSelectVariation(index);
            updateManualControls();
            if (window.__veNebulousMode) updateRewardEditors();
            syncWorkspaceStatus();
            return result;
        };

        const originalSelectTile = window.selectTile;
        window.selectTile = function(row, col) {
            const result = originalSelectTile(row, col);
            // The old editor hides encounter settings here. Both inspectors
            // must remain independent of the selected tile.
            syncWorkspaceStatus();
            return result;
        };
        const originalClearTileSelection = window.clearTileSelection;
        window.clearTileSelection = function() {
            const result = originalClearTileSelection();
            syncWorkspaceStatus();
            return result;
        };

        document.getElementById('battle-grid').addEventListener('keydown', event => {
            const tile = event.target.closest('.tile');
            if (!tile) return;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault(); tile.click(); return;
            }
            const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
            if (!moves[event.key]) return;
            event.preventDefault();
            const row = Math.min(2, Math.max(0, Number(tile.dataset.row) + moves[event.key][0]));
            const col = Math.min(5, Math.max(0, Number(tile.dataset.col) + moves[event.key][1]));
            const next = document.querySelector('.tile[data-row="' + row + '"][data-col="' + col + '"]');
            if (next) { next.focus(); next.click(); }
        });

        window.saveToLocalStorage = function() {
            if (!window.__veNebulousMode) return originalSaveToLocalStorage();
            state.data[state.activeSection] = config.encounters;
            state.data.minimum_steps_before_encounter = config.minimum_steps_before_encounter;
            state.data.encounter_chance_per_step = config.encounter_chance_per_step;
            localStorage.setItem('nebulousEncounterConfig', JSON.stringify({
                ...state.data, categoryBattlefieldDefaults: state.categoryBattlefieldDefaults
            }));
        };
    }

    function install() {
        if (document.getElementById('ve-main-tabs')) return;
        const toolbar = document.querySelector('body > .toolbar');
        const container = document.querySelector('body > .container');
        if (!toolbar || !container) {
            console.error('[VisualEncounters] Could not locate the original toolbar and editor container.');
            return;
        }
        addStyles();
        addUXStyles();
        installNebulousEditorOverrides();
        window.__veNebulousMode = false;
        state.legacyToolbar = toolbar;
        state.legacyContainer = container;
        state.legacyConfig = config;
        try {
            const saved = localStorage.getItem('nebulousEncounterConfig');
            if (saved) {
                const data = JSON.parse(saved);
                if (Array.isArray(data.enemy_rewards) && data.enemy_rewards.length === 0) data.enemy_rewards = {};
                state.categoryBattlefieldDefaults = Object.fromEntries(SECTION_KEYS.map(section => [
                    section, !!(data.categoryBattlefieldDefaults && data.categoryBattlefieldDefaults[section])
                ]));
                state.data = {
                    minimum_steps_before_encounter: Number(data.minimum_steps_before_encounter ?? 80),
                    encounter_chance_per_step: Number(data.encounter_chance_per_step ?? 0.05),
                    ...(data.rewards !== undefined ? { rewards: data.rewards } : {}),
                    ...(data.enemy_rewards !== undefined ? { enemy_rewards: data.enemy_rewards } : {}),
                    ...(data.persistent_health !== undefined ? { persistent_health: !!data.persistent_health } : {}),
                    encounters: Array.isArray(data.encounters) ? data.encounters.map(normalizeEncounter) : [],
                    special_encounters: Array.isArray(data.special_encounters) ? data.special_encounters.map(normalizeEncounter) : [],
                    bosses: Array.isArray(data.bosses) ? data.bosses.map(normalizeEncounter) : []
                };
            }
        } catch (error) { console.warn('[VisualEncounters] Ignoring invalid Nebulous workspace:', error); }

        const tabs = el('nav', { id: 've-main-tabs', 'aria-label': 'Encounter editor modes' }, [
            el('button', { type: 'button', class: 'active', 'data-view': 'legacy', onClick: () => activateView('legacy') }, ['Legacy Format']),
            el('button', { type: 'button', 'data-view': 'new', onClick: () => activateView('new') }, ['Nebulous Liberations'])
        ]);
        tabs.prepend(el('div', { class: 've-brand' }, [el('strong', { text: 'VisualEncounters' }), el('span', { text: 'Battle builder · Grid + Inspector' })]));
        const legacy = el('section', { id: 've-legacy-view' });
        const nebulous = el('section', { id: 've-nebulous-view', hidden: true });
        const controls = buildNebulousControls();
        const statusNode = el('div', { id: 've-nebulous-status' });

        document.body.insertBefore(tabs, toolbar);
        document.body.insertBefore(legacy, toolbar);
        document.body.insertBefore(nebulous, container.nextSibling);
        legacy.appendChild(toolbar);
        legacy.appendChild(container);
        nebulous.appendChild(controls);
        nebulous.appendChild(statusNode);

        state.legacyLoadInput = document.getElementById('load-file');
        // Start with empty Nebulous categories. The user's legacy configuration
        // remains isolated and is restored when switching back to Legacy Format.
        refreshSectionTabs();
        updateTopTabs();
        updateRewardEditors();
        createWorkspace(false);
    }

    if (window.jQuery) window.jQuery(install);
    else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
    else install();
})();
