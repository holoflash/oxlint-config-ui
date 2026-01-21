#!/usr/bin/env node

import { execSync, exec } from 'node:child_process';
import { stdout, stdin, exit, platform } from 'node:process';
import readline from 'node:readline';

const COLORS = {
    reset: '\x1b[0m',
    dim: '\x1b[90m',
    highlight: '\x1b[38;5;110m',
    selectedBg: '\x1b[47m\x1b[30m',
    borderActive: '\x1b[36m',
    borderInactive: '\x1b[90m',
    error: '\x1b[31m',
};

function loadRules() {
    try {
        const raw = execSync('npx oxlint --rules --format=json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const data = JSON.parse(raw);

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
        console.error(`${COLORS.error}Error: Could not run 'npx oxlint'. Is it installed?${COLORS.reset}`);
        exit(1);
    }
}

const state = {
    activePane: 0,
    selectedCatIdx: 0,
    selectedRuleIdx: 0,
    scrollCat: 0,
    scrollRule: 0,
    ...loadRules()
};

const write = (str) => stdout.write(str);
const enterAltScreen = () => write('\x1b[?1049h\x1b[?25l');
const exitAltScreen = () => write('\x1b[?1049l\x1b[?25h');

function openUrl(url) {
    if (!url) return;
    const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} "${url}"`, (err) => { });
}

function chunkString(str, len) {
    const size = Math.ceil(str.length / len);
    const r = Array(size);
    let offset = 0;
    for (let i = 0; i < size; i++) {
        r[i] = str.substring(offset, offset + len);
        offset += len;
    }
    return r;
}

function drawBox(buffer, x, y, width, height, title, items, selectedIdx, scrollOffset, isActive) {
    const borderColor = isActive ? COLORS.borderActive : COLORS.borderInactive;

    const maxTitleLen = Math.max(0, width - 6);
    const titleClean = title.length > maxTitleLen ? title.substring(0, maxTitleLen - 1) + '…' : title;
    const header = `┌─ ${titleClean} `.padEnd(width - 1, '─') + '┐';

    buffer.push(`\x1b[${y};${x}H${borderColor}${header}${COLORS.reset}`);

    for (let i = 1; i < height - 1; i++) {
        buffer.push(`\x1b[${y + i};${x}H${borderColor}│${' '.repeat(width - 2)}│${COLORS.reset}`);
    }
    buffer.push(`\x1b[${y + height - 1};${x}H${borderColor}└${'─'.repeat(width - 2)}┘${COLORS.reset}`);

    const innerHeight = height - 2;
    const visibleItems = items.slice(scrollOffset, scrollOffset + innerHeight);

    visibleItems.forEach((item, i) => {
        const absoluteIndex = scrollOffset + i;
        const text = (item.value || item).toString();
        const maxTextLen = width - 4;
        const display = text.length > maxTextLen ? text.substring(0, maxTextLen - 1) + '…' : text.padEnd(maxTextLen);

        buffer.push(`\x1b[${y + 1 + i};${x + 2}H`);

        if (absoluteIndex === selectedIdx) {
            if (isActive) {
                buffer.push(`${COLORS.selectedBg}${display}${COLORS.reset}`);
            } else {
                buffer.push(`${COLORS.dim}\x1b[7m${display}${COLORS.reset}`);
            }
        } else {
            buffer.push(`${COLORS.dim}${display}${COLORS.reset}`);
        }
    });
}

function drawDetails(buffer, x, y, width, height, rule, isActive) {
    const borderColor = isActive ? COLORS.borderActive : COLORS.borderInactive;
    const header = `┌─ DETAILS `.padEnd(width - 1, '─') + '┐';

    buffer.push(`\x1b[${y};${x}H${borderColor}${header}${COLORS.reset}`);

    for (let i = 1; i < height - 1; i++) {
        buffer.push(`\x1b[${y + i};${x}H${borderColor}│${' '.repeat(width - 2)}│${COLORS.reset}`);
    }
    buffer.push(`\x1b[${y + height - 1};${x}H${borderColor}└${'─'.repeat(width - 2)}┘${COLORS.reset}`);

    if (!rule) return;

    const labels = [
        ['Name', rule.value],
        ['Category', rule.category],
        ['Scope', rule.scope],
        ['Fix', rule.fix],
        ['Default', rule.default ? 'Yes' : 'No'],
        ['Type-aware', rule.type_aware ? 'Yes' : 'No'],
        ['Docs', `Hit ${COLORS.error}ENTER${COLORS.reset} to open docs in the browser`]
    ];

    let lineOffset = 0;
    const maxContentWidth = width - 4;
    const labelWidth = 10;
    const valueWidth = maxContentWidth - labelWidth - 1;

    labels.forEach((row) => {
        if (lineOffset >= height - 2) return;

        const label = row[0];
        let val = String(row[1] || 'N/A');

        const chunks = chunkString(val, valueWidth);

        chunks.forEach((chunk, chunkIdx) => {
            if (lineOffset >= height - 2) return;

            buffer.push(`\x1b[${y + 1 + lineOffset};${x + 2}H`);

            if (chunkIdx === 0) {
                buffer.push(`${COLORS.highlight}${label.padEnd(labelWidth)}${COLORS.reset} ${chunk}${COLORS.reset}`);
            } else {
                buffer.push(`${' '.repeat(labelWidth + 1)}${chunk}${COLORS.reset}`);
            }
            lineOffset++;
        });
    });
}

function render() {
    const { columns, rows } = stdout;
    const cat = state.categories[state.selectedCatIdx];
    const rules = state.rulesByCategory[cat] || [];
    const rule = rules[state.selectedRuleIdx];

    const margin = 2;
    const boxHeight = rows - 4;
    const col1W = Math.floor(columns * 0.2);
    const col2W = Math.floor(columns * 0.3);
    const col3W = columns - col1W - col2W - (margin * 2);

    const buffer = [];

    buffer.push('\x1b[H\x1b[J');

    drawBox(buffer, 1, 1, col1W, boxHeight, 'CATEGORIES', state.categories, state.selectedCatIdx, state.scrollCat, state.activePane === 0);
    drawBox(buffer, col1W + 1, 1, col2W, boxHeight, `RULES (${rules.length})`, rules, state.selectedRuleIdx, state.scrollRule, state.activePane === 1);
    drawDetails(buffer, col1W + col2W + 1, 1, col3W, boxHeight, rule, state.activePane === 2);

    const footerText = `Nav: Arrows or hjkl | ${COLORS.highlight}Enter: Open Docs${COLORS.dim} | Quit: Q`;
    buffer.push(`\x1b[${rows};2H${COLORS.dim}${footerText}${COLORS.reset}`);

    write(buffer.join(''));
}

function updateScroll(idx, currentScroll, maxItems, viewHeight) {
    if (idx < currentScroll) return idx;
    if (idx >= currentScroll + viewHeight) return idx - viewHeight + 1;
    return currentScroll;
}

readline.emitKeypressEvents(stdin);
if (stdin.isTTY) stdin.setRawMode(true);

stdin.on('keypress', (str, key) => {
    if (key.name === 'q' || key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        exitAltScreen();
        exit(0);
    }

    const currentCat = state.categories[state.selectedCatIdx];
    const currentRules = state.rulesByCategory[currentCat] || [];
    const rule = currentRules[state.selectedRuleIdx];
    const viewHeight = stdout.rows - 6;

    if (key.name === 'return' || key.name === 'enter') {
        if (rule && (rule.docs_url || rule.url)) {
            openUrl(rule.docs_url || rule.url);
        }
        return;
    }

    if (key.name === 'right' || key.name === 'l') state.activePane = Math.min(2, state.activePane + 1);
    if (key.name === 'left' || key.name === 'h') state.activePane = Math.max(0, state.activePane - 1);

    if (key.name === 'up' || key.name === 'k') {
        if (state.activePane === 0) {
            state.selectedCatIdx = state.selectedCatIdx === 0 ? state.categories.length - 1 : state.selectedCatIdx - 1;
            state.selectedRuleIdx = 0;
            state.scrollRule = 0;
            state.scrollCat = updateScroll(state.selectedCatIdx, state.scrollCat, state.categories.length, viewHeight);
        } else if (state.activePane === 1) {
            state.selectedRuleIdx = state.selectedRuleIdx === 0 ? currentRules.length - 1 : state.selectedRuleIdx - 1;
            state.scrollRule = updateScroll(state.selectedRuleIdx, state.scrollRule, currentRules.length, viewHeight);
        }
    }

    if (key.name === 'down' || key.name === 'j') {
        if (state.activePane === 0) {
            state.selectedCatIdx = state.selectedCatIdx === state.categories.length - 1 ? 0 : state.selectedCatIdx + 1;
            state.selectedRuleIdx = 0;
            state.scrollRule = 0;
            state.scrollCat = updateScroll(state.selectedCatIdx, state.scrollCat, state.categories.length, viewHeight);
        } else if (state.activePane === 1) {
            state.selectedRuleIdx = state.selectedRuleIdx === currentRules.length - 1 ? 0 : state.selectedRuleIdx + 1;
            state.scrollRule = updateScroll(state.selectedRuleIdx, state.scrollRule, currentRules.length, viewHeight);
        }
    }

    render();
});

stdout.on('resize', render);

enterAltScreen();
render();