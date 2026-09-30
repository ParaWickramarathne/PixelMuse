import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', fullyParallel: false, use: { baseURL: 'http://127.0.0.1:5188', headless: true }, webServer: { command: 'npm.cmd run dev -- --port 5188 --strictPort', url: 'http://127.0.0.1:5188', reuseExistingServer: false }, reporter: 'list' });
