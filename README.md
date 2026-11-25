# lapman

**L**ittle **A**s **P**ossible, **M**uch **A**s **N**ecessary. Named for the brevity phrase it inserts.

Pi extension. Type `#` in the input: autocomplete menu (like `@` for files) with shortcut tokens. Selecting — or fully typing and completing — inserts the phrase, removes the `#token`.

## Built-in shortcuts

- `#lapman` — in as little words as possible, as much as necessary
- `#clarify` — Make sure to clarify what is expected of you by first asking important follow up questions before starting to work on the actual task.

Shortcuts: table in `index.ts` (`SHORTCUTS`). Headings (`# TODO`) unaffected — token must follow `#` directly.

## Custom shortcuts

Global config: `~/.pi/agent/lapman.json` (honors `PI_CODING_AGENT_DIR`).
Project config: `<project>/.pi/lapman.json` — only in trusted projects.

```json
{
	"ship": { "phrase": "Commit, push, open a PR.", "description": "finish the task" },
	"todo": "Work through the TODOs in order."
}
```

- Object keyed by token; value is the phrase, or `{ "phrase", "description?" }`.
- Project entries shadow global ones, which shadow the built-ins (case-insensitive).
- Bad entries are skipped with a console warning, not fatal.

Config is read at session start; `/reload` picks it up.

## Dev

```sh
npm install   # wires pre-commit hook
npm run check # lint + typecheck + tests
```

Pre-commit: lint, typecheck, tests. Fail any, no commit.

Loaded from `~/.pi/agent/extensions/lapman/index.ts`. Reload with `/reload`.
