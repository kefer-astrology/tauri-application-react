---
title: "Kefer docs"
description: "Main documentation hub, published frontend builds, and LLM continuation context."
---

The `docs/` directory is now the shared source for three things:

1. Human-readable project documentation.
2. A Hugo site that can publish to GitHub Pages.
3. LLM handoff material for future contributors and agents.

## Start here

- [Project docs](./docs/) for architecture, frontend, Python, integration, and planning notes.
- [LLM handoff](./llm/) for concise project context and continuation guidance.
- [Published frontends](#frontend-builds) for static builds copied from workspace apps during `npm run docs:prepare`.

## Local docs workflow

```bash
npm run docs:prepare
npm run docs:dev
npm run docs:build
```

`docs:prepare` rebuilds frontend workspaces and copies any `apps/*/dist/` output into the docs site under `/apps/<workspace>/`.
