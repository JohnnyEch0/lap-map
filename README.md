# lap-map

Pi extension. Replaces `lapmap` / `lapman` (case-insensitive, word-boundary) in
your prompts with "in as little words as possible, as much as necessary".

Loaded automatically from `~/.pi/agent/extensions/lap-map/index.ts`.
Reload live in Pi with `/reload`.

## Dev

```sh
npm install        # also wires git hooks via core.hooksPath
npm run check      # lint + typecheck + tests
```

Pre-commit runs lint, typecheck, and tests. Commits fail if any of them do.
