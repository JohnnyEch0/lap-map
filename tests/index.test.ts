import { describe, expect, it } from "vitest";
import type { AutocompleteItem, AutocompleteProvider } from "../index";
import { createShortcutProvider, extractToken, filterShortcuts, SHORTCUTS } from "../index";

const LAPMAN = SHORTCUTS.find((s) => s.token === "lapman");
const CLARIFY = SHORTCUTS.find((s) => s.token === "_clarify");
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
		expect(extractToken("#_clarify")).toBe("_clarify");
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
		expect(filterShortcuts("")).toHaveLength(SHORTCUTS.length);
	});

	it("prefix match is case-insensitive", () => {
		expect(filterShortcuts("LAP")).toEqual([LAPMAN]);
	});

	it("underscore prefix matches _clarify", () => {
		expect(filterShortcuts("_")).toEqual([CLARIFY]);
	});

	it("unmatched token matches nothing", () => {
		expect(filterShortcuts("zzz")).toEqual([]);
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
			["first", "fix #_clarify", "third"],
			1,
			"fix #_clarify".length,
			{ value: CLARIFY.phrase, label: CLARIFY.token },
			"#_clarify",
		);
		expect(result.lines[0]).toBe("first");
		expect(result.lines[2]).toBe("third");
		expect(result.cursorLine).toBe(1);
	});
});
