import { describe, expect, it } from "vitest";
import type { AutocompleteItem, AutocompleteProvider } from "../index";
import { createShortcutProvider, extractToken, filterShortcuts, SHORTCUTS } from "../index";

const LAPMAN = SHORTCUTS.find((s) => s.token === "lapman");
const CLARIFY = SHORTCUTS.find((s) => s.token === "clarify");
if (!LAPMAN || !CLARIFY) throw new Error("test setup: shortcuts missing");

/** Stand-in for pi's built-in provider: records delegation, returns a sentinel. */
const current: AutocompleteProvider = {
	async getSuggestions(_lines: string[], _cursorLine: number, _cursorCol: number) {
		return { items: [{ value: "builtin", label: "builtin" }], prefix: "builtin" };
	},
	applyCompletion(lines: string[], cursorLine: number, cursorCol: number) {
		return { lines, cursorLine, cursorCol };
	},
};

const provider = createShortcutProvider(current);
const getSuggestions = (line: string) =>
	provider.getSuggestions([line], 0, line.length, { signal: new AbortController().signal });
/** Cursor is always right after the `#token` when completion fires. */
const applyCompletion = (
	line: string,
	item: AutocompleteItem,
	prefix: string,
	cursorCol = line.length,
) => provider.applyCompletion([line], 0, cursorCol, item, prefix);

describe("extractToken", () => {
	it("extracts token after #", () => {
		expect(extractToken("fix #lap")).toBe("lap");
	});

	it("extracts at line start", () => {
		expect(extractToken("#clarify")).toBe("clarify");
	});

	it("empty token for bare #", () => {
		expect(extractToken("#")).toBe("");
	});

	it("no token when # is followed by space (headings)", () => {
		expect(extractToken("# TODO")).toBeUndefined();
	});

	it("no token without #", () => {
		expect(extractToken("lapman")).toBeUndefined();
	});
});

describe("filterShortcuts", () => {
	it("empty token matches all", () => {
		expect(filterShortcuts(SHORTCUTS, "")).toHaveLength(SHORTCUTS.length);
	});

	it("prefix match is case-insensitive", () => {
		expect(filterShortcuts(SHORTCUTS, "LAP")).toEqual([LAPMAN]);
	});

	it("prefix c matches clarify", () => {
		expect(filterShortcuts(SHORTCUTS, "c")).toEqual([CLARIFY]);
	});

	it("unmatched token matches nothing", () => {
		expect(filterShortcuts(SHORTCUTS, "zzz")).toEqual([]);
	});
});

describe("provider.getSuggestions", () => {
	it("lists all shortcuts for bare #", async () => {
		const result = await getSuggestions("#");
		expect(result?.items.map((i) => i.label)).toEqual(SHORTCUTS.map((s) => s.token));
		expect(result?.prefix).toBe("#");
	});

	it("filters by typed prefix", async () => {
		const result = await getSuggestions("#lap");
		expect(result?.items).toHaveLength(1);
		expect(result?.items[0]).toMatchObject({ label: "lapman", value: LAPMAN.phrase });
		expect(result?.prefix).toBe("#lap");
	});

	it("returns null for unmatched token", async () => {
		expect(await getSuggestions("#zzz")).toBeNull();
	});

	it("uses injected shortcuts, not just built-ins", async () => {
		const custom = createShortcutProvider(current, [
			{ token: "ship", phrase: "Commit, push, open PR." },
		]);
		const result = await custom.getSuggestions(["#sh"], 0, 3, {
			signal: new AbortController().signal,
		});
		expect(result?.items).toEqual([
			{ value: "Commit, push, open PR.", label: "ship", description: undefined },
		]);
	});

	it("delegates to current provider without #", async () => {
		const result = await getSuggestions("hello world");
		expect(result?.items[0]?.label).toBe("builtin");
	});
});

describe("provider.applyCompletion", () => {
	it("replaces #token with phrase at end of line", () => {
		const result = applyCompletion(
			"fix #lapman",
			{ value: LAPMAN.phrase, label: LAPMAN.token },
			"#lapman",
		);
		expect(result.lines[0]).toBe(`fix ${LAPMAN.phrase}`);
		expect(result.cursorCol).toBe(`fix ${LAPMAN.phrase}`.length);
	});

	it("replaces #token mid-line and keeps trailing text spaced", () => {
		const result = applyCompletion(
			"#lapman now",
			{ value: LAPMAN.phrase, label: LAPMAN.token },
			"#lapman",
			"#lapman".length,
		);
		expect(result.lines[0]).toBe(`${LAPMAN.phrase} now`);
	});

	it("adds leading space when glued to preceding word", () => {
		const result = applyCompletion(
			"fix#lapman",
			{ value: LAPMAN.phrase, label: LAPMAN.token },
			"#lapman",
		);
		expect(result.lines[0]).toBe(`fix ${LAPMAN.phrase}`);
	});

	it("leaves other lines untouched", () => {
		const result = provider.applyCompletion(
			["first", "fix #clarify", "third"],
			1,
			"fix #clarify".length,
			{ value: CLARIFY.phrase, label: CLARIFY.token },
			"#clarify",
		);
		expect(result.lines[0]).toBe("first");
		expect(result.lines[2]).toBe("third");
		expect(result.cursorLine).toBe(1);
	});
});

// Regression: issue #2 — the wrapper became the top-level provider and the
// editor calls ITS applyCompletion for every menu completion. Non-# prefixes
// must be delegated to the wrapped (builtin) provider verbatim.
describe("provider.applyCompletion: delegation for non-# prefixes (issue #2)", () => {
	const slashItem: AutocompleteItem = { value: "plan", label: "plan" };
	const fileItem: AutocompleteItem = { value: "src/index.ts", label: "src/index.ts" };
	const argItem: AutocompleteItem = { value: "openai/gpt-4o", label: "openai/gpt-4o" };

	it("delegates slash-command completion (/ prefix) to the wrapped provider", () => {
		const sentinel = { lines: ["/plan "], cursorLine: 0, cursorCol: 6 };
		const spy: AutocompleteProvider = {
			async getSuggestions() {
				return { items: [slashItem], prefix: "/plan" };
			},
			applyCompletion() {
				return sentinel;
			},
		};
		const result = createShortcutProvider(spy).applyCompletion(["/plan"], 0, 5, slashItem, "/plan");
		expect(result).toBe(sentinel);
	});

	it("keeps the slash on completed commands (symptom: /plan sent as 'plan')", () => {
		// Mirrors pi's CombinedAutocompleteProvider slash branch: items carry the
		// bare name, the builtin re-attaches "/" and the trailing space.
		const builtin: AutocompleteProvider = {
			async getSuggestions() {
				return { items: [slashItem], prefix: "/plan" };
			},
			applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
				const line = lines[cursorLine] ?? "";
				const before = line.slice(0, cursorCol - prefix.length);
				const after = line.slice(cursorCol);
				const newLines = [...lines];
				newLines[cursorLine] = `${before}/${item.value} ${after}`;
				return {
					lines: newLines,
					cursorLine,
					cursorCol: before.length + item.value.length + 2,
				};
			},
		};
		const result = createShortcutProvider(builtin).applyCompletion(
			["/plan"],
			0,
			5,
			slashItem,
			"/plan",
		);
		expect(result.lines[0]).toBe("/plan ");
		expect(result.cursorCol).toBe(6);
	});

	it("delegates file completion (@ prefix) to the wrapped provider", () => {
		const sentinel = { lines: ["@src/index.ts "], cursorLine: 0, cursorCol: 14 };
		const spy: AutocompleteProvider = {
			async getSuggestions() {
				return { items: [fileItem], prefix: "@src" };
			},
			applyCompletion() {
				return sentinel;
			},
		};
		const result = createShortcutProvider(spy).applyCompletion(["@src"], 0, 4, fileItem, "@src");
		expect(result).toBe(sentinel);
	});

	it("delegates command-argument completion (bare prefix after /cmd) to the wrapped provider", () => {
		const sentinel = { lines: ["/model openai/gpt-4o "], cursorLine: 0, cursorCol: 21 };
		const spy: AutocompleteProvider = {
			async getSuggestions() {
				return { items: [argItem], prefix: "fo" };
			},
			applyCompletion() {
				return sentinel;
			},
		};
		const result = createShortcutProvider(spy).applyCompletion(["/model fo"], 0, 9, argItem, "fo");
		expect(result).toBe(sentinel);
	});
});
