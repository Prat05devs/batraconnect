// Hostinger's setup only offers "npm run start" as the build command, so start doubles as build:
// without a production build it builds and exits (the deploy's build step); with one, it starts the server.
// Run "npm run build" yourself after changing code locally; a fresh deploy always starts without .next.
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const next = createRequire(import.meta.url).resolve('next/dist/bin/next');
const command = existsSync('.next/BUILD_ID') ? 'start' : 'build';
console.log(`[start] ${command === 'build' ? 'No production build found: building' : 'Starting the server'}`);
const child = spawn(process.execPath, [next, command], { stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
