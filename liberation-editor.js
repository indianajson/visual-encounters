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

    const state = {
        activeView: 'legacy',
        activeSection: 'encounters',
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
            body.dark-mode #ve-nebulous-controls{background:#383838;color:#eee}
            #ve-nebulous-controls .ve-section-tabs{display:flex;gap:7px;flex-wrap:wrap}
            #ve-nebulous-controls button{background:#ccc;color:#222}
            #ve-nebulous-controls button.active{background:#1769d2;color:white}
            body.dark-mode #ve-nebulous-controls button{background:#555;color:#eee}
            #ve-nebulous-controls button.ve-action{background:#1769d2;color:#fff}
            #ve-nebulous-status{font-size:13px;white-space:pre-wrap;margin:4px 0 10px;padding:8px 10px;border-radius:4px;display:none}
            #ve-nebulous-status.ok{display:block;background:#dff0d8;color:#285b26}
            #ve-nebulous-status.bad{display:block;background:#f2dede;color:#8a2525}
            body.dark-mode #ve-nebulous-status.ok{background:#29432a;color:#d8f2d2}
            body.dark-mode #ve-nebulous-status.bad{background:#4a2929;color:#ffdede}
        `;
        document.head.appendChild(el('style', { id: 'nebulous-editor-styles', text: css }));
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
        ['#load-config', '#save-config', '#clear-all'].forEach(selector => {
            const node = document.querySelector(selector);
            if (node) node.style.display = isNebulous ? 'none' : '';
        });
        const loadInput = document.getElementById('load-file');
        if (loadInput) loadInput.disabled = isNebulous;
        // Keep the original Download Mods checkbox available in both modes.
        // The Nebulous save action gathers enemy packages from all three categories.
        const downloadMods = document.querySelector('label:has(#download-mods)');
        if (downloadMods) downloadMods.style.display = '';
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
        if (view === 'new') {
            config = {
                minimum_steps_before_encounter: state.data.minimum_steps_before_encounter,
                encounter_chance_per_step: state.data.encounter_chance_per_step,
                encounters: state.data[state.activeSection]
            };
            if (!Array.isArray(config.encounters)) config.encounters = state.data[state.activeSection] = [];
            state.legacyContainer.parentNode.removeChild(state.legacyContainer);
            state.legacyToolbar.parentNode.removeChild(state.legacyToolbar);
            const root = document.getElementById('ve-nebulous-view');
            root.appendChild(state.legacyToolbar);
            root.appendChild(state.legacyContainer);
            setLegacyControlsForMode(true);
            refreshEditorForActiveData();
            status('Nebulous Liberations mode. Build encounters with the same visual battle grid and property panels.', true);
        } else {
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
        }
        updateTopTabs();
    }

    function luaString(value) {
        return '"' + String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
    }

    function serializeLua(value, depth) {
        const indent = '    '.repeat(depth);
        const childIndent = '    '.repeat(depth + 1);
        if (value === null || value === undefined) return 'nil';
        if (typeof value === 'string') return luaString(value);
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) throw new Error('Cannot export NaN or Infinity.');
            return String(value);
        }
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (Array.isArray(value)) {
            if (!value.length) return '{}';
            return '{\n' + value.map(item => childIndent + serializeLua(item, depth + 1) + ',').join('\n') + '\n' + indent + '}';
        }
        if (typeof value === 'object') {
            const entries = Object.entries(value).filter(([, item]) => item !== undefined);
            if (!entries.length) return '{}';
            return '{\n' + entries.map(([key, item]) => {
                const luaKey = /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : '[' + luaString(key) + ']';
                return childIndent + luaKey + ' = ' + serializeLua(item, depth + 1) + ',';
            }).join('\n') + '\n' + indent + '}';
        }
        throw new Error('Unsupported encounter value: ' + typeof value);
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
            });
        });
        const output = {
            minimum_steps_before_encounter: minSteps,
            encounter_chance_per_step: chance,
            encounters: state.data.encounters || [],
            special_encounters: state.data.special_encounters || [],
            bosses: state.data.bosses || []
        };
        return '-- Nebulous Liberations encounter table\n-- Generated by VisualEncounters Editor\n\nreturn ' + serializeLua(output, 0) + '\n';
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
        if (typeof window.parseConfigContent !== 'function') {
            throw new Error('The existing Lua parser is unavailable.');
        }
        const parsed = window.parseConfigContent(source);
        const result = {
            minimum_steps_before_encounter: Number(parsed.minimum_steps_before_encounter ?? 80),
            encounter_chance_per_step: Number(parsed.encounter_chance_per_step ?? 0.05),
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
            enemies: [], obstacles: [], music: { path: '' }, results_callback: '',
            freedom_mission: { enabled: false, turn_count: 5, player_can_flip: false }
        }, entry || {});
        value.enemies = Array.isArray(value.enemies) ? value.enemies : [];
        value.obstacles = Array.isArray(value.obstacles) ? value.obstacles : [];
        value.positions = grid(value.positions, 0);
        value.obstacle_positions = grid(value.obstacle_positions, 0);
        value.player_positions = grid(value.player_positions, 0);
        value.tiles = grid(value.tiles, 1);
        value.teams = grid(value.teams, 0);
        if (!value.music || typeof value.music !== 'object') value.music = { path: '' };
        if (!value.freedom_mission || typeof value.freedom_mission !== 'object') value.freedom_mission = { enabled: false, turn_count: 5, player_can_flip: false };
        return value;
    }

    function loadNebulousData(data) {
        state.data = {
            minimum_steps_before_encounter: Number(data.minimum_steps_before_encounter ?? 80),
            encounter_chance_per_step: Number(data.encounter_chance_per_step ?? 0.05),
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
                        status('Generated encounters.lua and required_mods.zip. ' + modResult.failed.length + ' referenced package(s) were not present in the bundled server archive; see MOD_PACKAGE_AUDIT.txt.', false);
                    } else {
                        status('Generated encounters.lua' + (modResult ? ' and required_mods.zip.' : '.'), true);
                    }
                } catch (error) {
                    status('Save failed: ' + error.message, false);
                }
            } }, ['Save Lua + Mods']),
            importInput
        ]);
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
        state.legacyToolbar = toolbar;
        state.legacyContainer = container;
        state.legacyConfig = config;

        const tabs = el('nav', { id: 've-main-tabs', 'aria-label': 'Encounter editor modes' }, [
            el('button', { type: 'button', class: 'active', 'data-view': 'legacy', onClick: () => activateView('legacy') }, ['Legacy Format']),
            el('button', { type: 'button', 'data-view': 'new', onClick: () => activateView('new') }, ['Nebulous Liberations'])
        ]);
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
    }

    if (window.jQuery) window.jQuery(install);
    else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
    else install();
})();
