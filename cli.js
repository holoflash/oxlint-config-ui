#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PORT = 1337;

const server = createServer(async (req, res) => {
    try {
        const rules = JSON.parse(execSync('npx oxlint --rules --format=json', { encoding: 'utf8' }));
        const template = await readFile(join(import.meta.dirname, 'index.html'), 'utf8');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(template.replace('/* [[INJECT_DATA]] */ []', JSON.stringify(rules)));
    } catch (err) {
        res.writeHead(500);
        res.end(err.message);
    }
});

server.listen(PORT, () => {
    console.log(`OxLint Rules UI: http://localhost:${PORT}`);
});