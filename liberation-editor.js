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

    function manualEnabled(variation) {
        return !!(variation && variation.manual_battlefield_override);
    }

    function updateManualControls() {
        const variation = activeEncounter();
        const enabled = manualEnabled(variation);
        const toggle = document.getElementById('ve-manual-battlefield');
        if (toggle) {
            toggle.checked = enabled;
            toggle.disabled = !variation;
        }
        ['tile-team', 'tile-type'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.disabled = state.activeView === 'new' && !enabled;
        });
        const note = document.getElementById('ve-manual-note');
        if (note) note.textContent = enabled
            ? 'Manual: Teams, tile types, enemy positions and obstacles are exported. Player spawn is always editable.'
            : 'Automatic: Runtime chooses teams, tile types and enemy/obstacle positions. Player spawn is always exported.';
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
        const inlineEntryLimit = 112;
        function keyFor(key) {
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
        const allowedKeys = [
            'name', 'path', 'weight', 'enemies', 'obstacles',
            'positions', 'obstacle_positions', 'player_positions', 'tiles', 'teams',
            'freedom_mission'
        ];
        const cleanEntries = section => (state.data[section] || []).map(entry => {
            const clean = {};
            allowedKeys.forEach(key => {
                if (entry[key] !== undefined && (key === 'player_positions' || !MATRIX_KEYS.includes(key) || manualEnabled(entry))) {
                    clean[key] = entry[key];
                }
            });
            if (clean.freedom_mission && typeof clean.freedom_mission === 'object') {
                if (!clean.freedom_mission.enabled) delete clean.freedom_mission;
                else clean.freedom_mission = {
                    enabled: true,
                    turn_count: Number(clean.freedom_mission.turn_count ?? clean.freedom_mission.turns ?? 5),
                    player_can_flip: !!clean.freedom_mission.player_can_flip
                };
            }
            return clean;
        });
        const output = {
            minimum_steps_before_encounter: minSteps,
            encounter_chance_per_step: chance,
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
            enemies: [], obstacles: [],
            freedom_mission: { enabled: false, turn_count: 5, player_can_flip: false }
        }, entry || {});
        value.enemies = Array.isArray(value.enemies) ? value.enemies : [];
        value.obstacles = Array.isArray(value.obstacles) ? value.obstacles : [];
        delete value.terrain;
        delete value.music;
        delete value.results_callback;
        value.manual_battlefield_override = !!value.manual_battlefield_override || Array.isArray(value.teams);
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
            el('div', { class: 've-schema-note', text: 'Runtime terrain determines the automatic battlefield. The player marker is editable in either mode and runtime relocates it to the nearest valid player-team tile if necessary. Liberation music comes from the Tiled Liberation Config → Encounter Music reference.' }),
            el('label', { class: 've-manual-toggle' }, [
                el('input', { id: 've-manual-battlefield', type: 'checkbox', onChange: event => {
                    const variation = activeEncounter();
                    if (!variation) return;
                    variation.manual_battlefield_override = event.target.checked;
                    if (event.target.checked) {
                        MATRIX_KEYS.forEach(key => ensureMatrix(variation, key));
                    }
                    updateManualControls();
                    updateGrid();
                    saveToLocalStorage();
                } }),
                ' Manual Battlefield Override'
            ]),
            el('div', { id: 've-manual-note', class: 've-schema-note' }),
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

    function installNebulousEditorOverrides() {
        const originalUpdateTileImage = window.updateTileImage;
        const originalUpdateGrid = window.updateGrid;
        const originalUpdateTileFields = window.updateTileFields;
        const originalSaveToLocalStorage = window.saveToLocalStorage;
        const originalCleanupEnemies = window.cleanupEnemies;
        const originalAddNewVariation = window.addNewVariation;

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
            return withPreviewMatrices(variation, () => originalUpdateTileFields());
        };

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
            return result;
        };

        window.saveToLocalStorage = function() {
            if (!window.__veNebulousMode) return originalSaveToLocalStorage();
            state.data[state.activeSection] = config.encounters;
            state.data.minimum_steps_before_encounter = config.minimum_steps_before_encounter;
            state.data.encounter_chance_per_step = config.encounter_chance_per_step;
            localStorage.setItem('nebulousEncounterConfig', JSON.stringify(state.data));
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
        installNebulousEditorOverrides();
        window.__veNebulousMode = false;
        state.legacyToolbar = toolbar;
        state.legacyContainer = container;
        state.legacyConfig = config;
        try {
            const saved = localStorage.getItem('nebulousEncounterConfig');
            if (saved) {
                const data = JSON.parse(saved);
                state.data = {
                    minimum_steps_before_encounter: Number(data.minimum_steps_before_encounter ?? 80),
                    encounter_chance_per_step: Number(data.encounter_chance_per_step ?? 0.05),
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
