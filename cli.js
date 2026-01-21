#!/usr/bin/env node

import { exec } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 1337;

const getRules = async () => {
    try {
        const { stdout } = await execAsync('npx oxlint --rules --format=json');
        return JSON.parse(stdout);
    } catch (error) {
        console.error("Error running oxlint:", error.message);
        return [];
    }
};

const server = createServer(async (req, res) => {
    try {
        const rules = await getRules();
        let html = await readFile(join(__dirname, 'index.html'), 'utf-8');
        const dataString = JSON.stringify(rules);
        html = html.replace('/* [[INJECT_DATA]] */ []', dataString);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } catch (err) {
        console.error(err);
        res.writeHead(500);
        res.end('Internal Server Error: ' + err.message);
    }
    return;
});

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`OxLint Rules UI running at: ${url}`);
});