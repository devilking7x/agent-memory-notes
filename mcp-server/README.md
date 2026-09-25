# Agent Memory Notes — MCP Server

Gives AI agents **direct** read/write access to your memories via the [Model Context Protocol](https://modelcontextprotocol.io) — no copy-paste needed. The agent can search, read, add, update, and delete memories itself.

## Quick start

```bash
cd mcp-server
npm install
```

### Claude Code

```bash
claude mcp add agent-memory-notes -- node /absolute/path/to/mcp-server/index.mjs
```

### Claude Desktop

Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "agent-memory-notes": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/index.mjs"]
    }
  }
}
```

## Storage

Memories live in a local JSON file — default `~/.agent-memory-notes/memories.json`.
Override with the `AGENT_MEMORY_FILE` environment variable:

```json
{
  "mcpServers": {
    "agent-memory-notes": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/index.mjs"],
      "env": { "AGENT_MEMORY_FILE": "/path/to/memories.json" }
    }
  }
}
```

The JSON shape matches the web app's **Export (.json)** format, so you can move
memories between the app and this server: export from the app → point
`AGENT_MEMORY_FILE` at that file (or copy it over).

## Tools

| Tool | What it does |
|---|---|
| `memory_add` | Save a memory (title, body markdown, tags, pinned) |
| `memory_list` | List memories, newest first; filter by tag or pinned |
| `memory_search` | Full-text search over title, body, tags |
| `memory_get` | Get one memory by id |
| `memory_update` | Update title / body / tags / pinned |
| `memory_delete` | Delete by id |
| `memory_export` | Export as a Markdown block (same as the app's "Copy for agent") |

## Requirements

- Node.js 18+
