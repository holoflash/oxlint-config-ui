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

const PORT = 0;

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
    if (req.url === '/api/rules') {
        const rules = await getRules();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rules));
        return;
    }

    if (req.url === '/' || req.url === '/index.html') {
        try {
            const html = await readFile(join(__dirname, 'index.html'), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } catch (err) {
            res.writeHead(500);
            res.end('Missing index.html');
        }
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    const port = server.address().port;
    const url = `http://localhost:${port}`;

    console.log(`\n  \x1b[32m✔\x1b[0m  \x1b[1mOxLint GUI\x1b[0m running at: \x1b[36m${url}\x1b[0m\n`);

    const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
    exec(`${start} ${url}`);
});