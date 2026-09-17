# Distribute the Crumbless CLI

## GitHub binaries first

The initial channel is the [public GitHub releases](https://github.com/crumblessai/crumbless-cli/releases):
macOS and Linux, arm64/x64, with a raw executable, a `.tar.gz` archive, and checksums.
The standalone executable is `crumbless`; it does not include the separate npm
`crumbless-mcp` launcher or native Windows support.

The installer requires an actual published release. If the releases page is empty, use the
[source instructions](../README.md#from-source), not npm or Homebrew as an assumed fallback.

After a release is published:

```bash
curl -sSL https://raw.githubusercontent.com/crumblessai/crumbless-cli/main/scripts/install.sh | bash
crumbless login
crumbless update
```

Piped and noninteractive installs skip optional skill setup. Use the separate
[skill instructions](../README.md#3-agent-skill--plugins) to add it. Noninteractive calls to
`install-skill.sh` require `--project` or `--global` so the destination is explicit.

## Source, workflow, and version contract

The app repository is the source of truth under `cli/`. The public `crumblessai/crumbless-cli`
repository is its distribution mirror. Release automation runs in the **app repository's**
`.github/workflows/cli-release.yml`, not in the public mirror.

| Value | Format |
|-------|--------|
| App source release tag | `cli-vX`, where `X` is a valid semantic version |
| Embedded CLI and package version | `X` |
| Public CLI release tag | `vX` |

The public tag targets a commit resolved in the public repository. A private app commit is
not a valid substitute. Prerelease versions are marked as prereleases rather than becoming
ordinary stable releases.

PRs and manual workflow runs produce validation artifacts only. **Manually selecting a tag
does not publish it.** Only an app-repository CLI-tag push can enter publishing steps; their
authorization reads immutable GitHub event/ref data, not an overridable environment flag.

## Maintainer gates before a release

- **G1 — Review and merge the source changes.** A preparation PR is not a deployment or release.
- **G2 — Reconcile the public mirror.** Verify that public `main` corresponds to the CLI source
  being released, accounting for the version stamp applied by the build. Do not reset divergent
  work or force-push merely to make histories match.
- **G3 — Configure and authorize publishing.** Store `CLI_RELEASE_TOKEN` in **crumbless-app →
  Settings → Secrets and variables → Actions**. It needs Contents read/write on
  `crumblessai/crumbless-cli` only. Do not put it in `.env`, source files, or chat. Pushing the
  approved `cli-vX` tag in the app repository intentionally publishes public `vX`.
- **G4 — Check the actual result.** Confirm the workflow result, every release asset and its
  checksum, anonymous download/install, and the installed CLI version. A saved secret or a green
  local build does not prove publishing permissions or a successful release.

The mirror export helper belongs to the app repository. Its preview mutates local state and
its publishing path can force-push; it is not a harmless validation command. Review its target
and obtain publishing approval before using it.

## Build and artifact checks

The builder fails if compilation or archiving fails, if any required output is absent/empty,
or if stale files would otherwise disguise an incomplete build. Its target registry also supplies
the verified artifact inventory, so CI does not maintain a second platform list.

From this CLI directory:

```bash
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build:all
bun run scripts/build.ts --all --verify
```

`--verify` checks existing outputs without rebuilding and prints their filenames. CI hashes only
that inventory, rejects unsafe filenames, and shares the same explicit file list between release
uploads and validation artifacts. A missing file stops publication; a wildcard matching some
other platform is not enough.

On Linux x64, smoke-test the built executable with:

```bash
./dist/crumbless-linux-x64 --help
./dist/crumbless-linux-x64 --version
tar -tzf dist/crumbless-linux-x64.tar.gz
```

Use the matching executable on other supported hosts. Validation artifacts are not public
releases. Publishing steps do not commit or push changes to app `main` or a Homebrew tap.

## Deferred channels

### npm

npm publishing is **default-off**. The app Actions variable `CLI_PUBLISH_NPM` must explicitly be
`true` before npm building/publishing is enabled. The retained token-based path also requires
`NPM_TOKEN`; if it is intentionally enabled without that credential, preflight fails before any
publication. Runtime environment variables cannot override this repository policy.

Do not configure npm credentials for the GitHub-binaries-first release. An npm account with 2FA
and trusted publishing is the preferred later setup, but it requires separate configuration.
This change does not configure OIDC or claim that the npm package is published.

The local npm bundle contains the CLI and the Node-based MCP launcher:

```bash
bun run build:npm
node dist-npm/cli.js --help
```

These commands build locally; they do not publish. Until the npm channel is announced, use the
standalone CLI or the [source-run MCP setup](mcp.md).

### Homebrew and hosted MCP

The formula and `scripts/update-homebrew-formula.sh` remain available for later Homebrew work.
A tap repository, verified formula/checksums, and publishing setup are still required; the binary
release workflow does not update the formula or push a tap automatically.

Hosted MCP at `mcp.crumbless.ai` is not deployed yet. Its configuration examples are preparation,
not evidence that the endpoint is available. Source-run stdio remains the documented alternative.
