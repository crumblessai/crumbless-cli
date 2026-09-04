import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAuthTools } from './tools/auth.ts';
import { registerBrandTools } from './tools/brand-content.ts';
import { registerPlanTools } from './tools/plan.ts';
import { registerStudioTools } from './tools/studio.ts';
import { registerWebTools } from './tools/web.ts';

export function createCrumblessMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'crumbless',
      version: '0.1.0',
      description:
        'Crumbless social media AI autopilot — manage brands, posts, plans, studio, SEO/GEO, and blog via OAuth.',
    },
    {
      instructions: [
        'Auth: browser OAuth via the `login` tool (local stdio/HTTP) or Authorization: Bearer <access_token> (remote HTTP). No static API tokens.',
        'Local MCP shares ~/.config/crumbless/session.json with the Crumbless CLI.',
        'Always start with `list_brands` (or `whoami`) to learn brand slugs.',
        'Post and article ids accept short unambiguous prefixes from list tools.',
        'Prefer specific tools for deterministic actions; use `chat` for open-ended multi-step work.',
      ].join(' '),
    },
  );

  registerAuthTools(server);
  registerBrandTools(server);
  registerPlanTools(server);
  registerStudioTools(server);
  registerWebTools(server);

  return server;
}
