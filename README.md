# lapman

**L**ittle **A**s **P**ossible, **M**uch **A**s **N**ecessary. Named for the brevity phrase it inserts.

Pi extension. Type `#` in the input: autocomplete menu (like `@` for files) with shortcut tokens. Selecting — or fully typing and completing — inserts the phrase, removes the `#token`.

- `#lapman` — in as little words as possible, as much as necessary
- `#clarify` — Make sure to clarify what is expected of you by first asking important follow up questions before starting to work on the actual task.

Shortcuts: table in `index.ts` (`SHORTCUTS`). Headings (`# TODO`) unaffected — token must follow `#` directly.

Loaded from `~/.pi/agent/extensions/lapman/index.ts`. Reload with `/reload`.

## Dev

```sh
npm install   # wires pre-commit hook
npm run check # lint + typecheck + tests
```

Pre-commit: lint, typecheck, tests. Fail any, no commit.

## Roadmap

Generalize: arbitrary token → phrase mappings, user config. See issue #1.
