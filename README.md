# lap-map

Pi extension. Replaces `lapmap` / `lapman` (case-insensitive, word boundaries) in your prompt with:

> in as little words as possible, as much as necessary

Loaded from `~/.pi/agent/extensions/lap-map/index.ts`. Reload with `/reload`.

## Dev

```sh
npm install   # wires pre-commit hook
npm run check # lint + typecheck + tests
```

Pre-commit: lint, typecheck, tests. Fail any, no commit.

## Roadmap

Generalize: arbitrary token → phrase mappings, user config. See issue #1.
