import { describe, expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const DEPENDENCIES = new Set([
  '@supabase/supabase-js', 'fs', 'node:http', 'os', 'path', './config.ts', 'open',
]);
const FORBIDDEN_GLOBALS = new Set([
  'Bun', 'fetch', 'global', 'globalThis', 'eval', 'Function', '__dirname', '__filename',
]);

function compileLogin(source: string): string {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: false,
    },
    fileName: 'auth.fixture.ts',
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.some(item => item.category === ts.DiagnosticCategory.Error), false);
  const parsed = ts.createSourceFile('auth.fixture.js', compiled.outputText, ts.ScriptTarget.ES2022, true);

  function validate(node: ts.Node) {
    assert.notEqual(node.kind, ts.SyntaxKind.ImportKeyword, 'Native imports are forbidden');
    assert.equal(ts.isImportDeclaration(node), false, 'Native imports are forbidden');
    if (ts.isIdentifier(node)) {
      assert.equal(FORBIDDEN_GLOBALS.has(node.text), false, `Forbidden capability: ${node.text}`);
      if (node.text === 'require') {
        const call = node.parent;
        assert.ok(ts.isCallExpression(call) && call.expression === node, 'Loader aliases are forbidden');
        assert.equal(call.arguments.length, 1);
        const dependency = call.arguments[0];
        assert.ok(ts.isStringLiteral(dependency), 'Computed dependencies are forbidden');
        assert.ok(DEPENDENCIES.has(dependency.text), `Unexpected dependency: ${dependency.text}`);
      }
    }
    ts.forEachChild(node, validate);
  }
  validate(parsed);
  return compiled.outputText;
}

// The child gets compiled source and a closed loader, never the production module or native fs.
const LOGIN_SCRIPT = `
  import assert from 'node:assert/strict';
  import { Script } from 'node:vm';
  import { EventEmitter } from 'node:events';
  import { randomUUID } from 'node:crypto';
  import { posix } from 'node:path';

  const APP_URL = 'https://app.example.invalid';
  const AUTH_URL = 'https://auth.example.invalid';
  const ANON_KEY = 'fixture-anon-key';
  const FIXTURE_HOME = '/fixture-home';
  const OK = 200;
  const INTERNAL_SERVER_ERROR = 500;
  const user = { id: 'fixture-user', email: 'login@example.invalid' };
  const credentials = {
    access_token: 'fixture-access-token',
    refresh_token: 'fixture-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  };
  let reads = 0;
  let directories = [];
  let writes = [];
  let clients = [];
  let authCalls = [];
  let browserUrls = [];
  let listenerOpen = false;
  let closes = 0;
  let handler;
  let listenRequest;
  let resolveOpened;
  const opened = new Promise(resolve => { resolveOpened = resolve; });
  const timeoutHandle = Symbol('fixture deadline');
  let deadline;
  let timeoutClears = 0;
  const timers = scenario === 'deadline' ? {
    setTimeout: (callback, delay) => { deadline = { callback, delay }; return timeoutHandle; },
    clearTimeout: handle => { assert.equal(handle, timeoutHandle); timeoutClears += 1; },
  } : { setTimeout, clearTimeout };

  function forbidRead() {
    reads += 1;
    throw new Error('Profile reads and deletes are forbidden in this fixture');
  }
  const dependencies = Object.freeze({
    fs: Object.freeze({
      existsSync: forbidRead,
      readFileSync: forbidRead,
      unlinkSync: forbidRead,
      mkdirSync: path => { directories = [...directories, path]; },
      writeFileSync: (path, value) => { writes = [...writes, { path, value }]; },
    }),
    os: Object.freeze({ homedir: () => FIXTURE_HOME }),
    path: Object.freeze({ join: posix.join }),
    './config.ts': Object.freeze({ appUrl: () => APP_URL }),
    '@supabase/supabase-js': Object.freeze({
      createClient: (...args) => {
        clients = [...clients, args];
        return { auth: { getUser: async token => {
          authCalls = [...authCalls, token];
          if (scenario === 'auth-rejected') {
            throw new Error('fixture auth rejected');
          }
          return { data: { user } };
        } } };
      },
    }),
    'node:http': Object.freeze({
      createServer: callback => {
        handler = callback;
        return {
          once: event => { assert.equal(event, 'error'); },
          listen: (port, host, ready) => {
            listenRequest = { port, host };
            listenerOpen = true;
            ready();
          },
          close: ready => { listenerOpen = false; closes += 1; ready(); },
        };
      },
    }),
    open: Object.freeze({
      default: async url => {
        browserUrls = [...browserUrls, url];
        resolveOpened(url);
        if (scenario === 'browser-rejected') {
          throw new Error('fixture browser unavailable');
        }
      },
    }),
  });
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require: specifier => {
      assert.ok(Object.hasOwn(dependencies, specifier), 'Unknown fixture dependency');
      return dependencies[specifier];
    },
    process: Object.freeze({
      env: Object.freeze({ PUBLIC_SUPABASE_URL: AUTH_URL, PUBLIC_SUPABASE_ANON_KEY: ANON_KEY }),
      exit: () => { throw new Error('Fixture must exit naturally'); },
    }),
    Buffer, URL, crypto: Object.freeze({ randomUUID }), ...timers,
  };
  new Script(compiledSource, { filename: 'auth.fixture.cjs' }).runInNewContext(context, {
    contextCodeGeneration: { strings: false, wasm: false },
  });
  const outcome = module.exports.startBrowserLogin(() => {}).then(
    session => ({ session }),
    error => ({ error: error.message }),
  );
  const loginUrl = new URL(await opened);
  assert.equal(loginUrl.origin, APP_URL);
  assert.equal(loginUrl.pathname, '/login');
  assert.equal(loginUrl.searchParams.get('cli_port'), String(listenRequest.port));
  assert.equal(listenRequest.host, '127.0.0.1');
  assert.equal(browserUrls.length, 1);

  if (scenario === 'browser-rejected') {
    assert.match((await outcome).error, /fixture browser unavailable/);
    assert.equal(clients.length, 0);
    assert.equal(authCalls.length, 0);
  } else if (scenario === 'deadline') {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(deadline.delay, 5 * 60 * 1000);
    assert.equal(listenerOpen, true);
    deadline.callback();
    assert.match((await outcome).error, /Timeout:/);
    assert.equal(timeoutClears, 1);
    assert.equal(clients.length, 0);
    assert.equal(authCalls.length, 0);
  } else {
    await new Promise(resolve => setImmediate(resolve));
    const request = Object.assign(new EventEmitter(), { method: 'POST', url: '/session' });
    let response = {};
    const pending = handler(request, {
      writeHead: status => { response = { ...response, status }; },
      end: text => { response = { ...response, text }; },
    });
    request.emit('data', Buffer.from(JSON.stringify({
      ...credentials, state: loginUrl.searchParams.get('cli_state'),
    })));
    request.emit('end');
    await pending;
    const result = await outcome;
    assert.deepEqual(JSON.parse(JSON.stringify(clients)), [[AUTH_URL, ANON_KEY, { auth: { persistSession: false } }]]);
    assert.deepEqual(authCalls, [credentials.access_token]);
    if (scenario === 'success') {
      assert.deepEqual(response, { status: OK, text: 'OK' });
      assert.deepEqual(JSON.parse(JSON.stringify(result.session)), { ...credentials, user });
      assert.deepEqual(directories, [FIXTURE_HOME + '/.config/crumbless']);
      assert.equal(writes.length, 1);
      assert.equal(writes[0].path, directories[0] + '/session.json');
      assert.deepEqual(JSON.parse(writes[0].value), { ...credentials, user });
    } else {
      assert.deepEqual(response, { status: INTERNAL_SERVER_ERROR, text: 'Error' });
      assert.match(result.error, /fixture auth rejected/);
    }
  }
  if (scenario !== 'success') {
    assert.equal(directories.length, 0);
    assert.equal(writes.length, 0);
  }
  assert.equal(reads, 0);
  console.log('LOGIN_DONE:' + scenario);
  console.log('LISTENER_CLOSED:' + (!listenerOpen && closes === 1));
`;

function loginResult(scenario: 'success' | 'auth-rejected' | 'browser-rejected' | 'deadline') {
  const compiledSource = compileLogin(readFileSync(new URL('./auth.ts', import.meta.url), 'utf8'));
  const script = `const scenario = ${JSON.stringify(scenario)};
    const compiledSource = ${JSON.stringify(compiledSource)};
    ${LOGIN_SCRIPT}`;
  return spawnSync('node', ['--input-type=module', '--eval', script], {
    cwd: new URL('..', import.meta.url),
    env: { PATH: process.env.PATH ?? '' },
    encoding: 'utf8',
    timeout: 5_000,
    killSignal: 'SIGKILL',
  });
}

describe('browser login fixture boundary', () => {
  test.each([
    'import { readFileSync } from "node:fs"; export const value = readFileSync("secret");',
    'export const value = import("node:fs");',
    'export const value = Bun.file("secret");',
    'export const value = fetch("https://example.invalid");',
    'export const value = globalThis.process;',
    'const load = require; export const value = load("fs");',
  ])('rejects an uncontrolled capability: %s', (source) => {
    expect(() => compileLogin(source)).toThrow();
  });
});

describe('browser login lifecycle', () => {
  test.each(['success', 'auth-rejected', 'browser-rejected', 'deadline'] as const)(
    'cleans up after %s without profile access',
    (scenario) => {
      const result = loginResult(scenario);
      expect(result.stdout + result.stderr).toContain(`LOGIN_DONE:${scenario}\n`);
      expect((result.error as NodeJS.ErrnoException | undefined)?.code).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('LISTENER_CLOSED:true\n');
    },
    10_000,
  );
});
