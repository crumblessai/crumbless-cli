#!/usr/bin/env bun
/**
 * Crumbless MCP server (stdio).
 *
 * Auth is browser OAuth only — same flow as `crumbless login`, same session file.
 * No static API tokens.
 *
 * Cursor / Claude Desktop example:
 * {
 *   "mcpServers": {
 *     "crumbless": {
 *       "command": "bun",
 *       "args": ["run", "/absolute/path/to/crumbless-cli/mcp/stdio.ts"]
 *     }
 *   }
 * }
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadEnv } from '../lib/config.ts';
import { createCrumblessMcpServer } from './server.ts';

await loadEnv();

const server = createCrumblessMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Crumbless MCP server running on stdio (OAuth session via login tool / crumbless login)');
