import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPTS = {
  'install.sh': readFileSync(new URL('./install.sh', import.meta.url), 'utf8'),
  'install-skill.sh': readFileSync(new URL('./install-skill.sh', import.meta.url), 'utf8'),
};
const INSTALL_TIMEOUT_MS = 5_000;
const BINARY_URL = 'https://github.com/crumblessai/crumbless-cli/releases/latest/download/crumbless-linux-x64';
const RAW_URL = 'https://raw.githubusercontent.com/crumblessai/crumbless-cli/main';
const SKILL_CONTENT = '# Crumbless Skill\n\nControlled download fixture.\n';
const CURSOR_CONTENT = '---\nname: crumbless\ndescription: Controlled download fixture.\n---\n';
const BINARY = `#!/bin/sh
[ "$#" -eq 1 ] && [ "$1" = '--version' ] || exit 97
printf '0.1.0\\n'
${'# Padding to exceed the installer download minimum.\n'.repeat(30)}`;
const SYSTEM_TOOLS = ['bash', 'sh', 'mkdir', 'mktemp', 'wc', 'tr', 'chmod', 'mv', 'rm', 'cat', 'dirname', 'grep', 'cp'];
const INVOCATIONS = ['pipe', 'file'] as const;
type Invocation = typeof INVOCATIONS[number];
type Downloads = 'cli' | 'none' | 'project' | 'global';

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function skillDownloads(dir: string, scope: 'project' | 'global') {
  const target = scope === 'global'
    ? join(dir, 'home/.cursor/skills/crumbless')
    : '.cursor/skills/crumbless';
  return [
    { args: ['-sSL', `${RAW_URL}/skills/crumbless-cli.md`], content: SKILL_CONTENT, output: '' },
    { args: ['-sSL', `${RAW_URL}/skills/crumbless/SKILL.md`, '-o', `${target}/SKILL.md`], content: CURSOR_CONTENT, output: `${target}/SKILL.md` },
    ...['mcp.md', 'tools.md', 'cli.md'].map(name => ({
      args: ['-sSL', `${RAW_URL}/skills/crumbless/references/${name}`, '-o', `${target}/references/${name}`],
      content: `Fixture reference: ${name}\n`,
      output: `${target}/references/${name}`,
    })),
    ...(scope === 'project' ? [{ args: ['-sSL', `${RAW_URL}/llms.txt`, '-o', 'llms.txt'], content: 'Fixture llms.txt\n', output: 'llms.txt' }] : []),
  ];
}

function makeCurl(dir: string, downloads: Downloads) {
  const responses = downloads === 'project' || downloads === 'global' ? skillDownloads(dir, downloads) : [];
  const cases = responses.map(({ args, content, output }) => `
    ${shellQuote(`${args.length}|${args.join(' ')}`)})
      printf '%s' ${shellQuote(content)}${output ? ` > ${shellQuote(output)}` : ''}
      exit 0 ;;
  `).join('');
  writeFileSync(join(dir, 'bin/curl'), `#!/bin/bash
set -euo pipefail
printf '%s\\n' "$*" >> "$FIXTURE_ROOT/curl.calls"
if [[ "$FIXTURE_DOWNLOADS" == cli && "$#" == 4 && "$1" == -sSL && "$2" == -o && "$4" == '${BINARY_URL}' ]]; then
  if [[ "$(dirname "$3")" == "$TMPDIR" && -f "$3" && ! -L "$3" ]]; then
    cp "$FIXTURE_ROOT/binary" "$3"
    exit 0
  fi
fi
case "$#|$*" in${cases}
esac
printf 'Unexpected curl: %s\\n' "$*" >> "$FIXTURE_ROOT/blocked.calls"
printf 'Unexpected curl: %s\\n' "$*" >&2
exit 97
`, { mode: 0o755 });
}

function makeInstallDir(downloads: Downloads) {
  const dir = mkdtempSync(join(tmpdir(), 'crumbless-install-test-'));
  for (const path of ['scripts', 'bin', 'home', 'tmp', 'project', 'project/.cursor']) {
    mkdirSync(join(dir, path), { recursive: true });
  }
  for (const [name, script] of Object.entries(SCRIPTS)) {
    writeFileSync(join(dir, 'scripts', name), script);
  }
  for (const name of SYSTEM_TOOLS) {
    const command = Bun.which(name, { PATH: '/usr/bin:/bin' });
    if (!command) {
      throw new Error(`Installer tests require ${name}`);
    }
    symlinkSync(command, join(dir, 'bin', name));
  }
  for (const name of ['sudo', 'wget']) {
    writeFileSync(join(dir, 'bin', name), `#!/bin/sh\nprintf '%s\\n' '${name}' >> "$FIXTURE_ROOT/blocked.calls"\nexit 97\n`, { mode: 0o755 });
  }
  writeFileSync(join(dir, 'bin/uname'), '#!/bin/sh\ncase "$*" in -s) printf "Linux\\n" ;; -m) printf "x86_64\\n" ;; *) exit 97 ;; esac\n', { mode: 0o755 });
  for (const name of ['.bashrc', '.bash_profile', '.zshrc', '.profile']) {
    writeFileSync(join(dir, 'home', name), '# Preserve this fixture profile.\n');
  }
  for (const name of ['CLAUDE.md', 'AGENTS.md', '.cursorrules']) {
    writeFileSync(join(dir, 'project', name), 'Preserve these project instructions.\n');
  }
  writeFileSync(join(dir, 'binary'), BINARY);
  writeFileSync(join(dir, 'curl.calls'), '');
  writeFileSync(join(dir, 'blocked.calls'), '');
  makeCurl(dir, downloads);
  return dir;
}

function installEnv(dir: string, downloads: Downloads) {
  return {
    HOME: join(dir, 'home'),
    TMPDIR: join(dir, 'tmp'),
    PATH: join(dir, 'bin'),
    SHELL: '/bin/bash',
    LC_ALL: 'C',
    FIXTURE_ROOT: dir,
    FIXTURE_DOWNLOADS: downloads,
  };
}

function runInstall(dir: string, script: keyof typeof SCRIPTS, invocation: Invocation, args: string[], downloads: Downloads) {
  const source = invocation === 'pipe' ? ['-s', '--'] : [join(dir, 'scripts', script)];
  return spawnSync(join(dir, 'bin/bash'), ['--noprofile', '--norc', ...source, ...args], {
    cwd: join(dir, 'project'),
    env: installEnv(dir, downloads),
    input: invocation === 'pipe' ? SCRIPTS[script] : '',
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8',
    timeout: INSTALL_TIMEOUT_MS,
  });
}

function snapshot(dir: string): Record<string, unknown> {
  return Object.fromEntries(readdirSync(dir, { withFileTypes: true }).map(entry => [
    entry.name,
    entry.isDirectory() ? snapshot(join(dir, entry.name)) : readFileSync(join(dir, entry.name), 'utf8'),
  ]));
}

function downloadCalls(dir: string) {
  return readFileSync(join(dir, 'curl.calls'), 'utf8').split('\n').filter(Boolean);
}

function expectFinished(result: ReturnType<typeof runInstall>) {
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  expect(result.stderr).toBe('');
}

describe('CLI installer without a terminal', () => {
  test.each([...INVOCATIONS])('installs only the binary with %s input and completes successfully', invocation => {
    const dir = makeInstallDir('cli');
    try {
      const home = snapshot(join(dir, 'home'));
      const project = snapshot(join(dir, 'project'));
      const destination = join(dir, 'installed');
      const result = runInstall(dir, 'install.sh', invocation, ['--dir', destination], 'cli');

      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(readFileSync(join(destination, 'crumbless'), 'utf8')).toBe(BINARY);
      expect(statSync(join(destination, 'crumbless')).size).toBeGreaterThan(1_000);
      const version = spawnSync(join(destination, 'crumbless'), ['--version'], {
        cwd: join(dir, 'project'), env: installEnv(dir, 'cli'), encoding: 'utf8', timeout: INSTALL_TIMEOUT_MS,
      });
      expect(version.error).toBeUndefined();
      expect(version.status).toBe(0);
      expect(version.stdout).toBe('0.1.0\n');
      expect(readFileSync(join(dir, 'blocked.calls'), 'utf8')).toBe('');
      expect(downloadCalls(dir)).toHaveLength(1);
      expect(downloadCalls(dir)[0]).toEndWith(` ${BINARY_URL}`);
      expect(snapshot(join(dir, 'home'))).toEqual(home);
      expect(snapshot(join(dir, 'project'))).toEqual(project);
      expectFinished(result);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('skill installer without a terminal', () => {
  test.each([...INVOCATIONS])('requires explicit scope before downloads or writes with %s input', invocation => {
    const dir = makeInstallDir('none');
    try {
      const home = snapshot(join(dir, 'home'));
      const project = snapshot(join(dir, 'project'));
      const result = runInstall(dir, 'install-skill.sh', invocation, [], 'none');

      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(downloadCalls(dir), result.stderr).toEqual([]);
      expect(readFileSync(join(dir, 'blocked.calls'), 'utf8')).toBe('');
      expect(snapshot(join(dir, 'home'))).toEqual(home);
      expect(snapshot(join(dir, 'project'))).toEqual(project);
      const output = `${result.stdout}\n${result.stderr}`;
      expect(output).toContain('--project');
      expect(output).toContain('--global');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  for (const scope of ['project', 'global'] as const) {
    test.each([...INVOCATIONS])(`explicit --${scope} installs controlled downloads with %s input`, invocation => {
      const dir = makeInstallDir(scope);
      try {
        const untouched = join(dir, scope === 'global' ? 'project' : 'home');
        const before = snapshot(untouched);
        const result = runInstall(dir, 'install-skill.sh', invocation, [`--${scope}`], scope);
        const target = join(dir, scope === 'global' ? 'home' : 'project');

        expect(readFileSync(join(dir, 'blocked.calls'), 'utf8')).toBe('');
        expect(downloadCalls(dir).sort()).toEqual(skillDownloads(dir, scope).map(reply => reply.args.join(' ')).sort());
        expect(readFileSync(join(target, '.claude/skills/crumbless-cli.md'), 'utf8')).toBe(SKILL_CONTENT);
        expect(readFileSync(join(target, '.cursor/skills/crumbless/SKILL.md'), 'utf8')).toBe(CURSOR_CONTENT);
        for (const name of ['mcp.md', 'tools.md', 'cli.md']) {
          expect(readFileSync(join(target, '.cursor/skills/crumbless/references', name), 'utf8')).toBe(`Fixture reference: ${name}\n`);
        }
        expect(snapshot(untouched)).toEqual(before);
        expectFinished(result);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});
