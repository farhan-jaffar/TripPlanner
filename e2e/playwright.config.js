import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.js',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
      },
    },
  ],
  webServer: [
    {
      command: 'python manage.py runserver 127.0.0.1:8000 --settings=config.settings_e2e',
      cwd: rootDir,
      url: 'http://127.0.0.1:8000/api/v1/schema/',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command:
        process.platform === 'win32'
          ? 'npm.cmd run dev -- --host 127.0.0.1 --port 5173'
          : 'npm run dev -- --host 127.0.0.1 --port 5173',
      cwd: path.join(rootDir, 'frontend'),
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
