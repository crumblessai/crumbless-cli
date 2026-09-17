#!/usr/bin/env bun
/**
 * Build script for Crumbless CLI.
 * Compiles the CLI into standalone binaries using `bun build --compile`.
 *
 * Usage:
 *   bun run scripts/build.ts          # Build for current platform
 *   bun run scripts/build.ts --all    # Build for all platforms
 *   bun run scripts/build.ts --linux  # Build for Linux only
 *   bun run scripts/build.ts --all --verify  # Verify and list outputs without rebuilding
 */

import { mkdirSync, existsSync, cpSync, statSync, rmSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const DIST = join(ROOT, 'dist');

function requireOutput(path: string) {
  const output = statSync(path, { throwIfNoEntry: false });
  if (!output?.isFile() || output.size === 0) {
    console.error(`Missing or empty build output: ${path}`);
    process.exit(1);
  }
}

// Platform targets
const targets: { name: string; target: string; ext: string }[] = [
  { name: 'macos-arm64', target: 'bun-darwin-arm64', ext: '' },
  { name: 'macos-x64', target: 'bun-darwin-x64', ext: '' },
  { name: 'linux-x64', target: 'bun-linux-x64', ext: '' },
  { name: 'linux-arm64', target: 'bun-linux-arm64', ext: '' },
];

// Parse args
const args = process.argv.slice(2);
const buildAll = args.includes('--all');
const buildLinux = args.includes('--linux');
const buildMac = args.includes('--mac');

// Determine which targets to build
let selectedTargets = targets;
if (!buildAll) {
  if (buildLinux) {
    selectedTargets = targets.filter(t => t.name.startsWith('linux'));
  } else if (buildMac) {
    selectedTargets = targets.filter(t => t.name.startsWith('macos'));
  } else {
    // Default: current platform
    const platform = process.platform;
    const arch = process.arch;
    if (platform === 'darwin') {
      selectedTargets = targets.filter(t => t.name === (arch === 'arm64' ? 'macos-arm64' : 'macos-x64'));
    } else if (platform === 'linux') {
      selectedTargets = targets.filter(t => t.name === (arch === 'arm64' ? 'linux-arm64' : 'linux-x64'));
    } else {
      console.error(`Unsupported platform: ${platform}-${arch}`);
      process.exit(1);
    }
  }
}

const outputNames = selectedTargets.flatMap(({ name }) => [
  `crumbless-${name}`,
  `crumbless-${name}.tar.gz`,
]);

function verifyOutputs() {
  for (const name of outputNames) {
    requireOutput(join(DIST, name));
  }
}

// CI gets its artifact inventory from the same targets used by the compiler.
if (args.includes('--verify')) {
  verifyOutputs();
  console.log(outputNames.join('\n'));
  process.exit(0);
}

if (!existsSync(DIST)) {
  mkdirSync(DIST, { recursive: true });
}

console.log(`Building Crumbless CLI for: ${selectedTargets.map(t => t.name).join(', ')}\n`);

// Build each target
for (const target of selectedTargets) {
  const outName = `crumbless-${target.name}`;
  const outPath = join(DIST, outName);

  console.log(`  Building ${outName}...`);

  // Old artifacts must not make an incomplete build look successful.
  rmSync(outPath, { force: true });
  rmSync(`${outPath}.tar.gz`, { force: true });

  const proc = Bun.spawnSync([
    'bun', 'build',
    '--compile',
    '--minify',
    '--target', target.target,
    join(ROOT, 'cli.ts'),
    '--outfile', outPath,
  ], {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });

  if (proc.exitCode !== 0) {
    console.error(`  ✗ Failed to build ${outName}`);
    process.exit(1);
  }

  requireOutput(outPath);
  console.log(`  ✓ ${outName} (${(Bun.file(outPath).size / 1024 / 1024).toFixed(1)} MB)`);
}

// Copy README and docs
console.log('\n  Copying docs...');
const docsDist = join(DIST, 'docs');
if (!existsSync(docsDist)) {
  mkdirSync(docsDist, { recursive: true });
}

try {
  cpSync(join(ROOT, 'README.md'), join(DIST, 'README.md'));
  cpSync(join(ROOT, 'docs'), docsDist, { recursive: true });
  console.log('  ✓ Docs copied to dist/');
} catch (e) {
  console.log(`  ⚠ Could not copy docs: ${e}`);
}

// Homebrew formulas prefer archives over raw binaries.
for (const target of selectedTargets) {
  const outName = `crumbless-${target.name}`;
  const outPath = join(DIST, outName);
  requireOutput(outPath);
  const tarPath = `${outPath}.tar.gz`;
  const tar = Bun.spawnSync(['tar', '-czf', tarPath, '-C', DIST, outName], {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (tar.exitCode !== 0) {
    console.error(`  ✗ Failed to archive ${outName}`);
    process.exit(1);
  }
  requireOutput(tarPath);
  console.log(`  ✓ ${outName}.tar.gz`);
}

verifyOutputs();
console.log('\nDone! Binaries are in dist/');
console.log('\nTo install locally:');
console.log('  sudo cp dist/crumbless-macos-arm64 /usr/local/bin/crumbless');
console.log('\nTo distribute:');
console.log('  Upload dist/ files to your hosting or create a GitHub release');
