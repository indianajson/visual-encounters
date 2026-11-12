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
    const DEFAULT_PATH = '/server/assets/ezlibs-assets/ezencounters/ezencounters.zip'; // import fallback only; export uses a mission-scoped path
    const MATRIX_KEYS = ['teams', 'tiles', 'positions', 'obstacle_positions'];

    const state = {
        activeView: 'legacy',
        activeSection: 'encounters',
        selectedEnemyRewardAlias: '',
        selectedEnemyRewardRank: 'default',
        templates: {},
        categoryBattlefieldDefaults: { encounters: false, special_encounters: false, bosses: false },
        legacyConfig: null,
        data: {
            area_id: '',
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
            #ve-nebulous-view #ve-area-rewards, #ve-nebulous-view #ve-enemy-fallback-rewards, #ve-nebulous-view #ve-encounter-rewards, #ve-nebulous-view .ve-reward-editor, #ve-nebulous-view #ve-encounter-persistent-health, #ve-nebulous-view #ve-encounter-no-results{display:none!important}
            #ve-nebulous-view .ve-mission-name{display:flex;flex-direction:column;gap:5px;font-weight:650;min-width:270px}
            #ve-nebulous-view .ve-mission-name input{padding:9px 11px;border:1px solid #b7c8e3;border-radius:7px;min-width:245px;font:inherit}
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

            #ve-nebulous-view #ve-global-controls,#ve-nebulous-view .ve-template-editor{margin:0 0 16px;padding:16px 20px;border:1px solid var(--ve-border);border-radius:13px;background:var(--ve-surface);color:var(--ve-text)}
            #ve-nebulous-view #ve-global-controls summary{cursor:pointer;font-weight:700;font-size:15px;padding:5px 0}
            #ve-nebulous-view .ve-template-editor h2{font-size:20px;margin:0 0 6px}
            #ve-nebulous-view .ve-template-toolbar{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:14px 0}
            #ve-nebulous-view .ve-template-toolbar label{display:grid;gap:5px;min-width:170px;flex:1}
            #ve-nebulous-view .ve-template-toolbar input,#ve-nebulous-view .ve-template-toolbar select,#ve-nebulous-view .ve-template-fields input,#ve-nebulous-view .ve-template-fields select{box-sizing:border-box;width:100%;padding:9px;border:1px solid var(--ve-border);border-radius:7px;background:var(--ve-surface);color:inherit}
            #ve-nebulous-view .ve-template-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:12px 16px}
            #ve-nebulous-view .ve-template-fields label{display:grid;gap:5px;font-size:13px}
            #ve-nebulous-view .ve-template-toolbar button{border:1px solid var(--ve-border);border-radius:6px;padding:9px;background:var(--ve-soft);color:inherit;cursor:pointer}
            #ve-nebulous-view #ve-nebulous-controls .ve-schema-note{max-width:1040px}
            #ve-nebulous-view #ve-nebulous-controls{padding:14px 18px}
            #ve-nebulous-view #ve-nebulous-controls .ve-actions{grid-column:1/-1;grid-row:2;border:0;padding:0}
            #ve-nebulous-view #ve-nebulous-controls .ve-section-tabs{grid-row:1}
            #ve-nebulous-view #ve-nebulous-controls>.ve-schema-note{grid-row:auto;font-size:12px}
            #ve-nebulous-view #ve-global-controls #ve-area-basics{display:block;margin-top:12px}
            #ve-nebulous-view #ve-global-controls #ve-area-basics>summary{font-size:13px}
            #ve-nebulous-view .ve-template-editor[hidden],#ve-nebulous-view .container[hidden],#ve-nebulous-view .toolbar[hidden]{display:none!important}
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
            /* Template workshop: grouped authoring on the left, live visual preview on the right. */
            #ve-nebulous-view .ve-template-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(345px,440px);align-items:start;gap:17px}
            #ve-nebulous-view .ve-template-primary{min-width:0;display:flex;flex-direction:column;gap:14px}
            #ve-nebulous-view .ve-template-card{min-width:0;padding:16px;border:1px solid var(--ve-line);background:var(--ve-bg);border-radius:12px}
            #ve-nebulous-view .ve-template-card h3{font-size:16px;margin:0 0 7px}
            #ve-nebulous-view .ve-template-card>.ve-small-help{margin:0 0 14px}
            #ve-nebulous-view .ve-template-fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
            #ve-nebulous-view .ve-template-fields label,#ve-nebulous-view .ve-template-card label{color:var(--ve-text);font-size:12px;line-height:1.45}
            #ve-nebulous-view .ve-template-fields label:has(input[type=checkbox]){display:flex;gap:10px;align-items:center;justify-content:flex-start}
            #ve-nebulous-view .ve-template-fields input[type=checkbox]{width:18px;height:18px}
            #ve-nebulous-view .ve-template-preview-column{min-width:0;position:sticky;top:16px}
            #ve-nebulous-view .ve-template-mini-row{display:flex;align-items:end;flex-wrap:wrap;gap:10px;margin:8px 0 12px}
            #ve-nebulous-view .ve-template-mini-row label{display:flex;flex:1 1 95px;flex-direction:column;gap:4px;min-width:70px}
            #ve-nebulous-view .ve-template-mini-row input,#ve-nebulous-view .ve-template-mini-row select{min-height:35px;width:100%;box-sizing:border-box;padding:7px;border:1px solid var(--ve-line);background:var(--ve-soft);color:var(--ve-text);border-radius:7px}
            #ve-nebulous-view .ve-shape-stage{display:flex;justify-content:safe center;align-items:flex-start;overflow:auto;border:1px solid var(--ve-line);border-radius:11px;background:var(--ve-soft);padding:16px 10px;margin:8px 0}
            /* World-space display: the enemy stays at (0,0) in the middle of the viewport.
               The authored mask is plotted at each cell's exported X/Y offset without
               changing the mask, the user's offsets, or the Lua template. */
            #ve-nebulous-view .ve-shape-board{--ve-shape-size:46px;display:grid;gap:5px;position:relative;flex:0 0 auto}
            /* The marker is not a mask cell and cannot be selected or exported. */
            #ve-nebulous-view .ve-shape-enemy-marker{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:42px;height:42px;box-sizing:border-box;border:2px solid #a78bfa;border-radius:7px;background:rgba(124,58,237,.16);box-shadow:0 0 0 2px rgba(167,139,250,.15);pointer-events:none;z-index:2;display:flex;justify-content:center;align-items:flex-start}
            #ve-nebulous-view .ve-shape-enemy-marker span{display:block;margin-top:2px;padding:2px 3px;border-radius:3px;background:#6941c6;color:#fff;font-size:9px;font-weight:800;letter-spacing:.02em;line-height:1}
            #ve-nebulous-view .ve-shape-cell{width:46px;height:46px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:0;border:1px solid #b7c7df;background:var(--ve-bg);color:var(--ve-muted);border-radius:7px;cursor:pointer;padding:0}
            #ve-nebulous-view .ve-shape-cell span{font-weight:700;font-size:18px;line-height:1.2}
            #ve-nebulous-view .ve-shape-cell small{font-size:9px;line-height:1.2}
            #ve-nebulous-view .ve-shape-cell.on{background:#2360cb;color:#fff;border-color:#2360cb}
            #ve-nebulous-view .ve-shape-cell.origin{outline:2px dashed #f59e0b;outline-offset:1px}
            #ve-nebulous-view .ve-shape-cell:hover,#ve-nebulous-view .ve-shape-cell:focus-visible{box-shadow:0 0 0 3px #4c91ed66}
            #ve-nebulous-view .ve-shape-info{margin-top:7px}
            #ve-nebulous-view .ve-template-advanced summary{font-size:13px;font-weight:700;color:var(--ve-text);cursor:pointer;padding:7px 0}
            #ve-nebulous-view .ve-template-advanced label{display:flex;flex-direction:column;gap:5px;margin-top:8px}
            #ve-nebulous-view .ve-template-advanced input{box-sizing:border-box;padding:8px;width:100%;background:var(--ve-soft);color:var(--ve-text);border:1px solid var(--ve-line);border-radius:7px}
            #ve-nebulous-view .ve-sprite-stage{padding:0;background:#121e32;border:2px dashed #536f94;border-radius:11px;overflow:hidden;line-height:0}
            #ve-nebulous-view .ve-sprite-stage.dragover{border-color:#fbbf24;background:#1b3353}
            #ve-nebulous-view .ve-sprite-stage canvas{display:block;max-width:100%;width:100%;height:auto;image-rendering:pixelated}
            #ve-nebulous-view .ve-template-playback{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:10px 0}
            #ve-nebulous-view .ve-template-playback button,#ve-nebulous-view .ve-template-playback select,#ve-nebulous-view .ve-template-sample button,#ve-nebulous-view .ve-template-advanced button{border:1px solid var(--ve-line);background:var(--ve-soft);color:var(--ve-text);border-radius:7px;padding:8px;min-height:35px;cursor:pointer;font-size:12px}
            #ve-nebulous-view .ve-template-playback .ve-template-inline-check{display:flex;align-items:center;gap:5px}
            #ve-nebulous-view .ve-template-playback .ve-template-inline-check input{width:16px;height:16px;margin:0}
            #ve-nebulous-view .ve-preview-file-label{display:flex;flex-direction:column;gap:7px;font-weight:650}
            #ve-nebulous-view .ve-preview-file-label input{width:100%;max-width:100%;font-size:12px}
            #ve-nebulous-view .ve-template-sample{margin:10px 0}
            #ve-nebulous-view .ve-template-primary-button{background:#2360cb;color:#fff;border-color:#2360cb}
            #ve-nebulous-view .ve-preview-caption{margin:6px 0 12px;min-height:30px}
            @media(max-width:1060px){#ve-nebulous-view .ve-template-workspace{grid-template-columns:1fr}#ve-nebulous-view .ve-template-preview-column{position:static;order:-1}}
            @media(max-width:650px){#ve-nebulous-view .ve-template-fields{grid-template-columns:1fr}#ve-nebulous-view .ve-shape-board{--ve-shape-size:37px}#ve-nebulous-view .ve-shape-cell{width:37px;height:37px}#ve-nebulous-view .ve-shape-enemy-marker{width:32px;height:33px}#ve-nebulous-view .ve-shape-enemy-marker span{font-size:7px}#ve-nebulous-view .ve-shape-cell small{font-size:8px}#ve-nebulous-view .ve-template-card{padding:12px}}
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
        // The V2.1 exporter produces its own deployment bundle and optionally
        // copies hosted character mods. The legacy download checkbox is not a
        // second unrelated download action in this mode.
        const downloadMods = document.querySelector('label:has(#download-mods)');
        if (downloadMods) downloadMods.style.display = isNebulous ? 'none' : '';
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
            : 'Choose authored or generated terrain; enemy positions are always taken from the grid.';
        const neutral = document.querySelector('#tile-team option[value="0"]');
        if (neutral) neutral.disabled = state.activeView === 'new';
        ['tile-team', 'tile-type'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.disabled = state.activeView === 'new' && !enabled;
        });
        const note = document.getElementById('ve-manual-note');
        if (note) note.textContent = enabled
            ? 'Manual battlefield: Enemy positions, teams, tiles and obstacles are exported. Player spawn remains editable.'
            : 'Automatic battlefield: Enemy positions are always exported from the grid. The runtime still generates terrain teams, tiles and obstacle positions.';
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
        const templatePanel = document.getElementById('ve-template-editor');
        if (templatePanel) {
            templatePanel.hidden = true;
            const panel = document.querySelector('#ve-nebulous-view > .container');
            const tools = document.querySelector('#ve-nebulous-view > .toolbar');
            if (panel) panel.hidden = false;
            if (tools) tools.hidden = false;
            const tab = document.getElementById('ve-template-tab');
            if (tab) tab.classList.remove('active');
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
            el('span', { class: 've-step-number', text: '02' }),
            el('div', {}, [el('h3', { text: 'Selected tile · Combatant' }), el('p', { id: 've-selection-summary', class: 've-inspector-subtitle', text: 'No tile selected' })])
        ]));
        tileSection.appendChild(el('p', { id: 've-tile-placeholder', class: 've-empty-state', text: 'Select a tile on the grid to edit its team, tile type, enemy, obstacle, or player spawn.' }));
        tileSection.appendChild(tile);
        const encounterSection = el('section', { class: 've-sidebar-section ve-encounter-section' });
        encounterSection.appendChild(el('div', { class: 've-inspector-heading' }, [
            el('span', { class: 've-step-number', text: '01' }),
            el('div', {}, [el('h3', { text: 'Encounter configuration' }), el('p', { id: 've-encounter-summary', class: 've-inspector-subtitle', text: 'Scenario options remain available while editing tiles' })])
        ]));
        encounterSection.appendChild(variation);
        if (isNebulous) {
            const mode = document.getElementById('ve-encounter-mode-settings');
            const battle = variation.querySelector('#ve-battle-options');
            if (mode && battle) battle.insertBefore(mode, battle.firstChild);
        }
        sidebar.appendChild(encounterSection);
        sidebar.appendChild(tileSection);
        if (isNebulous) {
            const global = document.getElementById('ve-global-controls');
            const frequency = variation.querySelector('#ve-area-basics');
            if (global && frequency) global.insertBefore(frequency, global.querySelector('#ve-area-rewards') || null);
        }

        if (isNebulous) {
            const rewards = el('section', { class: 've-sidebar-section ve-rewards-section' });
            rewards.appendChild(el('div', { class: 've-inspector-heading' }, [
                el('span', { class: 've-step-number', text: '03' }),
                el('div', {}, [el('h3', { text: 'Encounter rewards · Optional' }), el('p', { class: 've-inspector-subtitle', text: 'For regular ezencounters and Endless Runner reuse' })])
            ]));
            rewards.appendChild(el('p', { class: 've-info-note', text: 'Nebulous Liberation battles themselves never grant battle rewards; liberation panel loot is separate.' }));
            rewards.appendChild(el('div', { id: 've-encounter-rewards', class: 've-reward-editor' }));
            sidebar.appendChild(rewards);
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
        const globalPanel = document.getElementById('ve-global-controls');
        if (areaRewards && globalPanel) globalPanel.appendChild(areaRewards);
        const statusBox = panel.querySelector(':scope > .status-container');
        const globalFrequency = document.querySelector('#ve-global-controls #ve-area-basics');
        if (globalFrequency && variation) variation.appendChild(globalFrequency);
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

        const templatePanel = document.getElementById('ve-template-editor');
        if (templatePanel) templatePanel.hidden = true;
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
            state.legacyContainer.hidden = false;
            state.legacyToolbar.hidden = false;
            setLegacyControlsForMode(true);
            refreshEditorForActiveData();
            status('Nebulous Liberations mode. Build encounters with the same visual battle grid and property panels.', true);
        } else {
            restoreLegacyWorkspace();
            state.legacyContainer.hidden = false;
            state.legacyToolbar.hidden = false;
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


// V2.1 always exports authored enemy positions, even for automatic terrain.
// Older automatic encounter files had enemies without positions; migrate those
// once to deterministic grid slots on the enemy side, preserving their order.
function ensureEnemyPositions(entry) {
    if (Array.isArray(entry.positions)) return entry.positions;
    if (!Array.isArray(entry.enemies)) entry.enemies = [];
    const positions = Array.from({ length: 3 }, () => Array(6).fill(0));
    if (entry.enemies.length > 9) {
        throw new Error((entry.name || 'Encounter') + ': cannot automatically position more than nine enemies on the 3×3 enemy side. Place them explicitly before export.');
    }
    entry.enemies.forEach((enemy, index) => {
        positions[index % 3][3 + Math.floor(index / 3)] = index + 1;
    });
    entry.positions = positions;
    return positions;
}

// Remove enemy entries no longer referenced on the grid and renumber every
// remaining reference. Keeping this per encounter prevents ghost viruses and
// leaves duplicate enemy instances with distinct HP/scale independent.
function compactEnemyReferences(entry) {
    const positions = ensureEnemyPositions(entry);
    if (positions.length !== 3 || positions.some(row => !Array.isArray(row) || row.length !== 6)) {
        throw new Error((entry.name || 'Encounter') + ': enemy positions must be a 3×6 matrix.');
    }
    const used = new Set();
    for (const row of positions) for (const raw of row) {
        const index = Number(raw);
        if (!Number.isInteger(index) || index < 0 || index > entry.enemies.length) {
            throw new Error((entry.name || 'Encounter') + ': enemy-position index ' + raw + ' does not match an enemy entry.');
        }
        if (index > 0) used.add(index);
    }
    const remap = new Map();
    const retained = [];
    entry.enemies.forEach((enemy, index) => {
        if (used.has(index + 1)) {
            remap.set(index + 1, retained.length + 1);
            retained.push(enemy);
        }
    });
    entry.positions = positions.map(row => row.map(value => Number(value) ? remap.get(Number(value)) : 0));
    entry.enemies = retained;
    return entry;
}

function validateEnemyRecords(entry) {
    if (!Array.isArray(entry.enemies) || entry.enemies.length === 0) {
        throw new Error('Encounter "' + entry.name + '" needs at least one enemy placed on the grid before V2.1 export.');
    }
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
        for (const modifier of ['attack_multiplier', 'defense_multiplier']) {
            if (enemy[modifier] !== undefined && (!Number.isFinite(Number(enemy[modifier])) || Number(enemy[modifier]) < 0)) {
                throw new Error(location + ': ' + modifier + ' must be non-negative.');
            }
        }
        if (enemy.scale !== undefined && (!Number.isFinite(Number(enemy.scale)) || Number(enemy.scale) <= 0)) {
            throw new Error(location + ': scale must be a positive number.');
        }
        if (enemy.max_hp !== undefined && enemy.health !== undefined && Number(enemy.health) > Number(enemy.max_hp)) {
            throw new Error(location + ': starting health cannot exceed the requested maximum HP.');
        }
    });
    if (!Array.isArray(entry.positions) || entry.positions.length !== 3) {
        throw new Error('Encounter "' + entry.name + '" must have three enemy-position rows.');
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

    function missionIdentity() {
        const api = window.VisualEncountersV21;
        if (!api) throw new Error('Missing v21-export.js. Keep it beside index.html.');
        return api.mapIdentity(state.data.area_id);
    }

    function buildLua() {
        const identity = missionIdentity();
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
                // Scope every encounter to the current mission; never retain
                // an imported global or another mission's package path.
                entry.path = identity.clientPath;
                if (names.has(entry.name)) throw new Error('Duplicate encounter name "' + entry.name + '". Names must be unique across all three categories.');
                names.add(entry.name);
                if (entry.weight !== undefined && !Number.isFinite(Number(entry.weight))) throw new Error('Invalid weight on ' + entry.name + '.');
                compactEnemyReferences(entry);
                if (!Array.isArray(entry.player_positions)) {
                    entry.player_positions = [[0,0,0,0,0,0],[0,1,0,0,0,0],[0,0,0,0,0,0]];
                }
                validateEnemyRecords(entry);
            });
        });
        const allowedKeys = [
            'name', 'path', 'weight', 'enemies', 'obstacles',
            'positions', 'obstacle_positions', 'player_positions', 'tiles', 'teams',
            'freedom_mission', 'no_battle_rewards'
        ];
        const cleanEntries = section => (state.data[section] || []).map(entry => {
            const clean = {};
            allowedKeys.forEach(key => {
                if (entry[key] !== undefined && (key === 'positions' || key === 'player_positions' || !MATRIX_KEYS.includes(key) || manualEnabledForSection(entry, section))) {
                    clean[key] = entry[key];
                }
            });
            if (clean.freedom_mission && clean.freedom_mission.enabled === false) {
                // Explicit non-Freedom encounters are supported, but all new
                // V2.1 entries default to three-turn Freedom Missions.
                delete clean.freedom_mission;
            } else {
                clean.freedom_mission = {
                    enabled: true,
                    turn_count: validFreedomTurns(clean.freedom_mission && (clean.freedom_mission.turn_count ?? clean.freedom_mission.turns)),
                    player_can_flip: false // server enables only for terrain == surrounded
                };
            }
            // Liberation rewards come from mission loot/panels, never battles.
            clean.path = identity.clientPath;
            clean.no_battle_rewards = true;
            return clean;
        });
        const output = {
            minimum_steps_before_encounter: minSteps,
            encounter_chance_per_step: chance,
            encounters: cleanEntries('encounters'),
            special_encounters: cleanEntries('special_encounters'),
            bosses: cleanEntries('bosses')
        };
        return '-- Nebulous Liberations V2.1 encounter table for ' + identity.name + '\n'
            + '-- Generated by VisualEncounters · battle rewards disabled · default Freedom Mission: 3 turns\n'
            + '-- Encounter package: ' + identity.clientPath + '\n\n'
            + 'return ' + serializeLua(output, 0) + '\n';
    }

    function downloadBlob(filename, content) {
        const url = URL.createObjectURL(content);
        const link = el('a', { href: url, download: filename });
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    async function exportV21Bundle() {
        const api = window.VisualEncountersV21;
        const identity = missionIdentity();
        const lua = buildLua();
        const aliases = api.aliasesForMission(state.data);
        const JSZip = await window.loadJSZip();
        const baseResponse = await fetch(api.TEMPLATE_SOURCE);
        if (!baseResponse.ok) throw new Error('Cannot load repaired base ZIP (' + baseResponse.status + '). Host the complete mods/ directory.');
        const base = await JSZip.loadAsync(await baseResponse.arrayBuffer());
        const entry = base.file('entry.lua');
        if (!entry) throw new Error('V2.1 template ZIP is missing root entry.lua.');
        const patched = api.patchBattleEntry(await entry.async('string'), identity, aliases);
        base.file('entry.lua', patched);
        const scoped = await base.generateAsync({ type: 'blob' });
        const bundle = new JSZip();
        bundle.file(identity.encounterFile, lua);
        bundle.file(identity.assetFile, scoped);

        // OW templates are separate Lua modules, not encounter enemies. The
        // existing server registry must be edited manually to require them.
        const templates = Object.keys(state.templates).sort();
        const registrations = [];
        for (const name of templates) {
            const filename = 'template_' + name.toLowerCase() + '.lua';
            bundle.file(api.TEMPLATE_DIRECTORY + filename, templateModule(name, state.templates[name]));
            registrations.push('require("scripts/ezlibs-custom/nebulous-liberations/liberations/enemies/'
                + 'template_' + name.toLowerCase() + '")(EnemyTemplates)');
        }
        bundle.file('ENEMY_TEMPLATE_REGISTRATION.md', [
            '# Register exported overworld templates', '',
            'These files are overworld bots, not battle character mods.',
            'After copying the exported template Lua modules, insert these require lines',
            'in your existing `scripts/ezlibs-custom/nebulous-liberations/liberations/enemy_templates.lua`',
            'after the shared AI helpers are defined. Do not replace that module.', '',
            '```lua', ...registrations, '```', ''
        ].join('\n'));

        // The catalog is the editor's actual bundled enemyDictionary. Keep
        // unresolved aliases visible rather than guessing client package IDs.
        const modPlan = api.collectModDownloads(aliases, enemyDictionary);
        const mods = { included: [], missing: [], unresolved: modPlan.unresolved };
        const includeMods = document.getElementById('ve-bundle-mods');
        if (includeMods && includeMods.checked) {
            for (const filename of modPlan.files) {
                try {
                    const response = await fetch('mods/' + encodeURIComponent(filename));
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    const bytes = await response.arrayBuffer();
                    if (!bytes.byteLength) throw new Error('empty file');
                    bundle.file(api.PACKAGE_DIRECTORY + filename, bytes);
                    mods.included.push(filename);
                } catch (error) {
                    console.warn('[V2.1 Export] Missing mod:', filename, error);
                    mods.missing.push(filename);
                }
            }
        }
        bundle.file('INSTALL_V21_MISSION.md', api.installationNotes(identity, aliases, templates, mods));
        const blob = await bundle.generateAsync({ type: 'blob' });
        downloadBlob(identity.slug + '-v21-liberation-dropin.zip', blob);
        const warning = mods.missing.length || mods.unresolved.length;
        status('Exported ' + identity.encounterFile + ', ' + identity.assetFile
            + ' and ' + templates.length + ' OW templates.'
            + (warning ? ' Check INSTALL_V21_MISSION.md for missing/unmapped character mods.' : ''), !warning);
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
            freedom_mission: { enabled: false, turn_count: 3, player_can_flip: false }
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
        // Positions are explicit even for terrain-generated encounters.
        ensureEnemyPositions(value);
        // A normal Liberation battle has a player spawn at row 2, column 2
        // unless the author already placed one. This matches DEBUGLIB.
        if (!Array.isArray(value.player_positions)) {
            value.player_positions = [
                [0, 0, 0, 0, 0, 0],
                [0, 1, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0]
            ];
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
            value.freedom_mission = { enabled: true, turn_count: 3, player_can_flip: false };
        } else {
            value.freedom_mission = {
                enabled: !!value.freedom_mission.enabled,
                turn_count: validFreedomTurns(value.freedom_mission.turn_count ?? value.freedom_mission.turns),
                player_can_flip: !!value.freedom_mission.player_can_flip
            };
        }
        return value;
    }

    function validFreedomTurns(value) {
        const turns = Number(value);
        return Number.isInteger(turns) && turns > 0 ? turns : 3;
    }

    function loadNebulousData(data) {
        state.categoryBattlefieldDefaults = { encounters: false, special_encounters: false, bosses: false };
        if (Array.isArray(data.rewards) && data.rewards.length === 0) data.rewards = {};
        if (Array.isArray(data.enemy_rewards) && data.enemy_rewards.length === 0) data.enemy_rewards = {};
        state.data = {
            // Keep the selected Tiled filename through imports: the Lua
            // encounter table correctly has no runtime area_id field.
            area_id: state.data.area_id || '',
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

    // Enemy templates are authorable Lua registry data, NOT an encounter-table field.
    // They intentionally exclude behavior functions: named registered AI only.
    const TEMPLATE_FIELDS = [
        ['battle_name','Battle enemy alias','text','Mettaur'],
        ['is_boss','Boss template','checkbox',''],
        ['is_special_encounter','Special encounter enemy','checkbox',''],
        ['health','Starting HP','number','100'],
        ['max_health','Maximum HP','number','100'],
        ['scale','Default OW scale','number','1'],
        ['battle_scale','Default battle scale (blank = inherit OW)','number',''],
        ['texture_path','OW texture path','text','/server/assets/.../enemy.png'],
        ['animation_path','OW animation path','text','/server/assets/.../enemy.animation'],
        ['attack_damage','Overworld base attack damage','number','20'],
        ['ai_type','Registered AI type','select','simple_charge'],
        ['attack_texture','Attack texture path (optional)','text','/server/assets/.../attack.png'],
        ['attack_animation_path','Attack animation path (optional)','text','/server/assets/.../attack.animation'],
        ['death_message','Death message (optional)','text','Defeated!'],
        ['shape','Selection shape (rows separated by /)','text','1,1,1 / 1,0,1 / 1,1,1'],
        ['shape_offset_x','Selection offset X','number','0'],
        ['shape_offset_y','Selection offset Y','number','-1'],
        ['mug_texture','Boss mug texture (optional)','text','/server/assets/.../mug.png'],
        ['mug_animation','Boss mug animation (optional)','text','/server/assets/.../mug.animation']
    ];
    const TEMPLATE_AI = ['simple_charge','ranged','shockwave_line'];
    function templateModule(name, info) {
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) throw new Error('Template name must be a Lua-safe identifier (letters, digits, underscore).');
        const def = { ...info };
        for (const key of ['health','max_health','scale','battle_scale','attack_damage','shape_offset_x','shape_offset_y']) {
            if (def[key] === undefined || def[key] === '') { delete def[key]; continue; }
            def[key] = Number(def[key]);
            if (!Number.isFinite(def[key]) || (key !== 'attack_damage' && !key.startsWith('shape_offset') && def[key] <= 0) || (key === 'attack_damage' && def[key] < 0)) throw new Error(key + ' must be valid and positive (damage may be zero).');
            if (['health','max_health','attack_damage','shape_offset_x','shape_offset_y'].includes(key)) {
                if (!Number.isInteger(def[key])) throw new Error(key + ' must be an integer.');
            }
        }
        if (def.max_health && def.health && def.health > def.max_health) throw new Error('Starting HP must not exceed maximum HP.');
        if (def.ai_type && !TEMPLATE_AI.includes(def.ai_type)) throw new Error('Choose a registered AI type.');
        if (!def.texture_path || !def.animation_path) throw new Error('Overworld texture and animation paths are required.');
        const config = {
            battle_name: def.battle_name || name,
            health: def.health || def.max_health || 100,
            max_health: def.max_health || def.health || 100,
            texture_path: def.texture_path,
            animation_path: def.animation_path,
            attack_damage: def.attack_damage ?? 20,
            ai_type: def.ai_type || 'simple_charge',
            scale: def.scale || 1,
            battle_scale: def.battle_scale || def.scale || 1,
            is_boss: !!def.is_boss,
            is_special_encounter: !!def.is_special_encounter,
            shape_offset_x: def.shape_offset_x ?? 0,
            shape_offset_y: def.shape_offset_y ?? -1
        };
        if (def.shape) {
            const rawRows = String(def.shape).split('/').map(row => row.trim().split(',').map(item => item.trim()));
            if (rawRows.length > 9 || rawRows.some(row => !row.length || row.length > 9 || row.length !== rawRows[0].length || row.some(value => value !== '0' && value !== '1'))) {
                throw new Error('Selection shape needs up to 9 equally sized rows/columns of 0s and 1s.');
            }
            const rows = rawRows.map(row => row.map(Number));
            if (!rows.some(row => row.some(Boolean))) throw new Error('Selection shape must select at least one tile.');
            config.shape = rows;
        }
        if (def.death_message) config.death_message = def.death_message;
        if (def.mug_texture || def.mug_animation) {
            if (!def.mug_texture || !def.mug_animation) throw new Error('Both mug texture and animation paths are required.');
            config.mug = { texture_path: def.mug_texture, animation_path: def.mug_animation };
        }
        config.preload_assets = [def.texture_path, def.animation_path, def.attack_texture, def.attack_animation_path, def.mug_texture, def.mug_animation].filter(Boolean);
        for (const k of ['attack_texture','attack_animation_path']) if (def[k]) config[k] = def[k];
        // These fields are supported by EnemyTemplates.create.
        return '-- Overworld template generated by VisualEncounters\n'
            + '-- Apply OW/Battle Scale via Liberation Enemy Config in Tiled.\n'
            + 'return function(EnemyTemplates)\n'
            + '    EnemyTemplates.register(' + luaString(name) + ', '
            + serializeLua(config, 1) + ')\nend\n';
    }
    // OpenNetBattle selection:set_shape() is a numeric row/column mask.
    // Keep the visual painter and the existing Lua-export field synchronized.
    function createTemplateShapePainter(fields) {
        const raw = fields.shape;
        const offX = fields.shape_offset_x;
        const offY = fields.shape_offset_y;
        let mask = [[1]];
        const presets = {
            'Single tile': [[1]],
            '3 × 3 filled': [[1,1,1],[1,1,1],[1,1,1]],
            '3 × 3 cross': [[0,1,0],[1,1,1],[0,1,0]],
            '3 × 3 ring': [[1,1,1],[1,0,1],[1,1,1]],
            'Three horizontal': [[1,1,1]],
            'Three vertical': [[1],[1],[1]],
            '3 × 3 empty': [[0,0,0],[0,0,0],[0,0,0]]
        };
        const sizeRow = el('select', { 'aria-label': 'Shape rows' }, Array.from({length: 9}, (_, i) => el('option', { value: i+1, text: String(i+1) })));
        const sizeCol = el('select', { 'aria-label': 'Shape columns' }, Array.from({length: 9}, (_, i) => el('option', { value: i+1, text: String(i+1) })));
        const preset = el('select', { 'aria-label': 'Shape preset' }, [el('option', { value: '', text: 'Choose a shape preset…' }), ...Object.keys(presets).map(k => el('option', { value: k, text: k }))]);
        const board = el('div', { class: 've-shape-board', role: 'group', 'aria-label': 'Click to include or remove a selection tile' });
        // The enemy is always world (0,0), centered within the viewing board.
        // Shape offsets move the editable mask relative to the enemy in the preview;
        // only the existing mask and numeric offset inputs determine Lua output.
        const enemyMarker = el('div', { class: 've-shape-enemy-marker', 'aria-hidden': 'true', title: 'Enemy at world (0,0); visual anchor, never part of the shape mask.' }, [el('span', { text: 'ENEMY' })]);
        const info = el('p', { class: 've-small-help ve-shape-info' });
        const rawStatus = el('span', { class: 've-small-help' });
        const makeRaw = () => mask.map(row => row.join(',')).join(' / ');
        const parseRaw = str => {
            if (!str || !str.trim()) return [[1]];
            const result = str.split('/').map(row => row.trim().split(',').map(v => v.trim()));
            if (result.length > 9 || result.some(row => !row.length || row.length > 9 || row.length !== result[0].length || row.some(v => v !== '0' && v !== '1'))) {
                throw new Error('Use up to 9 rows and columns, with 0/1 values separated by commas and / between rows.');
            }
            return result.map(row => row.map(Number));
        };
        function render() {
            const rows = mask.length, cols = mask[0].length;
            sizeRow.value = String(rows); sizeCol.value = String(cols);
            // Offsets are read, never calculated or rewritten when resizing.
            // Each mask tile is positioned using the same x+offset/y+offset
            // formula used by the engine. The enemy remains fixed at world (0,0).
            const dx = Number(offX.value), dy = Number(offY.value);
            const ox = Number.isFinite(dx) ? dx : 0;
            const oy = Number.isFinite(dy) ? dy : -1;
            // Keep a symmetric, odd-sized world viewport so the enemy remains
            // visually centered, including for even mask dimensions. Bound huge
            // manually authored offsets to avoid creating a massive DOM grid.
            const requestedX = Math.max(1, Math.ceil(Math.abs(ox)), Math.ceil(Math.abs(ox + cols - 1)));
            const requestedY = Math.max(1, Math.ceil(Math.abs(oy)), Math.ceil(Math.abs(oy + rows - 1)));
            const radiusX = Math.min(12, requestedX), radiusY = Math.min(12, requestedY);
            board.style.gridTemplateColumns = `repeat(${radiusX * 2 + 1}, var(--ve-shape-size))`;
            board.style.gridTemplateRows = `repeat(${radiusY * 2 + 1}, var(--ve-shape-size))`;
            const cells = [];
            let outside = 0;
            mask.forEach((row, y) => row.forEach((on, x) => {
                const worldX = x + ox, worldY = y + oy;
                // Very large offsets are handled by the numeric controls rather
                // than expanding the preview past 25×25 tiles.
                if (Math.abs(worldX) > radiusX || Math.abs(worldY) > radiusY) { outside++; return; }
                const label = `Row ${y+1}, column ${x+1}; relative to enemy (${worldX}, ${worldY}); ${on ? 'selected' : 'not selected'}`;
                const cell = el('button', { type: 'button', class: 've-shape-cell' + (on ? ' on' : '') + ((worldX === 0 && worldY === 0) ? ' origin' : ''),
                    'aria-pressed': on ? 'true' : 'false', 'aria-label': label,
                    onClick: () => { mask[y][x] = on ? 0 : 1; commit(); }
                }, [el('span', { text: on ? '✓' : '·' }), el('small', { text: `${worldX},${worldY}` })]);
                cell.style.gridColumnStart = String(Math.round(worldX) + radiusX + 1);
                cell.style.gridRowStart = String(Math.round(worldY) + radiusY + 1);
                cells.push(cell);
            }));
            board.replaceChildren(...cells, enemyMarker);
            const selected = mask.flat().filter(Boolean).length;
            info.textContent = `${selected} selected tile${selected === 1 ? '' : 's'} · ${cols} columns × ${rows} rows · ENEMY stays at the visual center (0,0); Offset X/Y moves the mask relative to it. Resizing does not change the numeric offsets or shape export.`
                + (outside ? ` ${outside} tile(s) are beyond the preview range; their data is preserved.` : '');
        }
        function commit() {
            raw.value = makeRaw();
            rawStatus.textContent = '';
            render();
        }
        function resize(rows, cols) {
            rows = Math.max(1, Math.min(9, rows)); cols = Math.max(1, Math.min(9, cols));
            mask = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => mask[y]?.[x] || 0));
            preset.value = ''; commit();
        }
        sizeRow.addEventListener('change', () => resize(+sizeRow.value, mask[0].length));
        sizeCol.addEventListener('change', () => resize(mask.length, +sizeCol.value));
        preset.addEventListener('change', () => {
            if (!presets[preset.value]) return;
            mask = presets[preset.value].map(row => row.slice()); commit();
        });
        offX.addEventListener('input', render);
        offY.addEventListener('input', render);
        raw.addEventListener('input', () => {
            try { mask = parseRaw(raw.value); rawStatus.textContent = ''; render(); }
            catch (err) { rawStatus.textContent = err.message; }
        });
        const rawEditor = el('details', { class: 've-template-advanced' }, [
            el('summary', { text: 'Advanced: edit numeric mask' }),
            el('label', {}, ['Selection mask (same values exported into Lua)', raw, rawStatus])
        ]);
        const panel = el('div', { class: 've-template-card' }, [
            el('h3', { text: 'Selection shape' }),
            el('p', { class: 've-small-help', text: 'The ENEMY marker stays at the center when rows or columns change. Set Offset X/Y yourself to shift the shape relative to the enemy; resizing never changes those numbers.' }),
            el('div', { class: 've-template-mini-row' }, [
                el('label', {}, ['Preset', preset]),
                el('label', {}, ['Rows', sizeRow]),
                el('label', {}, ['Columns', sizeCol])
            ]),
            el('div', { class: 've-shape-stage' }, [board]), info,
            el('div', { class: 've-template-mini-row' }, [
                el('label', {}, ['Offset X', offX]), el('label', {}, ['Offset Y', offY])
            ]), rawEditor
        ]);
        const load = () => {
            try { mask = parseRaw(raw.value); rawStatus.textContent = ''; }
            catch (err) { mask = [[1]]; rawStatus.textContent = err.message; }
            if (offX.value === '') offX.value = '0';
            if (offY.value === '') offY.value = '-1';
            render();
        };
        load();
        return { panel, load };
    }

    // Local preview of ONB .animation + matching texture. File contents remain in the
    // browser session only; the saved template still uses explicit server asset paths.
    function createTemplateSpritePreview(fields) {
        const targets = {
            ow: { name: 'OW sprite', texture: 'texture_path', animation: 'animation_path' },
            attack: { name: 'Attack effect', texture: 'attack_texture', animation: 'attack_animation_path' },
            mug: { name: 'Boss mug', texture: 'mug_texture', animation: 'mug_animation' }
        };
        const assets = Object.fromEntries(Object.keys(targets).map(key => [key, { image: null, imageName: '', animationName: '', states: {}, imagePath: '', url: '' }]));
        let mode = 'ow', currentState = '', frameIndex = 0, seconds = 0, lastTime = 0, running = false, frameRequest = 0;
        const previewMode = el('select', { 'aria-label': 'Preview asset type' }, Object.entries(targets).map(([key,v]) => el('option', { value: key, text: v.name })));
        const fileInput = el('input', { type: 'file', accept: '.png,.webp,.animation,image/png,image/webp', multiple: true, 'aria-label': 'Choose PNG or WebP image and OpenNetBattle animation file' });
        const stage = el('div', { class: 've-sprite-stage', tabindex: '0', role: 'group', 'aria-label': 'Animation preview; drop a sprite sheet and animation file here' });
        const canvas = el('canvas', { width: 460, height: 300, 'aria-label': 'Overworld animation preview' });
        stage.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const stateSelect = el('select', { 'aria-label': 'Animation state' });
        const toggle = el('button', { type: 'button', text: 'Play', onClick: () => { running = !running; toggle.textContent = running ? 'Pause' : 'Play'; if (running) { lastTime = 0; schedule(); } } });
        const next = el('button', { type: 'button', text: 'Next frame', onClick: () => { running = false; toggle.textContent = 'Play'; frameIndex = (frameIndex + 1) % Math.max(1, currentFrames().length); seconds = 0; draw(); } });
        const zoom = el('select', { 'aria-label': 'Preview zoom' }, [1,2,3,4].map(n => el('option', { value: n, text: n + '× zoom' })));
        zoom.value = '2';
        const speed = el('select', { 'aria-label': 'Playback speed' }, [0.5,1,2].map(n => el('option', { value: n, text: n + '× speed' })));
        speed.value = '1';
        const origin = el('input', { type: 'checkbox' }); origin.checked = true;
        const frameStatus = el('p', { class: 've-small-help ve-preview-caption', text: 'No assets loaded. Choose a PNG/WebP sprite sheet and a matching .animation file.' });
        const fileStatus = el('p', { class: 've-small-help' });
        const basePath = el('input', { type: 'text', value: '/server/assets/ezlibs-custom/nebulous-liberations/', 'aria-label': 'Server asset folder' });
        const applyPaths = el('button', { type: 'button', text: 'Use filenames as template paths', onClick: () => {
            const data = assets[mode], mapping = targets[mode];
            const dir = basePath.value.trim().replace(/\/*$/, '/') || '/';
            if (data.imageName) fields[mapping.texture].value = dir + data.imageName;
            if (data.animationName) fields[mapping.animation].value = dir + data.animationName;
            fileStatus.textContent = 'Template paths updated; check the server folder before exporting.';
        } });
        function attrs(line) {
            const a = {};
            for (const item of line.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([^"]*)"/g)) a[item[1]] = item[2];
            return a;
        }
        function parseAnimation(text) {
            const states = {}; let name = '';
            let imagePath = '';
            for (const source of text.split(/\r?\n/)) {
                const line = source.trim();
                if (!line || line.startsWith('#') || line.startsWith('--')) continue;
                if (line.startsWith('imagePath')) { imagePath = attrs(line).imagePath || imagePath; continue; }
                if (line.startsWith('animation ')) { name = attrs(line).state || ''; if (name) states[name] = []; continue; }
                if (!line.startsWith('frame ') || !name) continue;
                const a = attrs(line);
                const frame = {
                    x: Number(a.x), y: Number(a.y), w: Number(a.w), h: Number(a.h),
                    originx: Number(a.originx || 0), originy: Number(a.originy || 0),
                    duration: Number(a.duration || 0.15)
                };
                if ([frame.x,frame.y,frame.w,frame.h,frame.originx,frame.originy,frame.duration].every(Number.isFinite) && frame.w > 0 && frame.h > 0) {
                    frame.duration = Math.max(0.01, frame.duration);
                    states[name].push(frame);
                }
            }
            for (const name of Object.keys(states)) if (!states[name].length) delete states[name];
            if (!Object.keys(states).length) throw new Error('No valid animation states found. Expected animation state="..." and frame duration="..." x/y/w/h entries.');
            return { states, imagePath };
        }
        function currentFrames() { return assets[mode].states[currentState] || []; }
        function currentScale() {
            const v = Number(fields.scale.value);
            return mode === 'ow' && Number.isFinite(v) && v > 0 ? v : 1;
        }
        function setStates() {
            const names = Object.keys(assets[mode].states);
            stateSelect.replaceChildren(...names.map(n => el('option', { value: n, text: `${n} (${assets[mode].states[n].length} frames)` })));
            currentState = names.includes(currentState) ? currentState : (names.find(n => /^IDLE/i.test(n)) || names[0] || '');
            stateSelect.value = currentState;
            frameIndex = 0; seconds = 0; stateSelect.disabled = !names.length;
            draw();
        }
        function draw() {
            if (!ctx) return;
            const { width: W, height: H } = canvas;
            ctx.clearRect(0,0,W,H);
            ctx.fillStyle = '#121e32'; ctx.fillRect(0,0,W,H);
            ctx.strokeStyle = '#243955'; ctx.lineWidth = 1;
            for (let x=0; x<W; x+=24) for (let y=0; y<H; y+=24) { ctx.strokeRect(x,y,24,24); }
            const px = Math.round(W/2), py = Math.round(H*0.75);
            ctx.fillStyle = '#263e58'; ctx.strokeStyle = '#6e8dab'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(px,py-24); ctx.lineTo(px+48,py); ctx.lineTo(px,py+24); ctx.lineTo(px-48,py); ctx.closePath(); ctx.fill(); ctx.stroke();
            const data = assets[mode], frames = currentFrames(), f = frames[frameIndex % Math.max(frames.length, 1)];
            const magnification = Number(zoom.value) || 2;
            const scale = currentScale() * magnification;
            ctx.imageSmoothingEnabled = false;
            if (data.image && data.image.complete && data.image.naturalWidth) {
                if (f) {
                    if (f.x >= 0 && f.y >= 0 && f.x+f.w <= data.image.naturalWidth && f.y+f.h <= data.image.naturalHeight) {
                        const fit = Math.min(1, (W-30)/(f.w*scale), (H-30)/(f.h*scale));
                        const visualScale = scale*fit;
                        ctx.drawImage(data.image, f.x,f.y,f.w,f.h, px-f.originx*visualScale, py-f.originy*visualScale, f.w*visualScale, f.h*visualScale);
                    } else { fileStatus.textContent = 'Frame coordinates exceed sprite sheet dimensions. Check that the matching PNG is selected.'; }
                } else {
                    const fit = Math.min((W-35)/data.image.naturalWidth, (H-35)/data.image.naturalHeight, magnification);
                    const dw = data.image.naturalWidth*fit, dh = data.image.naturalHeight*fit;
                    ctx.drawImage(data.image, (W-dw)/2,(H-dh)/2,dw,dh);
                }
            } else {
                ctx.fillStyle = '#b6c9e2'; ctx.textAlign = 'center'; ctx.font = '14px system-ui';
                ctx.fillText('Choose a sprite sheet to preview animation', px, H/2-15);
            }
            if (origin.checked) {
                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(px-9,py); ctx.lineTo(px+9,py); ctx.moveTo(px,py-9); ctx.lineTo(px,py+9); ctx.stroke();
            }
            frameStatus.textContent = f ? `${currentState} · frame ${frameIndex+1}/${frames.length} · ${f.w}×${f.h}px · origin (${f.originx},${f.originy}) · preview scale ${currentScale()}×`
                : (data.image ? 'Sprite sheet loaded. Add the matching .animation file for playback and frame origins.' : 'Choose a PNG/WebP sprite sheet and a matching .animation file.');
        }
        function schedule() {
            if (!running || frameRequest) return;
            frameRequest = requestAnimationFrame(time => {
                frameRequest = 0;
                const frames = currentFrames();
                if (frames.length > 1 && lastTime) {
                    seconds += Math.min(0.1, (time-lastTime)/1000) * Number(speed.value || 1);
                    let iterations=0;
                    while (seconds >= frames[frameIndex].duration && iterations++ < 50) {
                        seconds -= frames[frameIndex].duration;
                        frameIndex = (frameIndex+1) % frames.length;
                    }
                }
                lastTime = time;
                draw();
                schedule();
            });
        }
        function switchMode(nextMode) {
            mode = nextMode; currentState = ''; frameIndex = 0; seconds = 0;
            setStates();
            const a = assets[mode];
            fileStatus.textContent = [a.imageName, a.animationName].filter(Boolean).join(' + ') || 'Choose local files to preview. Server paths are edited separately below.';
        }
        async function loadFiles(files) {
            let loaded = false;
            for (const file of files) {
                const target = assets[mode];
                if (/\.animation$/i.test(file.name)) {
                    try {
                        const result = parseAnimation(await file.text());
                        target.states = result.states; target.imagePath = result.imagePath; target.animationName = file.name;
                        fileStatus.textContent = `Loaded ${file.name} (${Object.keys(result.states).length} states).`;
                        loaded = true;
                    } catch (err) { fileStatus.textContent = `${file.name}: ${err.message}`; }
                } else if (/\.(png|webp)$/i.test(file.name) || file.type.startsWith('image/')) {
                    const url = URL.createObjectURL(file);
                    const image = new Image();
                    image.onload = draw;
                    image.onerror = () => { fileStatus.textContent = 'Could not decode ' + file.name; };
                    image.src = url;
                    if (target.url) URL.revokeObjectURL(target.url);
                    target.url = url; target.image = image; target.imageName = file.name;
                    loaded = true;
                }
            }
            if (loaded) {
                setStates();
                const a = assets[mode];
                if (a.imageName && a.imagePath && a.imageName.toLowerCase() !== a.imagePath.split(/[\\/]/).pop().toLowerCase()) {
                    fileStatus.textContent = `Warning: animation expects ${a.imagePath}, but you loaded ${a.imageName}.`;
                }
                if (!running) { running = true; toggle.textContent = 'Pause'; lastTime = 0; schedule(); }
            }
        }
        fileInput.addEventListener('change', () => { loadFiles([...fileInput.files]); fileInput.value = ''; });
        stage.addEventListener('dragover', e => { e.preventDefault(); stage.classList.add('dragover'); });
        stage.addEventListener('dragleave', () => stage.classList.remove('dragover'));
        stage.addEventListener('drop', e => { e.preventDefault(); stage.classList.remove('dragover'); loadFiles([...e.dataTransfer.files]); });
        previewMode.addEventListener('change', () => switchMode(previewMode.value));
        stateSelect.addEventListener('change', () => { currentState = stateSelect.value; frameIndex = 0; seconds = 0; draw(); });
        zoom.addEventListener('change', draw); origin.addEventListener('change', draw);
        fields.scale.addEventListener('input', draw);
        // Optional included example lets visitors try animation playback immediately.
        const demo = el('button', { type: 'button', text: 'Try Mettaur example', onClick: async () => {
            previewMode.value = 'ow'; switchMode('ow');
            try {
                const response = await fetch('ow-preview/mettaur_ow.animation');
                if (!response.ok) throw new Error('Example animation not available');
                const parsed = parseAnimation(await response.text());
                const a = assets.ow;
                a.states = parsed.states; a.imagePath = parsed.imagePath; a.animationName = 'mettaur_ow.animation';
                const img = new Image();
                img.onload = draw;
                img.onerror = () => { fileStatus.textContent = 'Example image could not be loaded'; };
                img.src = 'ow-preview/mettaur_ow.png';
                a.image = img; a.imageName = 'mettaur_ow.png';
                setStates();
                fileStatus.textContent = 'Mettaur example loaded for preview only. No template paths were changed.';
                if (!running) { running = true; toggle.textContent = 'Pause'; lastTime = 0; schedule(); }
            } catch (err) { fileStatus.textContent = 'Example unavailable here. Upload your own PNG and .animation files.'; }
        } });
        const panel = el('div', { class: 've-template-card ve-template-preview-card' }, [
            el('h3', { text: 'Live overworld preview' }),
            el('p', { class: 've-small-help', text: 'Preview real OpenNetBattle .animation states, frame timings and origins. Your local files stay in this browser session.' }),
            el('div', { class: 've-template-mini-row' }, [el('label', {}, ['Preview asset', previewMode]), el('label', {}, ['Animation state', stateSelect])]),
            stage,
            el('div', { class: 've-template-playback' }, [toggle, next, zoom, speed, el('label', { class: 've-template-inline-check' }, [origin, 'Show anchor'])]),
            frameStatus,
            el('label', { class: 've-preview-file-label' }, ['Load image + .animation files', fileInput]),
            el('div', { class: 've-template-sample' }, [demo]), fileStatus,
            el('details', { class: 've-template-advanced' }, [
                el('summary', { text: 'Use these files in the exported template' }),
                el('p', { class: 've-small-help', text: 'Loading files only changes the preview. Set the folder below, then apply filenames if it matches your server assets.' }),
                el('label', {}, ['Server asset folder', basePath]), applyPaths
            ])
        ]);
        switchMode('ow');
        const reset = () => {
            running = false; toggle.textContent = 'Play'; lastTime = 0;
            for (const a of Object.values(assets)) {
                if (a.url) URL.revokeObjectURL(a.url);
                Object.assign(a, { image: null, imageName: '', animationName: '', states: {}, imagePath: '', url: '' });
            }
            previewMode.value = 'ow'; switchMode('ow');
        };
        return { panel, refresh: draw, reset };
    }

    function buildTemplateEditor() {
        const panel = el('section', { id: 've-template-editor', class: 've-template-editor' });
        panel.appendChild(el('div', { class: 've-heading-line' }, [
            el('div', {}, [el('h2', { text: 'Enemy Template Workshop' }),
                el('p', { class: 've-small-help', text: 'Build an OW enemy in three steps: choose a template, paint its selection shape, and preview the actual sprite animation. Templates export as Lua registration modules, separate from encounters.lua.' })])
        ]));
        const chooser = el('select', { id: 've-template-choose', 'aria-label': 'Choose a template' });
        const name = el('input', { id: 've-template-name', type: 'text', placeholder: 'e.g. MyMettaur' });
        const fields = {}, wrappers = {};
        TEMPLATE_FIELDS.forEach(([key,label,type,placeholder]) => {
            const input = type === 'select' ? el('select', { 'data-template-field': key }, TEMPLATE_AI.map(ai => el('option', { value: ai, text: ai })))
                : el('input', { type, placeholder, 'data-template-field': key, ...(type === 'number' ? { step: key.includes('scale') ? '0.05' : '1' } : {}) });
            fields[key] = input;
            wrappers[key] = el('label', {}, [label, input]);
        });
        const section = (title, description, keys, className = '') => el('section', { class: 've-template-card ' + className }, [
            el('h3', { text: title }),
            el('p', { class: 've-small-help', text: description }),
            el('div', { class: 've-template-fields' }, keys.map(key => wrappers[key]))
        ]);
        const shape = createTemplateShapePainter(fields);
        const preview = createTemplateSpritePreview(fields);
        const primary = el('div', { class: 've-template-primary' }, [
            section('1 · Identity & behavior', 'Start with the battle alias, class and registered AI. Different overworld behaviors still need a Lua AI implementation.', ['battle_name','is_boss','is_special_encounter','ai_type','death_message']),
            section('2 · Health, scale & combat', 'OW scale is used in the live preview. Battle scale is independent and defaults to OW scale when left empty.', ['health','max_health','scale','battle_scale','attack_damage']),
            shape.panel,
            section('3 · Overworld asset paths', 'These are server asset paths, not the local files used for preview. Upload files on the right to inspect them; optionally copy the filenames into these fields.', ['texture_path','animation_path']),
            el('details', { class: 've-template-card ve-template-advanced' }, [
                el('summary', { text: 'Advanced · Attack effects and boss mug' }),
                el('p', { class: 've-small-help', text: 'Optional attack and mug assets can also be previewed using the selector in the preview panel.' }),
                el('div', { class: 've-template-fields' }, ['attack_texture','attack_animation_path','mug_texture','mug_animation'].map(key => wrappers[key]))
            ])
        ]);
        const workspace = el('div', { class: 've-template-workspace' }, [primary, el('aside', { class: 've-template-preview-column' }, [preview.panel])]);
        const refresh = () => {
            chooser.replaceChildren(el('option', { value: '', text: 'New enemy template…' }));
            Object.keys(state.templates).sort().forEach(key => chooser.appendChild(el('option', { value: key, text: key })));
        };
        const load = key => {
            const def = state.templates[key] || {};
            const starting = !key || !state.templates[key];
            const defaults = starting ? { health: '100', max_health: '100', scale: '1', attack_damage: '20', shape: '1', shape_offset_x: '0', shape_offset_y: '-1' } : {};
            name.value = key;
            Object.entries(fields).forEach(([field,input]) => {
                if (input.type === 'checkbox') input.checked = !!def[field];
                else input.value = def[field] ?? defaults[field] ?? (field === 'ai_type' ? 'simple_charge' : '');
            });
            shape.load(); preview.reset();
        };
        chooser.addEventListener('change', () => load(chooser.value));
        const save = () => {
            const key = name.value.trim();
            if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) throw new Error('Enter a template name using letters, digits or underscores.');
            const def = {};
            Object.entries(fields).forEach(([field,input]) => {
                if (input.type === 'checkbox') def[field] = input.checked;
                else if (input.value.trim() !== '') def[field] = input.value.trim();
            });
            templateModule(key, def); // validate the exact Lua structure before saving
            state.templates[key] = def;
            refresh(); chooser.value = key;
            saveToLocalStorage();
            status('Saved template "' + key + '" locally. Export its complete Lua module to install it on your server.', true);
            return [key, def];
        };
        const action = (label, fn, cls = '') => el('button', { type: 'button', class: cls, onClick: () => {
            try { fn(); } catch (err) { status('Template editor: ' + err.message, false); }
        } }, [label]);
        const toolbar = el('div', { class: 've-template-toolbar' }, [
            el('label', {}, ['Saved templates', chooser]),
            el('label', {}, ['Template name', name]),
            action('New', () => { chooser.value = ''; load(''); }),
            action('Save template', save, 've-template-primary-button'),
            action('Export Lua module', () => {
                const [key,def] = save();
                downloadText('template_' + key.toLowerCase() + '.lua', templateModule(key, def));
                status('Exported template_' + key.toLowerCase() + '.lua. Register it via require in enemy_templates.lua.', true);
            }),
            action('Delete', () => {
                const key = chooser.value;
                if (!key || !window.confirm('Delete template ' + key + ' from this editor?')) return;
                delete state.templates[key]; refresh(); load(''); saveToLocalStorage();
            })
        ]);
        panel.appendChild(toolbar);
        panel.appendChild(workspace);
        panel.appendChild(el('p', { class: 've-small-help', text: 'Exported modules retain the same runtime format: EnemyTemplates.register(name, config). Place the Lua file under liberations/enemies/ and add a matching require in enemy_templates.lua. Use the template key in Tiled Boss / Spawns properties.' }));
        panel.hidden = true;
        refresh(); load('');
        return panel;
    }

    function buildNebulousControls() {
        const tabs = el('div', { class: 've-section-tabs' }, SECTION_KEYS.map(section =>
            el('button', { id: 've-section-' + section, type: 'button', class: section === state.activeSection ? 'active' : '', onClick: () => activateSection(section) }, [
                SECTION_LABELS[section], ' ', el('span', { class: 've-count', text: '(' + state.data[section].length + ')' })
            ])
        ));
        tabs.appendChild(el('button', { id: 've-template-tab', type: 'button', onClick: () => {
            const editor = document.getElementById('ve-template-editor');
            const controls = document.getElementById('ve-nebulous-controls');
            const container = document.querySelector('#ve-nebulous-view > .container');
            const tools = document.querySelector('#ve-nebulous-view > .toolbar');
            const showing = editor.hidden;
            editor.hidden = !showing;
            if (container) container.hidden = showing;
            if (tools) tools.hidden = showing;
            document.getElementById('ve-template-tab').classList.toggle('active', showing);
            document.querySelectorAll('#ve-nebulous-controls .ve-section-tabs button:not(#ve-template-tab)').forEach(b => b.classList.toggle('active', !showing && b.id === 've-section-' + state.activeSection));
        } }, ['Enemy Templates']));
        const importInput = el('input', { id: 've-nebulous-import', type: 'file', accept: '.lua,.txt', style: 'display:none' });
        importInput.addEventListener('change', async event => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            try {
                if (/^[A-Za-z0-9][A-Za-z0-9 _-]*\.lua$/.test(file.name) && file.name.toLowerCase() !== 'encounters.lua') {
                    state.data.area_id = file.name.slice(0, -4);
                    const nameInput = document.getElementById('ve-area-id');
                    if (nameInput) nameInput.value = state.data.area_id;
                }
                loadNebulousData(parseImportedLua(await file.text()));
            }
            catch (error) { status('Could not load Lua file: ' + error.message, false); }
            importInput.value = '';
        });
        return el('div', { id: 've-nebulous-controls' }, [
            tabs,
            el('label', { class: 've-mission-name' }, [
                'Tiled Area / Encounter Filename (without .tmx)',
                el('input', { id: 've-area-id', type: 'text', placeholder: 'e.g. LiberationEasyMode',
                    value: state.data.area_id || '', onInput: undefined }),
                el('span', { class: 've-small-help', text: 'Must exactly match areas/<MapName>.tmx. Sets encounters/<MapName>.lua and unique scoped battle ZIP names.' })
            ]),
            el('label', { class: 've-manual-toggle' }, [
                el('input', { id: 've-bundle-mods', type: 'checkbox', checked: 'checked' }),
                ' Include hosted character mod ZIPs with deployment'
            ]),
            el('div', { class: 've-schema-note', text: 'V2.1 Liberation: all three categories, authored enemy positions, three-turn default Freedom Missions, unique mission-scoped battle ZIP, no battle rewards. Automatic terrain is calculated by the mission and flip is allowed only when surrounded. Encounter music is configured in Tiled Liberation Config.' }),
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
            el('p', { class: 've-schema-note', text: 'Download V2.1 drop-in ZIP creates encounters/<MapName>.lua, a mission-scoped EZEncounters ZIP from the repaired working base, and optional OW template/character mod files. It does not create maps or new character variants.' }),
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
                try { await exportV21Bundle(); }
                catch (error) { console.error(error); status('V2.1 bundle export failed: ' + error.message, false); }
            } }, ['Download V2.1 drop-in ZIP']),
            el('button', { type: 'button', onClick: () => {
                try {
                    const identity = missionIdentity();
                    downloadText(identity.name + '.lua', buildLua());
                    status('Exported ' + identity.encounterFile + ' (Lua only).', true);
                } catch (error) { status('Lua export failed: ' + error.message, false); }
            } }, ['Lua only'])
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
    for (const key of ['nickname', 'health', 'max_hp', 'scale', 'attack_multiplier', 'defense_multiplier']) {
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

    function parseMultiplierField(id) {
        const input = document.getElementById(id);
        if (!input || input.value.trim() === '') return undefined;
        const value = Number(input.value);
        if (!Number.isFinite(value) || value < 0) throw new Error('Modifiers must be finite and non-negative.');
        return value;
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
            for (const [id, key] of [['ve-battle-attack-multiplier','attack_multiplier'], ['ve-battle-defense-multiplier','defense_multiplier']]) {
                const field = document.getElementById(id);
                if (field) field.value = enemy && enemy[key] != null ? String(enemy[key]) : '';
            }
        };

        // Hover and right-click handlers in the original grid read every matrix.
        // Automatic terrain may still omit teams, tiles, or obstacle matrices;
        // supply read-safe defaults without modifying those authored settings.
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
            scale: parseEnemyField('enemy-scale', false, 'Battle scale'),
            attack_multiplier: parseMultiplierField('ve-battle-attack-multiplier'),
            defense_multiplier: parseMultiplierField('ve-battle-defense-multiplier')
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
['enemy-max-hp', 'enemy-scale', 've-battle-attack-multiplier', 've-battle-defense-multiplier'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('change', () => {
        if (window.__veNebulousMode) updateEnemyOnTile();
    });
});

        window.cleanupEnemies = function(variation) {
            if (!window.__veNebulousMode) return originalCleanupEnemies(variation);
            if (!variation) return;
            compactEnemyReferences(variation);
            updateGrid();
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
            // Removing or replacing content must immediately discard the old
            // virus record and remap indices, not wait for another tile click.
            cleanupEnemies(variation);
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
                positions: Array.from({ length: 3 }, () => Array(6).fill(0)),
                // Legacy-compatible single-player spawn at the center of the
                // player-side 3x3 field (row 2, column 2; Lua indices).
                player_positions: [
                    [0, 0, 0, 0, 0, 0],
                    [0, 1, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0]
                ],
                freedom_mission: { enabled: true, turn_count: 3, player_can_flip: false },
                manual_battlefield_override: false
            };
            if (manualEnabled(entry)) initializeManualMatrices(entry);
            config.encounters.push(entry);
            currentVariationIndex = config.encounters.length - 1;
            refreshVariationDropdown();
            selectVariation(currentVariationIndex);
            updateManualControls();
            saveToLocalStorage();
            status('Added ' + uniqueName + '. Enemy positions always export from the grid; Automatic mode still generates terrain and teams.', true);
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
                ...state.data, categoryBattlefieldDefaults: state.categoryBattlefieldDefaults, templates: state.templates
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
        const scaleField = document.getElementById('enemy-scale');
        if (scaleField && scaleField.closest('label')) {
            const outer = scaleField.closest('label');
            for (const [id, label] of [['ve-battle-attack-multiplier','Battle attack multiplier (mod dependent)'],['ve-battle-defense-multiplier','Battle defense multiplier (mod dependent)']]) {
                outer.after(el('label', { class: 've-nebulous-enemy-advanced', style: 'display:none' }, [label, el('input', { type: 'number', id: id, min: '0', step: '0.1', placeholder: '1 = normal damage' })]));
            }
        }
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
                state.templates = data.templates && typeof data.templates === 'object' && !Array.isArray(data.templates) ? data.templates : {};
                state.categoryBattlefieldDefaults = Object.fromEntries(SECTION_KEYS.map(section => [
                    section, !!(data.categoryBattlefieldDefaults && data.categoryBattlefieldDefaults[section])
                ]));
                state.data = {
                    area_id: typeof data.area_id === 'string' ? data.area_id : '',
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
            el('button', { type: 'button', 'data-view': 'new', onClick: () => activateView('new') }, ['V2.1 format'])
        ]);
        tabs.prepend(el('div', { class: 've-brand' }, [el('strong', { text: 'VisualEncounters' }), el('span', { text: 'Battle builder · Grid + Inspector' })]));
        const legacy = el('section', { id: 've-legacy-view' });
        const nebulous = el('section', { id: 've-nebulous-view', hidden: true });
        const controls = buildNebulousControls();
        controls.querySelector('#ve-area-id').addEventListener('input', event => {
            state.data.area_id = event.target.value;
            if (window.__veNebulousMode) saveToLocalStorage();
        });
        const statusNode = el('div', { id: 've-nebulous-status' });

        document.body.insertBefore(tabs, toolbar);
        document.body.insertBefore(legacy, toolbar);
        document.body.insertBefore(nebulous, container.nextSibling);
        legacy.appendChild(toolbar);
        legacy.appendChild(container);
        nebulous.appendChild(controls);
        nebulous.appendChild(buildTemplateEditor());
        const globalPanel = el('details', { id: 've-global-controls', class: 've-global-controls' }, [
            el('summary', { text: 'Global & category overrides · Encounter frequency and battlefield mode' }),
            el('p', { class: 've-small-help', text: 'Global values apply across encounter categories. Category battlefield overrides apply only to the currently selected category and take precedence over encounter-level battlefield mode.' })
        ]);
        const frequency = document.getElementById('ve-area-basics');
        // Existing controls are moved, not copied; their event listeners remain intact.
        for (const id of ['ve-category-manual-battlefield','ve-area-persistent-health']) {
            const input = controls.querySelector('#' + id);
            if (input && input.closest('label')) globalPanel.appendChild(input.closest('label'));
        }
        for (const id of ['ve-area-rewards','ve-enemy-fallback-rewards']) {
            const section = controls.querySelector('#' + id);
            if (section) globalPanel.appendChild(section);
        }
        controls.after(globalPanel);
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
