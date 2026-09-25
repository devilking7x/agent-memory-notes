#!/usr/bin/env node
/**
 * Agent Memory Notes — MCP server.
 *
 * Gives AI agents (Claude Code, Claude Desktop, etc.) direct read/write access
 * to the same memory store the Agent Memory Notes web app uses.
 *
 * Storage: a local JSON file. Default: ~/.agent-memory-notes/memories.json
 * Override with the AGENT_MEMORY_FILE environment variable.
 * The JSON shape matches the web app's export format, so you can move
 * memories between the app and this server via Export/Import.
 *
 * Transport: stdio (standard for local MCP servers).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const STORE_FILE =
  process.env.AGENT_MEMORY_FILE ||
  path.join(os.homedir(), ".agent-memory-notes", "memories.json");

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/** @returns {Array<object>} */
function loadMemories() {
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data.memories)) return data.memories;
    if (Array.isArray(data)) return data; // tolerate bare array
    return [];
  } catch {
    return [];
  }
}

function saveMemories(memories) {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.writeFileSync(
    STORE_FILE,
    JSON.stringify({ version: 1, memories }, null, 2),
    "utf8"
  );
}

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

function pick(memory) {
  // Public shape — mirrors the web app's Memory interface.
  return {
    id: memory.id,
    title: memory.title,
    body: memory.body,
    tags: memory.tags || [],
    pinned: !!memory.pinned,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
  };
}

function matchesQuery(m, q) {
  const hay = `${m.title || ""}\n${m.body || ""}\n${(m.tags || []).join(" ")}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

function toMarkdown(memories) {
  if (!memories.length) return "_No memories stored yet._";
  return memories
    .map((m) => {
      const tags = (m.tags || []).map((t) => `#${t}`).join(" ");
      const date = new Date(m.updatedAt || m.createdAt || Date.now())
        .toISOString()
        .slice(0, 10);
      return `## ${m.title}${m.pinned ? " 📌" : ""}\n\n${m.body}\n\n_${date}${tags ? " · " + tags : ""}_`;
    })
    .join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "memory_add",
    description:
      "Save a new memory. Use for user preferences, project context, instructions, or anything the user wants remembered across sessions.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title for the memory." },
        body: {
          type: "string",
          description: "Memory content. Markdown is supported.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for filtering, e.g. [\"preferences\", \"coding\"].",
        },
        pinned: {
          type: "boolean",
          description: "Pin important memories so they surface first.",
        },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "memory_list",
    description: "List stored memories, newest first. Optionally filter by tag.",
    inputSchema: {
      type: "object",
      properties: {
        tag: { type: "string", description: "Only return memories with this tag." },
        pinned_only: {
          type: "boolean",
          description: "Only return pinned memories.",
        },
        limit: {
          type: "number",
          description: "Max memories to return (default 20).",
        },
      },
    },
  },
  {
    name: "memory_search",
    description:
      "Full-text search over titles, bodies, and tags. Every word must match.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search words." },
        limit: {
          type: "number",
          description: "Max memories to return (default 20).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "memory_get",
    description: "Get a single memory by its id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Memory id." } },
      required: ["id"],
    },
  },
  {
    name: "memory_update",
    description: "Update a memory's title, body, tags, or pinned flag.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Memory id." },
        title: { type: "string" },
        body: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        pinned: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "memory_delete",
    description: "Delete a memory by its id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Memory id." } },
      required: ["id"],
    },
  },
  {
    name: "memory_export",
    description:
      "Export memories as a Markdown block, ready to paste into a prompt or hand to another agent. Same format as the web app's 'Copy for agent'.",
    inputSchema: {
      type: "object",
      properties: {
        tag: {
          type: "string",
          description: "Only export memories with this tag.",
        },
      },
    },
  },
];

function textResult(obj) {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

function handleCall(name, args = {}) {
  const memories = loadMemories();
  switch (name) {
    case "memory_add": {
      const m = {
        id: uid(),
        title: String(args.title),
        body: String(args.body),
        tags: Array.isArray(args.tags) ? args.tags.map(String) : [],
        pinned: !!args.pinned,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      memories.push(m);
      saveMemories(memories);
      return textResult({ ok: true, memory: pick(m) });
    }
    case "memory_list": {
      let out = [...memories].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      if (args.tag) out = out.filter((m) => (m.tags || []).includes(args.tag));
      if (args.pinned_only) out = out.filter((m) => m.pinned);
      const limit = Math.max(1, Math.min(100, Number(args.limit) || 20));
      return textResult({ ok: true, count: out.length, memories: out.slice(0, limit).map(pick) });
    }
    case "memory_search": {
      const out = memories
        .filter((m) => matchesQuery(m, String(args.query)))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const limit = Math.max(1, Math.min(100, Number(args.limit) || 20));
      return textResult({ ok: true, count: out.length, memories: out.slice(0, limit).map(pick) });
    }
    case "memory_get": {
      const m = memories.find((x) => x.id === args.id);
      if (!m) return textResult({ ok: false, error: `No memory with id "${args.id}".` });
      return textResult({ ok: true, memory: pick(m) });
    }
    case "memory_update": {
      const m = memories.find((x) => x.id === args.id);
      if (!m) return textResult({ ok: false, error: `No memory with id "${args.id}".` });
      if (args.title !== undefined) m.title = String(args.title);
      if (args.body !== undefined) m.body = String(args.body);
      if (args.tags !== undefined) m.tags = Array.isArray(args.tags) ? args.tags.map(String) : [];
      if (args.pinned !== undefined) m.pinned = !!args.pinned;
      m.updatedAt = Date.now();
      saveMemories(memories);
      return textResult({ ok: true, memory: pick(m) });
    }
    case "memory_delete": {
      const idx = memories.findIndex((x) => x.id === args.id);
      if (idx === -1) return textResult({ ok: false, error: `No memory with id "${args.id}".` });
      const [removed] = memories.splice(idx, 1);
      saveMemories(memories);
      return textResult({ ok: true, deleted: pick(removed) });
    }
    case "memory_export": {
      let out = memories;
      if (args.tag) out = out.filter((m) => (m.tags || []).includes(args.tag));
      out = [...out].sort((a, b) => (b.pinned - a.pinned) || ((b.updatedAt || 0) - (a.updatedAt || 0)));
      return { content: [{ type: "text", text: toMarkdown(out.map(pick)) }] };
    }
    default:
      return textResult({ ok: false, error: `Unknown tool: ${name}` });
  }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "agent-memory-notes", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    return handleCall(request.params.name, request.params.arguments || {});
  } catch (err) {
    return textResult({ ok: false, error: String(err && err.message || err) });
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
