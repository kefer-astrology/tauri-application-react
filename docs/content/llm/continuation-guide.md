---
title: "Continuation guide"
weight: 30
---

## Safe continuation loop

1. Read `/llm/project-context/`.
2. Read `/docs/` and then the most relevant guide for the task area.
3. Inspect current uncommitted changes before editing.
4. Rebuild generated docs assets with `npm run docs:prepare` when frontend build output changes.
5. Avoid editing copied frontend files in `docs/static/apps/`; change the source app instead.

## Docs publishing contract

- Hugo source lives in `docs/`.
- Frontend artifacts are copied into `docs/static/apps/<app>/`.
- GitHub Pages should publish the Hugo output, not the raw source directory.
- Lowercase filenames are preferred for docs content and URLs.
