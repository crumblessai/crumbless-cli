# Crumbless Skill (MCP + CLI)

Flat copy for Claude Code / multi-tool installers.  
**Canonical publishable skill:** [`crumbless/SKILL.md`](./crumbless/SKILL.md) (Agent Skills / skills.sh).

```bash
npx skills add crumblessai/crumbless-cli --skill crumbless
bash scripts/install-skill.sh --project
```

Prefer **MCP tools** when connected; otherwise the **`crumbless` CLI**. OAuth only — no static tokens.
Details: [crumbless/references/mcp.md](./crumbless/references/mcp.md) · [tools.md](./crumbless/references/tools.md) · [cli.md](./crumbless/references/cli.md).

## Auth

- Local: MCP `login` or `crumbless login` → `~/.config/crumbless/session.json`
- Remote MCP (`https://mcp.crumbless.ai/mcp`): `Authorization: Bearer <access_token>`
- Start with `list_brands` / `crumbless brands`

## Cursor MCP (stdio)

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

## Cursor MCP (HTTP)

```json
{
  "mcpServers": {
    "crumbless": { "url": "https://mcp.crumbless.ai/mcp" }
  }
}
```

## CLI fallback

```bash
curl -sSL https://raw.githubusercontent.com/crumblessai/crumbless-cli/main/scripts/install.sh | bash
crumbless login
crumbless brands
crumbless content <slug> --status pending_user
crumbless approve <slug> --all
crumbless ai <slug> --message "..." --pipe
```
