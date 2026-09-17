import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

const BUILD_SCRIPT = readFileSync(new URL('./build.ts', import.meta.url), 'utf8');
const BUILD_TIMEOUT_MS = 5_000;
const TARGETS = {
  'macos-arm64': 'bun-darwin-arm64',
  'macos-x64': 'bun-darwin-x64',
  'linux-x64': 'bun-linux-x64',
  'linux-arm64': 'bun-linux-arm64',
};
const COMPILE_OK = `
out=''
target=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    --outfile) out="$2"; shift 2 ;;
    --target) target="$2"; shift 2 ;;
    *) shift ;;
  esac
done
[ -n "$out" ] && [ -n "$target" ] || exit 2
printf '%s|%s\\n' "$target" "$out" >> compiler.calls
printf 'binary:%s\\n' "$target" > "$out"
`;

function makeBuildDir(compiler: string, archiver = 'printf "archive\\n" > "$2"') {
  const dir = mkdtempSync(join(tmpdir(), 'crumbless-build-test-'));
  mkdirSync(join(dir, 'scripts'));
  mkdirSync(join(dir, 'bin'));
  mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'scripts/build.ts'), BUILD_SCRIPT);
  writeFileSync(join(dir, 'cli.ts'), 'export {};\n');
  writeFileSync(join(dir, 'README.md'), 'Fixture CLI\n');
  writeFileSync(join(dir, 'bin/bun'), `#!/bin/sh\n${compiler}\n`, { mode: 0o755 });
  writeFileSync(join(dir, 'bin/tar'), `#!/bin/sh\n${archiver}\n`, { mode: 0o755 });
  return dir;
}

function runBuild(dir: string, args: string[] = ['--all'], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [join(dir, 'scripts/build.ts'), ...args], {
    cwd: dir,
    env: { ...process.env, ...env, PATH: `${join(dir, 'bin')}${delimiter}${process.env.PATH ?? ''}` },
    encoding: 'utf8',
    timeout: BUILD_TIMEOUT_MS,
  });
}

describe('standalone CLI build', () => {
  test('a compiler failure fails the build even when it leaves a nonempty binary', () => {
    const dir = makeBuildDir(`${COMPILE_OK}\nexit 23`);
    try {
      const result = runBuild(dir);
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.stderr).toContain('Failed to build crumbless-macos-arm64');
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(result.stdout).not.toContain('Done!');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('an archive failure fails the build even when it leaves a nonempty archive', () => {
    const dir = makeBuildDir(COMPILE_OK, 'printf "partial archive\\n" > "$2"; exit 24');
    try {
      const result = runBuild(dir);
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.stderr).toContain('Failed to archive crumbless-macos-arm64');
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(result.stdout).not.toContain('Done!');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test.each(['missing', 'empty'] as const)('a successful compiler with %s output fails the build', (output) => {
    const compiler = output === 'missing' ? 'exit 0' : `${COMPILE_OK}\n: > "$out"`;
    const dir = makeBuildDir(compiler);
    try {
      const result = runBuild(dir);
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Missing or empty build output:');
      expect(result.stderr).toContain('crumbless-macos-arm64');
      expect(result.stdout).not.toContain('Done!');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test.each(['missing', 'empty'] as const)('a successful archiver with %s output fails the build', (output) => {
    const archiver = output === 'missing' ? 'exit 0' : ': > "$2"';
    const dir = makeBuildDir(COMPILE_OK, archiver);
    try {
      const result = runBuild(dir);
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Missing or empty build output:');
      expect(result.stderr).toContain('crumbless-macos-arm64.tar.gz');
      expect(result.stdout).not.toContain('Done!');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test.each(['binary', 'archive'] as const)('a stale %s cannot replace missing fresh output', (output) => {
    const compiler = output === 'binary' ? 'exit 0' : COMPILE_OK;
    const dir = makeBuildDir(compiler, output === 'archive' ? 'exit 0' : undefined);
    try {
      mkdirSync(join(dir, 'dist'));
      for (const name of Object.keys(TARGETS)) {
        writeFileSync(join(dir, `dist/crumbless-${name}`), 'stale binary');
        writeFileSync(join(dir, `dist/crumbless-${name}.tar.gz`), 'stale archive');
      }

      const result = runBuild(dir);
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Missing or empty build output:');
      const suffix = output === 'archive' ? '.tar.gz' : '';
      expect(result.stderr).toContain(`crumbless-macos-arm64${suffix}`);
      expect(result.stdout).not.toContain('Done!');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('an earlier binary disappearing before archiving fails the complete build', () => {
    const compiler = `${COMPILE_OK}
if [ "$target" = bun-linux-arm64 ]; then
  rm -f dist/crumbless-macos-arm64
fi`;
    const dir = makeBuildDir(compiler);
    try {
      const result = runBuild(dir);
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Missing or empty build output:');
      expect(result.stderr).toContain('crumbless-macos-arm64');
      expect(result.stdout).not.toContain('Done!');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test.each(['compiler', 'archiver'] as const)('a later %s failure cannot be overwritten by earlier successes', (stage) => {
    const compiler = stage === 'compiler'
      ? `${COMPILE_OK}\nif [ "$target" = bun-linux-x64 ]; then exit 23; fi`
      : COMPILE_OK;
    const archiver = stage === 'archiver'
      ? 'printf "archive\\n" > "$2"; if [ "$5" = crumbless-linux-x64 ]; then exit 24; fi'
      : undefined;
    const dir = makeBuildDir(compiler, archiver);
    try {
      const result = runBuild(dir);
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain('✓ crumbless-macos-arm64');
      expect(result.stdout).toContain('✓ crumbless-macos-x64');
      const operation = stage === 'compiler' ? 'build' : 'archive';
      expect(result.stderr).toContain(`Failed to ${operation} crumbless-linux-x64`);
      expect(result.stdout).not.toContain('Done!');
      const calls = readFileSync(join(dir, 'compiler.calls'), 'utf8').trim().split('\n');
      expect(calls).toHaveLength(stage === 'compiler' ? 3 : 4);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  const host = Object.entries(TARGETS).find(([, target]) => target === `bun-${process.platform}-${process.arch}`);
  for (const { label, args, names } of [
    { label: '--all', args: ['--all'], names: Object.keys(TARGETS) },
    { label: '--linux', args: ['--linux'], names: ['linux-x64', 'linux-arm64'] },
    { label: '--mac', args: ['--mac'], names: ['macos-arm64', 'macos-x64'] },
    { label: 'the current host', args: [], names: host ? [host[0]] : [] },
  ]) {
    test(`builds exactly the fresh binaries and archives selected by ${label}`, () => {
      const dir = makeBuildDir(COMPILE_OK);
      try {
        const result = runBuild(dir, args);
        expect(result.error).toBeUndefined();
        expect(result.signal).toBeNull();
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('Done!');
        expect(names.length).toBeGreaterThan(0);

        const outputs = readdirSync(join(dir, 'dist')).filter(name => name.startsWith('crumbless-')).sort();
        const expected = names.flatMap(name => [`crumbless-${name}`, `crumbless-${name}.tar.gz`]).sort();
        expect(outputs).toEqual(expected);
        for (const name of names) {
          expect(readFileSync(join(dir, `dist/crumbless-${name}`), 'utf8')).toBe(`binary:${TARGETS[name as keyof typeof TARGETS]}\n`);
          expect(readFileSync(join(dir, `dist/crumbless-${name}.tar.gz`), 'utf8')).toBe('archive\n');
        }
        const calls = readFileSync(join(dir, 'compiler.calls'), 'utf8').trim().split('\n');
        expect(calls).toEqual(names.map(name => `${TARGETS[name as keyof typeof TARGETS]}|${join(dir, `dist/crumbless-${name}`)}`));
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  test('optional documentation failure does not reject complete binary output', () => {
    const dir = makeBuildDir(COMPILE_OK);
    try {
      rmSync(join(dir, 'README.md'));
      const result = runBuild(dir);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Could not copy docs:');
      expect(result.stdout).toContain('Done!');
      expect(readdirSync(join(dir, 'dist')).filter(name => name.startsWith('crumbless-'))).toHaveLength(8);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('building one platform leaves other platform artifacts untouched', () => {
    const dir = makeBuildDir(COMPILE_OK);
    try {
      mkdirSync(join(dir, 'dist'));
      writeFileSync(join(dir, 'dist/crumbless-macos-arm64'), 'keep other platform');
      const result = runBuild(dir, ['--linux']);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(readFileSync(join(dir, 'dist/crumbless-macos-arm64'), 'utf8')).toBe('keep other platform');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('real tar archives contain the matching newly built binary', () => {
    const tar = Bun.which('tar');
    if (!tar) {
      throw new Error('The build requires tar on PATH');
    }
    const dir = makeBuildDir(COMPILE_OK, 'exec "$REAL_TAR" "$@"');
    try {
      const result = runBuild(dir, ['--all'], { REAL_TAR: tar });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      for (const [name, target] of Object.entries(TARGETS)) {
        const archive = join(dir, `dist/crumbless-${name}.tar.gz`);
        const listing = spawnSync(tar, ['-tzf', archive], { encoding: 'utf8', timeout: BUILD_TIMEOUT_MS });
        expect(listing.status).toBe(0);
        expect(listing.stdout).toBe(`crumbless-${name}\n`);
        const contents = spawnSync(tar, ['-xOzf', archive, `crumbless-${name}`], { encoding: 'utf8', timeout: BUILD_TIMEOUT_MS });
        expect(contents.status).toBe(0);
        expect(contents.stdout).toBe(`binary:${target}\n`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('verification lists every existing output without rebuilding or replacing it', () => {
    const dir = makeBuildDir('exit 37', 'exit 38');
    try {
      mkdirSync(join(dir, 'dist'));
      const names = Object.keys(TARGETS).flatMap(name => [`crumbless-${name}`, `crumbless-${name}.tar.gz`]);
      for (const name of names) {
        writeFileSync(join(dir, 'dist', name), `existing:${name}`);
      }
      const result = runBuild(dir, ['--all', '--verify']);
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).toBe(0);
      expect(result.stdout).toBe(`${names.join('\n')}\n`);
      for (const name of names) {
        expect(readFileSync(join(dir, 'dist', name), 'utf8')).toBe(`existing:${name}`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test.each(['', '.tar.gz'])('verification rejects a missing crumbless-linux-x64%s', (suffix) => {
    const dir = makeBuildDir('exit 37', 'exit 38');
    try {
      mkdirSync(join(dir, 'dist'));
      for (const name of Object.keys(TARGETS)) {
        writeFileSync(join(dir, `dist/crumbless-${name}`), 'binary');
        writeFileSync(join(dir, `dist/crumbless-${name}.tar.gz`), 'archive');
      }
      const missing = `crumbless-linux-x64${suffix}`;
      rmSync(join(dir, 'dist', missing));
      const result = runBuild(dir, ['--all', '--verify']);
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Missing or empty build output:');
      expect(result.stderr).toContain(missing);
      expect(result.stdout).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test.each(['', '.tar.gz'])('the final inventory rejects an earlier output removed by a later archiver: %s', (suffix) => {
    const archiver = `printf 'archive\\n' > "$2"
if [ "$5" = crumbless-linux-arm64 ]; then
  rm -f "dist/crumbless-macos-arm64${suffix}"
fi`;
    const dir = makeBuildDir(COMPILE_OK, archiver);
    try {
      const result = runBuild(dir);
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(`crumbless-macos-arm64${suffix}`);
      expect(result.stdout).not.toContain('Done!');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
