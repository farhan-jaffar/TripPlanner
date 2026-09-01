import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export default async function globalSetup() {
  const dbPath = path.join(rootDir, 'db.e2e.sqlite3');

  // Reset isolated E2E SQLite database file
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (err) {
      console.warn('Could not delete existing db.e2e.sqlite3:', err.message);
    }
  }

  // Run Django migrations against isolated E2E settings
  console.log('Applying migrations to fresh db.e2e.sqlite3...');
  execSync('python manage.py migrate --settings=config.settings_e2e', {
    cwd: rootDir,
    stdio: 'inherit',
  });
  console.log('E2E database initialized.');
}
