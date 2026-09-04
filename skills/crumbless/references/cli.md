# Crumbless CLI (fallback)

Use when MCP is not connected. Same OAuth session as MCP (`~/.config/crumbless/session.json`).

## Install

```bash
curl -sSL https://raw.githubusercontent.com/crumblessso/crumbless/main/cli/scripts/install.sh | bash
crumbless login
```

From source (Bun):

```bash
git clone https://github.com/anomaliaso/anomalia.git
cd crumbless-cli && bun install
bun run cli.ts --help
```

## Common commands

```bash
crumbless brands
crumbless dashboard <slug>
crumbless content <slug> --status pending_user
crumbless approve <slug> --all
crumbless post <slug> <id> edit --caption "..."
crumbless post <slug> <id> regenerate --instruction "..."
crumbless post <slug> <id> slide --index 1 --instruction "..."
crumbless post <slug> <id> approve|publish|reject
crumbless plan <slug> propose
crumbless weekly-plan <slug> plan --week 0
crumbless weekly-plan <slug> produce --week 0
crumbless studio <slug> add-note --text "..."
crumbless seo <slug>
crumbless geo <slug>
crumbless web <slug> generate --topic "..."
crumbless ai <slug> --message "..." --pipe
```

Full dump: repo root [`llms.txt`](https://github.com/anomaliaso/anomalia/blob/main/cli/llms.txt).
Tool mapping: [tools.md](tools.md).
