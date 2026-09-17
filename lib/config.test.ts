import { afterEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appUrl, authServerUrl, PRODUCTION_URL } from './config.ts';

function configDefaults(overrides: Record<string, string> = {}) {
  const moduleUrl = new URL('./config.ts', import.meta.url).href;
  const script = `
    import { createHash } from 'node:crypto';
    await import(${JSON.stringify(moduleUrl)});
    const key = process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';
    const role = key.startsWith('sb_publishable_') ? 'publishable'
      : key.split('.').length === 3 ? JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role : 'custom';
    console.log(JSON.stringify({
      url: process.env.PUBLIC_SUPABASE_URL,
      keyHash: createHash('sha256').update(key).digest('hex'),
      role,
    }));
  `;
  const result = spawnSync(process.execPath, ['--eval', script], {
    env: { PATH: process.env.PATH ?? '', ...overrides },
    encoding: 'utf8',
    timeout: 5_000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as { url: string; keyHash: string; role: string };
}

describe('public authentication defaults', () => {
  test('matches the public anon configuration served by the running app', () => {
    // Fingerprint of the public browser key verified at www.crumbless.app, not a private credential.
    expect(configDefaults()).toEqual({
      url: 'https://auth.crumbless.app',
      keyHash: '96b13ec57a62fd6204af22cb22143383ca760e4ac8a7d50461799e683bd84bd1',
      role: 'anon',
    });
  });

  test('preserves explicit public auth settings for another instance', () => {
    const result = configDefaults({
      PUBLIC_SUPABASE_URL: 'https://auth.example.invalid',
      PUBLIC_SUPABASE_ANON_KEY: 'fixture-key',
    });
    expect(result.url).toBe('https://auth.example.invalid');
    expect(result.keyHash).toBe(createHash('sha256').update('fixture-key').digest('hex'));
  });
});

const original = process.env.PUBLIC_APP_URL;
afterEach(() => {
  if (original === undefined) delete process.env.PUBLIC_APP_URL;
  else process.env.PUBLIC_APP_URL = original;
});

describe('appUrl', () => {
  // The .ai marketing site returns 404 for the application's login and API routes.
  test('production base is the application origin, not the marketing website', () => {
    expect(PRODUCTION_URL).toBe('https://www.crumbless.app');
    delete process.env.PUBLIC_APP_URL;
    expect(appUrl()).toBe('https://www.crumbless.app');
  });

  test('an explicit PUBLIC_APP_URL wins, trailing slash stripped', () => {
    process.env.PUBLIC_APP_URL = 'http://localhost:5173/';
    expect(appUrl()).toBe('http://localhost:5173');
  });
});

describe('authServerUrl', () => {
  test('announces the same production application origin as the CLI', () => {
    delete process.env.PUBLIC_APP_URL;
    expect(authServerUrl()).toBe('https://www.crumbless.app');
    expect(authServerUrl()).toBe(appUrl());
  });

  test('follows a local dev server so local OAuth works', () => {
    process.env.PUBLIC_APP_URL = 'http://localhost:5173';
    expect(authServerUrl()).toBe('http://localhost:5173');
  });
});
