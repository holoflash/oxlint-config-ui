#!/usr/bin/env node

import { execSync, exec } from 'node:child_process';
import { stdout, stdin, exit, platform, argv } from 'node:process';
import readline from 'node:readline';
import fs from 'node:fs';

const OXLINT_VERSION = "1.41.0"

const COLORS = {
    reset: '\x1b[0m',
    dim: '\x1b[90m',
    highlight: '\x1b[38;5;110m',
    selectedBg: '\x1b[47m\x1b[30m',
    borderActive: '\x1b[36m',
    borderInactive: '\x1b[90m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    success: '\x1b[32m',
};

const KEY_MAP = {
    'k': { type: 'MOVE_UP' },
    'up': { type: 'MOVE_UP' },
    'down': { type: 'MOVE_DOWN' },
    'j': { type: 'MOVE_DOWN' },
    'left': { type: 'MOVE_LEFT' },
    'h': { type: 'MOVE_LEFT' },
    'right': { type: 'MOVE_RIGHT' },
    'l': { type: 'MOVE_RIGHT' },
    'return': { type: 'OPEN_DOCS' },
    'enter': { type: 'OPEN_DOCS' },
    'q': { type: 'EXIT' },
    'escape': { type: 'EXIT' }
};

function reducer(state, action) {
    const { categories, rulesByCategory, selectedCatIdx, selectedRuleIdx, activePane } = state;
    const currentCat = categories[selectedCatIdx];
    const currentRules = rulesByCategory[currentCat] || [];
    const viewHeight = stdout.rows - 6;

    const statsHeight = 7;
    const catViewHeight = viewHeight - statsHeight;

    switch (action.type) {
        case 'MOVE_RIGHT':
            if (activePane !== 1)
                return { ...state, activePane: Math.min(2, activePane + 1) };

        case 'MOVE_LEFT':
            return { ...state, activePane: Math.max(0, activePane - 1) };

        case 'MOVE_UP':
            if (activePane === 0) {
                const nextIdx = selectedCatIdx === 0 ? categories.length - 1 : selectedCatIdx - 1;
                return {
                    ...state,
                    selectedCatIdx: nextIdx,
                    selectedRuleIdx: 0,
                    scrollRule: 0,
                    scrollCat: updateScroll(nextIdx, state.scrollCat, catViewHeight)
                };
            } else if (activePane === 1) {
                const nextIdx = selectedRuleIdx === 0 ? currentRules.length - 1 : selectedRuleIdx - 1;
                return {
                    ...state,
                    selectedRuleIdx: nextIdx,
                    scrollRule: updateScroll(nextIdx, state.scrollRule, viewHeight)
                };
            }
            return state;

        case 'MOVE_DOWN':
            if (activePane === 0) {
                const nextIdx = selectedCatIdx === categories.length - 1 ? 0 : selectedCatIdx + 1;
                return {
                    ...state,
                    selectedCatIdx: nextIdx,
                    selectedRuleIdx: 0,
                    scrollRule: 0,
                    scrollCat: updateScroll(nextIdx, state.scrollCat, catViewHeight)
                };
            } else if (activePane === 1) {
                const nextIdx = selectedRuleIdx === currentRules.length - 1 ? 0 : selectedRuleIdx + 1;
                return {
                    ...state,
                    selectedRuleIdx: nextIdx,
                    scrollRule: updateScroll(nextIdx, state.scrollRule, viewHeight)
                };
            }
            return state;

        default:
            return state;
    }
}

function getRuleStatus(ruleName, category, config) {
    if (config.rules) {
        let val = config.rules[ruleName];

        // Ignore the prefix to match format in --rules
        if (val === undefined) {
            const foundKey = Object.keys(config.rules).find(key => key.endsWith(`/${ruleName}`));
            if (foundKey) {
                val = config.rules[foundKey];
            }
        }

        if (val !== undefined) {
            if (Array.isArray(val)) return val[0];
            return val;
        }
    }

    if (config.categories && config.categories[category]) {
        return config.categories[category];
    }
    return 'off';
}

function stripJsonComments(json) {
    return json.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
}

function loadRules() {
    let rulesData;
    let config = { rules: {}, categories: {} };

    try {
        const raw = execSync(`npx --yes oxlint@${OXLINT_VERSION} --rules --format=json`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        rulesData = JSON.parse(raw);
    } catch (e) {
        console.error(`${COLORS.error}Error: Could not run 'npx oxlint'. Ensure oxlint is installed.${COLORS.reset}`);
        exit(1);
    }

    const userConfigPath = argv[2];
    let configPathToLoad = null;

    if (userConfigPath) {
        if (!fs.existsSync(userConfigPath)) {
            console.error(`${COLORS.error}Error: Config file '${userConfigPath}' not found.${COLORS.reset}`);
            exit(1);
        }
        configPathToLoad = userConfigPath;
    } else if (fs.existsSync('.oxlintrc.json')) {
        configPathToLoad = '.oxlintrc.json';
    }

    if (configPathToLoad) {
        try {
            const configFile = fs.readFileSync(configPathToLoad, 'utf8');
            const cleanConfig = stripJsonComments(configFile);
            config = JSON.parse(cleanConfig);

        } catch (e) {
            console.error(`${COLORS.error}Error: Failed to parse '${configPathToLoad}'.${COLORS.reset}`);
            console.error(`${COLORS.warn}${e.message}${COLORS.reset}`);
            exit(1);
        }
    }

    try {
        const map = {};

        rulesData.forEach(rule => {
            const cat = rule.category || 'Uncategorized';
            if (!map[cat]) map[cat] = [];

            const status = getRuleStatus(rule.value, cat, config);

            map[cat].push({
                ...rule,
                configStatus: status,
                isActive: status === 'error' || status === 'warn'
            });
        });

        const categories = Object.keys(map).sort();

        categories.forEach(c => {
            map[c].sort((a, b) => {
                if (a.isActive && !b.isActive) return -1;
                if (!a.isActive && b.isActive) return 1;
                return a.value.localeCompare(b.value);
            });
        });

        return { categories, rulesByCategory: map };
    } catch (e) {
        console.error(`${COLORS.error}Error: Something went wrong processing rules.${COLORS.reset}`);
        console.error(e);
        exit(1);
    }
}

function updateScroll(idx, currentScroll, viewHeight) {
    if (idx < currentScroll) return idx;
    if (idx >= currentScroll + viewHeight) return idx - viewHeight + 1;
    return currentScroll;
}

function openUrl(url) {
    if (!url) return;
    const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} "${url}"`);
}

function chunkString(str, len) {
    const size = Math.ceil(str.length / len);
    const r = Array(size);
    for (let i = 0; i < size; i++) {
        r[i] = str.substring(i * len, (i + 1) * len);
    }
    return r;
}

const write = (str) => stdout.write(str);
const enterAltScreen = () => write('\x1b[?1049h\x1b[?25l');
const exitAltScreen = () => write('\x1b[?1049l\x1b[?25h');

function drawBox(buffer, x, y, width, height, title, items, selectedIdx, scrollOffset, isActive) {
    const borderColor = isActive ? COLORS.borderActive : COLORS.borderInactive;
    const titleClean = title.length > width - 6 ? title.substring(0, width - 7) + '…' : title;

    const topBorder = `${borderColor}┌─ ${titleClean} `.padEnd(width + borderColor.length - 1, '─');
    buffer.push(`\x1b[${y};${x}H${topBorder}┐${COLORS.reset}`);

    for (let i = 1; i < height - 1; i++) {
        buffer.push(`\x1b[${y + i};${x}H${borderColor}│${' '.repeat(width - 2)}│${COLORS.reset}`);
    }
    buffer.push(`\x1b[${y + height - 1};${x}H${borderColor}└${'─'.repeat(width - 2)}┘${COLORS.reset}`);

    const innerHeight = height - 2;

    items.slice(scrollOffset, scrollOffset + innerHeight).forEach((item, i) => {
        const absIdx = scrollOffset + i;
        const rawText = (item.value || item).toString();
        let display = rawText.length > width - 4 ? rawText.substring(0, width - 5) + '…' : rawText.padEnd(width - 4);

        let itemColor = COLORS.dim;
        if (item.configStatus === 'error') itemColor = COLORS.error;
        else if (item.configStatus === 'warn') itemColor = COLORS.warn;
        else if (item.isActive) itemColor = COLORS.success;

        buffer.push(`\x1b[${y + 1 + i};${x + 2}H`);

        if (absIdx === selectedIdx) {
            buffer.push(isActive
                ? `${COLORS.selectedBg}${display}${COLORS.reset}`
                : `${COLORS.dim}\x1b[7m${display}${COLORS.reset}`);
        } else {
            buffer.push(`${itemColor}${display}${COLORS.reset}`);
        }
    });
}

function drawStats(buffer, x, y, width, height, rules) {
    const borderColor = COLORS.borderInactive;

    const topBorder = `${borderColor}┌─ STATS `.padEnd(width + borderColor.length - 1, '─');
    buffer.push(`\x1b[${y};${x}H${topBorder}┐${COLORS.reset}`);

    for (let i = 1; i < height - 1; i++) buffer.push(`\x1b[${y + i};${x}H${borderColor}│${' '.repeat(width - 2)}│${COLORS.reset}`);
    buffer.push(`\x1b[${y + height - 1};${x}H${borderColor}└${'─'.repeat(width - 2)}┘${COLORS.reset}`);

    let counts = { error: 0, warn: 0, off: 0 };
    rules.forEach(r => {
        if (r.configStatus === 'error') counts.error++;
        else if (r.configStatus === 'warn') counts.warn++;
        else counts.off++;
    });

    const lines = [
        { label: 'Error', count: counts.error, color: COLORS.error },
        { label: 'Warn', count: counts.warn, color: COLORS.warn },
        { label: 'Off', count: counts.off, color: COLORS.dim }
    ];

    lines.forEach((line, i) => {
        if (i < height - 2) {
            const numStr = String(line.count).padStart(3);
            const labelStr = line.label.padEnd(width - 8);
            buffer.push(`\x1b[${y + 1 + i};${x + 2}H${line.color}${labelStr}${numStr}${COLORS.reset}`);
        }
    });
}

function drawDetails(buffer, x, y, width, height, rule, isActive) {
    const borderColor = isActive ? COLORS.borderActive : COLORS.borderInactive;

    const topBorder = `${borderColor}┌─ DETAILS `.padEnd(width + borderColor.length - 1, '─');
    buffer.push(`\x1b[${y};${x}H${topBorder}┐${COLORS.reset}`);

    for (let i = 1; i < height - 1; i++) buffer.push(`\x1b[${y + i};${x}H${borderColor}│${' '.repeat(width - 2)}│${COLORS.reset}`);
    buffer.push(`\x1b[${y + height - 1};${x}H${borderColor}└${'─'.repeat(width - 2)}┘${COLORS.reset}`);

    if (!rule) return;

    let statusDisplay = rule.configStatus.toUpperCase();
    if (rule.configStatus === 'error') statusDisplay = `${COLORS.error}${statusDisplay}${COLORS.reset}`;
    else if (rule.configStatus === 'warn') statusDisplay = `${COLORS.warn}${statusDisplay}${COLORS.reset}`;
    else statusDisplay = `${COLORS.dim}${statusDisplay}${COLORS.reset}`;

    const labels = [
        ['Name', rule.value],
        ['Status', statusDisplay],
        ['Category', rule.category],
        ['Scope', rule.scope],
        ['Fix', rule.fix],
        ['Default', rule.default ? 'Yes' : 'No'],
        ['Type-aware', rule.type_aware ? 'Yes' : 'No'],
        ['Docs', `Hit ${COLORS.highlight}ENTER${COLORS.reset} to open docs`]
    ];

    let line = 0;
    labels.forEach(([lbl, val]) => {
        if (lbl === 'Status') {
            if (line < height - 2) {
                buffer.push(`\x1b[${y + 1 + line};${x + 2}H${COLORS.highlight}${lbl.padEnd(10)} ${COLORS.reset}${val}`);
                line++;
            }
            return;
        }

        const chunks = chunkString(String(val || 'N/A'), width - 15);
        chunks.forEach((chunk, i) => {
            if (line < height - 2) {
                buffer.push(`\x1b[${y + 1 + line};${x + 2}H${i === 0 ? COLORS.highlight + lbl.padEnd(10) : ' '.repeat(10)} ${COLORS.reset}${chunk}`);
                line++;
            }
        });
    });
}

function render() {
    const { columns, rows } = stdout;
    const currentCat = state.categories[state.selectedCatIdx];
    const rules = state.rulesByCategory[currentCat] || [];
    const rule = rules[state.selectedRuleIdx];

    const boxHeight = rows - 4;

    const col1W = Math.floor(columns * 0.2);
    const col2W = Math.floor(columns * 0.3);
    const col3W = columns - col1W - col2W - 2;

    const statsHeight = 6;
    const catListHeight = boxHeight - statsHeight;

    const buffer = ['\x1b[H\x1b[J'];

    drawBox(buffer, 1, 1, col1W, catListHeight, 'CATEGORIES', state.categories, state.selectedCatIdx, state.scrollCat, state.activePane === 0);
    drawStats(buffer, 1, 1 + catListHeight, col1W, statsHeight, rules);
    drawBox(buffer, col1W + 1, 1, col2W, boxHeight, `RULES (${rules.length})`, rules, state.selectedRuleIdx, state.scrollRule, state.activePane === 1);
    drawDetails(buffer, col1W + col2W + 1, 1, col3W, boxHeight, rule, state.activePane === 2);
    buffer.push(`\x1b[${rows - 2};2H${COLORS.dim}Nav: Arrows/HJKL | Enter: Docs | Q: Quit${COLORS.reset}`);
    write(buffer.join(''));
}

let state = {
    activePane: 0,
    selectedCatIdx: 0,
    selectedRuleIdx: 0,
    scrollCat: 0,
    scrollRule: 0,
    ...loadRules()
};

readline.emitKeypressEvents(stdin);
if (stdin.isTTY) stdin.setRawMode(true);

stdin.on('keypress', (_, key) => {
    const action = KEY_MAP[key.name] || (key.ctrl && key.name === 'c' ? { type: 'EXIT' } : null);
    if (!action) return;

    if (action.type === 'EXIT') {
        exitAltScreen();
        exit(0);
    }

    if (action.type === 'OPEN_DOCS') {
        const currentCat = state.categories[state.selectedCatIdx];
        const rule = state.rulesByCategory[currentCat]?.[state.selectedRuleIdx];
        if (rule) openUrl(rule.docs_url || rule.url);
        return;
    }

    state = reducer(state, action);
    render();
});

stdout.on('resize', render);
enterAltScreen();
render();