import * as fs from 'fs';
import * as path from 'path';

/**
 * A zero-dependency helper to parse `.env` files into process.env.
 */
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    // Ignore comments and empty lines
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Split on first '=' sign
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmedLine.substring(0, equalIndex).trim();
    let value = trimmedLine.substring(equalIndex + 1).trim();

    // Strip wrapping quotes if any
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }

    // Only assign if it doesn't already exist in process.env
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Automatically load environment variables
loadEnv();

export const ENV_CONFIG = {
  get BASE_URL(): string {
    return process.env.BASE_URL || 'http://localhost:3000';
  },

  get AUTH_USERNAME(): string {
    return process.env.AUTH_USERNAME || '';
  },

  get AUTH_PASSWORD(): string {
    return process.env.AUTH_PASSWORD || '';
  },

  get API_TIMEOUT(): number {
    return parseInt(process.env.API_TIMEOUT || '15000', 10);
  },

  get ENV(): string {
    return process.env.ENV || 'local';
  }
};
