import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { loadEnv } from '../lib/config.ts';
import { version } from '../package.json';
import { handleMcpFetch } from './http-app.ts';

const original = {
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
  MCP_PUBLIC_URL: process.env.MCP_PUBLIC_URL,
};
beforeAll(async () => {
  process.env.PUBLIC_APP_URL = 'https://crumbless.app';
  await loadEnv();
});
afterEach(() => {
  for (const [name, value] of Object.entries(original)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe('mcp HTTP transport', () => {
  test('health endpoint', async () => {
    const res = await handleMcpFetch(new Request('http://localhost/health'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.mcp).toBe('/mcp');
  });

  test.each([
    [undefined, 'https://crumbless.app'],
    ['http://localhost:5173/', 'http://localhost:5173'],
    ['https://instance.example.invalid', 'https://crumbless.app'],
  ])('oauth metadata with app override %s', async (app, authorizationServer) => {
    if (app === undefined) {
      delete process.env.PUBLIC_APP_URL;
    } else {
      process.env.PUBLIC_APP_URL = app;
    }
    delete process.env.MCP_PUBLIC_URL;

    const res = await handleMcpFetch(
      new Request('http://localhost/.well-known/oauth-protected-resource'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resource).toBe('http://localhost/mcp');
    expect(body.authorization_servers).toEqual([authorizationServer]);
  });

  test('a configured MCP resource keeps the canonical authorization server', async () => {
    delete process.env.PUBLIC_APP_URL;
    process.env.MCP_PUBLIC_URL = 'https://mcp.example.invalid/';

    const res = await handleMcpFetch(
      new Request('http://localhost/.well-known/oauth-protected-resource'),
    );
    const body = await res.json();
    expect(body.resource).toBe('https://mcp.example.invalid/mcp');
    expect(body.authorization_servers).toEqual(['https://crumbless.app']);
  });

  test('initialize + tools/list over streamable HTTP (JSON)', async () => {
    const initRes = await handleMcpFetch(
      new Request('http://localhost/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '0.0.1' },
          },
        }),
      }),
    );
    expect(initRes.status).toBe(200);
    const initBody = await initRes.json();
    expect(initBody.result?.serverInfo?.name).toBe('crumbless');
    expect(initBody.result?.serverInfo?.version).toBe(version);

    const listRes = await handleMcpFetch(
      new Request('http://localhost/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {},
        }),
      }),
    );
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    const names = (listBody.result?.tools ?? []).map((t: { name: string }) => t.name);
    expect(names).toContain('list_brands');
    expect(names).toContain('login');
    expect(names.length).toBeGreaterThan(50);
  });

  test('requires bearer when MCP_REQUIRE_BEARER=1', async () => {
    const prev = process.env.MCP_REQUIRE_BEARER;
    process.env.MCP_REQUIRE_BEARER = '1';
    try {
      const res = await handleMcpFetch(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'test', version: '0.0.1' },
            },
          }),
        }),
      );
      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate') ?? '').toContain('Bearer');
    } finally {
      if (prev === undefined) delete process.env.MCP_REQUIRE_BEARER;
      else process.env.MCP_REQUIRE_BEARER = prev;
    }
  });
});
