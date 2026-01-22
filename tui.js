#!/usr/bin/env node

import { execSync, exec } from 'node:child_process';
import { stdout, stdin, exit, platform } from 'node:process';
import readline from 'node:readline';

const COLORS = {
    reset:          '\x1b[0m',
    dim:            '\x1b[90m',
    highlight:      '\x1b[38;5;110m',
    selectedBg:     '\x1b[47m\x1b[30m',
    borderActive:   '\x1b[36m',
    borderInactive: '\x1b[90m',
    error:          '\x1b[31m',
};

const KEY_MAP = {
    'k':      { type: 'MOVE_UP'    },
    'up':     { type: 'MOVE_UP'    },
    'down':   { type: 'MOVE_DOWN'  },
    'j':      { type: 'MOVE_DOWN'  },
    'left':   { type: 'MOVE_LEFT'  },
    'h':      { type: 'MOVE_LEFT'  },
    'right':  { type: 'MOVE_RIGHT' },
    'l':      { type: 'MOVE_RIGHT' },
    'return': { type: 'OPEN_DOCS'  },
    'enter':  { type: 'OPEN_DOCS'  },
    'q':      { type: 'EXIT'       },
    'escape': { type: 'EXIT'       }
};

function reducer(state, action) {
    const { categories, rulesByCategory, selectedCatIdx, selectedRuleIdx, activePane } = state;
    const currentCat = categories[selectedCatIdx];
    const currentRules = rulesByCategory[currentCat] || [];
    const viewHeight = stdout.rows - 6;

    switch (action.type) {
        case 'MOVE_RIGHT':
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
                    scrollCat: updateScroll(nextIdx, state.scrollCat, viewHeight)
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
                    scrollCat: updateScroll(nextIdx, state.scrollCat, viewHeight)
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

function loadRules() {
    try {
        const raw = execSync('npx oxlint --rules --format=json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const data = JSON.parse(raw);
        console.log(data)
        const map = {};
        data.forEach(rule => {
            const cat = rule.category || 'Uncategorized';
            if (!map[cat]) map[cat] = [];
            map[cat].push(rule);
        });
        const categories = Object.keys(map).sort();
        categories.forEach(c => map[c].sort((a, b) => a.value.localeCompare(b.value)));
        return { categories, rulesByCategory: map };
    } catch (e) {
        console.error(`${COLORS.error}Error: Could not run 'npx oxlint'.${COLORS.reset}`);
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
    buffer.push(`\x1b[${y};${x}H${borderColor}┌─ ${titleClean} `.padEnd(width + borderColor.length - 1, '─') + `┐${COLORS.reset}`);

    for (let i = 1; i < height - 1; i++) {
        buffer.push(`\x1b[${y + i};${x}H${borderColor}│${' '.repeat(width - 2)}│${COLORS.reset}`);
    }
    buffer.push(`\x1b[${y + height - 1};${x}H${borderColor}└${'─'.repeat(width - 2)}┘${COLORS.reset}`);

    const innerHeight = height - 2;
    items.slice(scrollOffset, scrollOffset + innerHeight).forEach((item, i) => {
        const absIdx = scrollOffset + i;
        const text = (item.value || item).toString();
        const display = text.length > width - 4 ? text.substring(0, width - 5) + '…' : text.padEnd(width - 4);
        buffer.push(`\x1b[${y + 1 + i};${x + 2}H`);
        if (absIdx === selectedIdx) {
            buffer.push(isActive ? `${COLORS.selectedBg}${display}${COLORS.reset}` : `${COLORS.dim}\x1b[7m${display}${COLORS.reset}`);
        } else {
            buffer.push(`${COLORS.dim}${display}${COLORS.reset}`);
        }
    });
}

function drawDetails(buffer, x, y, width, height, rule, isActive) {
    const borderColor = isActive ? COLORS.borderActive : COLORS.borderInactive;
    buffer.push(`\x1b[${y};${x}H${borderColor}┌─ DETAILS `.padEnd(width + borderColor.length - 1, '─') + `┐${COLORS.reset}`);
    for (let i = 1; i < height - 1; i++) buffer.push(`\x1b[${y + i};${x}H${borderColor}│${' '.repeat(width - 2)}│${COLORS.reset}`);
    buffer.push(`\x1b[${y + height - 1};${x}H${borderColor}└${'─'.repeat(width - 2)}┘${COLORS.reset}`);

    if (!rule) return;
    const labels = [
        ['Name',        rule.value    ],
        ['Category',    rule.category ],
        ['Scope',       rule.scope    ],
        ['Fix',         rule.fix      ],
        ['Default',     rule.default    ? 'Yes' : 'No' ],
        ['Type-aware',  rule.type_aware ? 'Yes' : 'No' ],
        ['Docs',        `Hit ${COLORS.highlight}ENTER${COLORS.reset} to open docs in the browser` ]
    ];
    let line = 0;
    labels.forEach(([lbl, val]) => {
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

    const buffer = ['\x1b[H\x1b[J'];
    drawBox(buffer, 1, 1, col1W, boxHeight, 'CATEGORIES', state.categories, state.selectedCatIdx, state.scrollCat, state.activePane === 0);
    drawBox(buffer, col1W + 1, 1, col2W, boxHeight, `RULES (${rules.length})`, rules, state.selectedRuleIdx, state.scrollRule, state.activePane === 1);
    drawDetails(buffer, col1W + col2W + 1, 1, col3W, boxHeight, rule, state.activePane === 2);

    buffer.push(`\x1b[${rows};2H${COLORS.dim}Nav: Arrows/HJKL | Enter: Docs | Q: Quit${COLORS.reset}`);
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

stdin.on('keypress', (str, key) => {
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