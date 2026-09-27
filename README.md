# Crumbless CLI — Social Media AI Automation CLI, MCP Server & Agent Skill

**Automate your social media from the terminal.** [Crumbless](https://crumbless.ai) is the social
media AI autopilot that plans, writes, designs and publishes posts, blog articles and SEO/GEO
audits on autopilot. This repository is its command-line client, [MCP server](docs/mcp.md)
(Model Context Protocol — `stdio` + HTTP) and agent skill: everything you need to run social
media automation, content generation and approval workflows from a terminal or an AI agent.

This repository ships **three ways** to drive the same product (same OAuth, same API, **no static tokens**):

| | What | Who it’s for |
|---|------|----------------|
| **CLI** | `crumbless` terminal commands | Humans & scripts |
| **MCP** | Model Context Protocol server (`stdio` + HTTP) | Cursor, Claude, other MCP hosts |
| **Skill** | Agent Skill (`skills/crumbless/`) | Coding agents / skills.sh / `npx skills` |

> **You need an Crumbless account.** This is a client, not a standalone tool: every call talks to
> the Crumbless API over HTTPS. Without an account there is nothing to drive.

With the Crumbless CLI you can automate social media posting, approve AI-generated content in one
tap, edit a carousel slide by slide, turn a post into a video, run SEO and GEO audits, and manage
your blog — from the terminal **or** from an AI agent like Cursor or Claude.

```text
┌─────────────┐   ┌─────────────┐   ┌──────────────────┐
│  crumbless   │   │  MCP host   │   │  Agent + Skill   │
│    CLI      │   │ (Cursor…)   │   │  (npx skills)    │
└──────┬──────┘   └──────┬──────┘   └────────┬─────────┘
       │                 │                   │
       │    lib/api.ts + OAuth session       │
       └─────────────────┼───────────────────┘
                         ▼
                 Crumbless /api/v1/*
```

---

## 1. CLI

### Install

The first release channel is **standalone GitHub binaries** for macOS and Linux, arm64/x64.
Check the [public releases](https://github.com/crumblessai/crumbless-cli/releases) first: if no
release is listed, use [From source](#from-source). A public source repository alone does not
provide downloadable binaries.

| Method | Availability |
|--------|--------------|
| **Standalone installer** | Requires a published GitHub release; no Node/Bun runtime needed |
| **From source** | Requires [Bun](https://bun.sh) and a source checkout |
| **npm / Homebrew** | Deferred; not part of the initial binary release |

Once the first public release is available:

```bash
curl -sSL https://raw.githubusercontent.com/crumblessai/crumbless-cli/main/scripts/install.sh | bash
crumbless login
```

Piped and other noninteractive installations install only the CLI, without prompting for optional
AI skills or changing project configuration. Add the [agent skill](#3-agent-skill--plugins) separately.

Update a standalone installation with `crumbless update`. The binary provides `crumbless`, not
the separate npm `crumbless-mcp` launcher. Native Windows binaries are not included.
Publisher details and deferred channels: [`docs/distribute.md`](docs/distribute.md).

### Quick start

```bash
crumbless brands
crumbless dashboard my-brand
crumbless content my-brand --status pending_user
crumbless approve my-brand --all
crumbless seo my-brand
crumbless web my-brand generate --topic "..."
crumbless ai my-brand --message "..." --pipe
```

Every command takes the brand slug as its first argument. `crumbless --help` lists them all;
`crumbless <command> --help` details one. Short id prefixes from tables are accepted; ambiguous
prefixes error instead of guessing.

| Area | Commands |
|------|----------|
| Posts | `content`, `approve`, `post <id> [show\|edit\|regenerate\|slide\|reorder\|video\|publish]` |
| Planning | `plan`, `weekly-plan`, `calendar`, `gtm` |
| Brand | `studio`, `voice`, `people`, `products` |
| Web | `seo`, `geo`, `keywords`, `web` |
| Ads | `ads` — campaigns, spend, boost proposals, duplicate/delete (`--sync`, `--propose`, `--create`, `--approve`, `--pause`, `--resume`, `--duplicate`, `--delete`, `--reject`, `--ad` per singola creatività) |
| Insight | `dashboard`, `status`, `analytics` |
| AI | `ai --message "..."` — natural language, full read/write access |

Full command dump: [`llms.txt`](llms.txt) · more docs: [`docs/`](docs/)

### From source

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/crumblessai/crumbless-cli.git
cd crumbless-cli
bun install
bun run cli.ts --help
```

---

## 2. MCP server

Same tools and OAuth as the CLI. Docs: **[`docs/mcp.md`](docs/mcp.md)**.
Run these from a source checkout with Bun; installing the standalone CLI binary does not
install the MCP source or the `crumbless-mcp` npm launcher.

```bash
bun run mcp          # source-run stdio
bun run mcp:http     # local HTTP implementation
```

**Hosted MCP is not deployed yet.** `https://mcp.crumbless.ai/mcp` is the planned endpoint,
not an available service. Use source-run stdio until hosting is verified; do not send credentials
to an unverified host.

**Cursor — stdio**

```json
{
  "mcpServers": {
    "crumbless": {
      "command": "bun",
      "args": ["run", "/ABS/PATH/to/crumbless-cli/mcp/stdio.ts"]
    }
  }
}
```

**Cursor — HTTP configuration reference (after deployment)**

```json
{
  "mcpServers": {
    "crumbless": { "url": "https://mcp.crumbless.ai/mcp" }
  }
}
```

If Connect fails with `Not an https or loopback URI: cursor://…`, your Cursor build is still
using the custom-scheme OAuth callback — use **stdio** above, update Cursor (loopback
`http://localhost:8787/callback`), or see [`docs/mcp.md`](docs/mcp.md#cursor--remote-http-oauth).

- Local stdio: `login` tool or existing `crumbless login` → `~/.config/crumbless/session.json`
  (script/CI alternative: `crumbless login --email tu@email --password …` or `--password-stdin`, no browser)
- Remote HTTP: `Authorization: Bearer <access_token>` (401 without it is expected)

---

## 3. Agent Skill & plugins

Publishable [Agent Skill](https://agentskills.io) for Cursor, Claude, skills.sh, and friends:

```bash
npx skills add crumblessai/crumbless-cli --skill crumbless
# or
bash scripts/install-skill.sh --project
```

Package: [`skills/crumbless/`](skills/crumbless/) → [`plugins/crumbless/skills/crumbless/`](plugins/crumbless/) (`SKILL.md` + `references/` for MCP setup, tool map, CLI).

When the skill is active, agents prefer **MCP tools** if connected, otherwise the **CLI**.

### Claude Code / Codex marketplace plugin

The skill and planned remote MCP configuration are packaged together. The skill can be
installed from GitHub independently of npm publishing; the remote MCP portion remains unavailable
until deployment:

```bash
# Claude Code
/plugin marketplace add crumblessai/crumbless-cli
/plugin install crumbless@crumbless

# Codex
codex plugin marketplace add crumblessai/crumbless-cli
```

Submit checklist (Claude community directory + OpenAI Plugins Directory): **[`docs/plugins.md`](docs/plugins.md)**.

---

## Configuration

CLI/MCP use an explicit, nonempty `PUBLIC_APP_URL` without probing for a local app. Otherwise,
they detect a local development app on port 5173 and fall back to `https://crumbless.app`.
Vercel and `MCP_REQUIRE_BEARER=1` skip local detection.

The production public auth configuration is at `https://auth.crumbless.app`.
`crumbless.ai` is the marketing site, not the login/API origin.

| Variable | Purpose |
|----------|---------|
| `PUBLIC_APP_URL` | Point CLI/MCP at another Crumbless instance |
| `PUBLIC_SUPABASE_URL` | That instance's public authentication URL |
| `PUBLIC_SUPABASE_ANON_KEY` | That instance's public anon/publishable key, never a service-role key |
| `SENTRY_DSN` | (MCP HTTP / Vercel) Errors → Sentry |
| `SUPABASE_SERVICE_ROLE_KEY` | (MCP HTTP / Vercel) Rows in `mcp_logs` |
| `MCP_PUBLIC_URL` | Public MCP base URL for OAuth metadata |

For another instance, set all three `PUBLIC_*` values together so API calls and sign-in use the
same instance.

Session: `~/.config/crumbless/session.json`. `crumbless logout` clears it. No secrets are embedded
in this repo or the binary.

---

## Architecture

Thin HTTPS client — no DB access, no coupling to the Crumbless server codebase:

```
CLI  ──┐
MCP  ──┼── HTTPS ──►  /api/v1/*  ──►  Crumbless
Skill ─┘   (guides agents to CLI or MCP)
```

- CLI commands: `commands/` + `cli.ts`
- HTTP client: `lib/api.ts` only
- MCP: `mcp/` (reuses `lib/api.ts`, registers tools)
- Skill / plugins: `skills/crumbless/` → `plugins/crumbless/` (Claude + Codex marketplace manifests)

---

## Development

Development checks require Bun and Node.js. Login lifecycle tests use a closed dependency
fixture rather than a real credential profile.

```bash
bun install
bun run cli.ts --help
bun run mcp
bun run mcp:http
bun run typecheck
bun test
bun run build             # binary → dist/
bun run build:all         # all four targets
bun run scripts/build.ts --all --verify  # verify and list existing release outputs
bun run vercel-build      # MCP bundles under mcp/api/
```

Release automation lives in the **app source repository**, at `.github/workflows/cli-release.yml`.
An approved `cli-vX` tag push there publishes version `X` under public tag `vX` in this CLI
repository, after credential and artifact checks. PR and manual runs produce validation artifacts
only, even when a manual run selects a tag. npm is default-off behind `CLI_PUBLISH_NPM`; the
workflow never pushes formula changes to app `main` or a Homebrew tap. Before tagging, reconcile
and verify the public source mirror. Details: [`docs/distribute.md`](docs/distribute.md).

---

## License

Copyright © 2026 Andrea Buttarelli (original work, Anomalia).
Copyright © 2026 Crumblx AI Ltd (modifications).

Licensed under the [GNU Affero General Public License v3.0 or later](LICENSE). You may use, modify
and redistribute it, but derivative works must stay open source under the same license, must keep
the copyright notice, and must state their changes — including when offered to users over a
network.
