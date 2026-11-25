/**
 * lapman — `#` shortcuts in the pi input.
 *
 * Typing `#` opens the autocomplete menu (same overlay as `@` for files).
 * Selecting an entry — or fully typing its token and completing — inserts
 * the entry's phrase and removes the `#token`.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Minimal structural types mirroring @earendil-works/pi-tui's autocomplete API.
// The public pi-coding-agent package only re-exports AutocompleteProviderFactory,
// not the underlying interfaces; these stay compatible because addAutocompleteProvider
// structurally checks whatever we return.
export interface AutocompleteItem {
	value: string;
	label: string;
	description?: string;
}
interface AutocompleteSuggestions {
	items: AutocompleteItem[];
	prefix: string;
}
export interface AutocompleteProvider {
	triggerCharacters?: string[];
	getSuggestions(
		lines: string[],
		cursorLine: number,
		cursorCol: number,
		options: { signal: AbortSignal; force?: boolean },
	): Promise<AutocompleteSuggestions | null>;
	applyCompletion(
		lines: string[],
		cursorLine: number,
		cursorCol: number,
		item: AutocompleteItem,
		prefix: string,
	): { lines: string[]; cursorLine: number; cursorCol: number };
	shouldTriggerFileCompletion?(lines: string[], cursorLine: number, cursorCol: number): boolean;
}

export interface Shortcut {
	/** Token typed after `#` (no space, no `#`). */
	token: string;
	/** Phrase inserted in place of `#token`. */
	phrase: string;
	/** One-liner shown in the menu. */
	description?: string;
}

export const SHORTCUTS: Shortcut[] = [
	{
		token: "lapman",
		phrase: "in as little words as possible, as much as necessary",
		description: "brevity directive",
	},
	{
		token: "clarify",
		phrase:
			"Make sure to clarify what is expected of you by first asking important follow up questions before starting to work on the actual task.",
		description: "clarify expectations before starting",
	},
];

/**
 * Extracts the `#token` fragment directly before the cursor, if any.
 * A token ends at whitespace or another `#`; headings like `# TODO` yield none.
 */
export function extractToken(textBeforeCursor: string): string | undefined {
	const match = textBeforeCursor.match(/(?:^|[ \t])#([^\s#]*)$/);
	return match?.[1];
}

/** Filters shortcuts by token prefix. Empty token matches all. */
export function filterShortcuts(shortcuts: Shortcut[], token: string): Shortcut[] {
	const lower = token.toLowerCase();
	return shortcuts.filter((s) => s.token.toLowerCase().startsWith(lower));
}

/**
 * Builds the provider that wraps pi's built-in autocomplete. `shortcuts`
 * defaults to the built-ins; tests inject their own. Exported for testing.
 */
export function createShortcutProvider(
	current: AutocompleteProvider,
	shortcuts: Shortcut[] = SHORTCUTS,
): AutocompleteProvider {
	return {
		triggerCharacters: ["#"],
		async getSuggestions(lines, cursorLine, cursorCol, options) {
			const beforeCursor = (lines[cursorLine] ?? "").slice(0, cursorCol);
			const token = extractToken(beforeCursor);
			if (token === undefined) {
				return current.getSuggestions(lines, cursorLine, cursorCol, options);
			}
			const matches = filterShortcuts(shortcuts, token);
			if (matches.length === 0) {
				return null;
			}
			return {
				items: matches.map((s) => ({
					value: s.phrase,
					label: s.token,
					description: s.description,
				})),
				prefix: `#${token}`,
			};
		},
		applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
			// The wrapper is the top-level provider, so the editor calls OUR
			// applyCompletion for every menu completion. Non-# completions
			// (slash commands, @ files, command arguments) belong to the wrapped
			// builtin provider — delegate verbatim (issue #2).
			if (!prefix.startsWith("#")) {
				return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
			}
			const line = lines[cursorLine] ?? "";
			const beforePrefix = line.slice(0, cursorCol - prefix.length);
			const afterCursor = line.slice(cursorCol);
			// Splice the phrase in place of `#token`, keeping the sentence glued together.
			const leadingSpace = beforePrefix.length > 0 && !/\s$/.test(beforePrefix) ? " " : "";
			const trailingSpace = /^\S/.test(afterCursor) ? " " : "";
			const inserted = `${leadingSpace}${item.value}${trailingSpace}`;
			const newLines = [...lines];
			newLines[cursorLine] = `${beforePrefix}${inserted}${afterCursor}`;
			return {
				lines: newLines,
				cursorLine,
				cursorCol: beforePrefix.length + inserted.length,
			};
		},
		shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
			return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
		},
	};
}

export default function (pi: ExtensionAPI): void {
	pi.on("session_start", (_event, ctx) => {
		ctx.ui.addAutocompleteProvider((current) => createShortcutProvider(current));
	});
}
