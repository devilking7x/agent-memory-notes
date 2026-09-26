# Contributing to Agent Memory Notes

Thanks for your interest! This project is beginner-friendly — small fixes are very welcome, especially during Hacktoberfest.

## Ways to contribute

- **UI improvements** — search highlighting, tag colors, sort options, mobile layout
- **MCP server** (`mcp-server/`) — new tools, better search, input validation
- **Import/export** — new formats, backup/restore flows
- **Docs & typos** — clarifications make great first PRs

## Dev setup

```bash
npm install
npm run dev
```

Verify the production build before submitting:

```bash
npm run build
```

To try the MCP server locally:

```bash
node mcp-server/index.mjs
```

## Pull request process

1. Fork the repo and create a branch: `git checkout -b feat/my-change`
2. Make your change and verify `npm run build` passes
3. Open a PR describing **what** changed and **why**

## Ground rules

- **Stay local-first.** Memories never leave the device without explicit user action.
- TypeScript + React, styled with Tailwind. Keep the bundle small.
