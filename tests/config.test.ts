import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isValidToken, loadConfigFile, parseConfig, resolveShortcuts } from "../config";
import type { Shortcut } from "../index";

describe("isValidToken", () => {
	it("accepts plain alphanumeric tokens", () => {
		expect(isValidToken("ship")).toBe(true);
	});

	it("rejects empty, whitespace, and #", () => {
		expect(isValidToken("")).toBe(false);
		expect(isValidToken("two words")).toBe(false);
		expect(isValidToken("la#p")).toBe(false);
	});
});

describe("parseConfig", () => {
	it("parses object entries with description", () => {
		const result = parseConfig(
			'{ "ship": { "phrase": "Commit, push, open PR.", "description": "finish" } }',
			"test",
		);
		expect(result.entries).toEqual([
			{
				token: "ship",
				phrase: "Commit, push, open PR.",
				description: "finish",
			},
		]);
		expect(result.errors).toEqual([]);
	});

	it("string value is shorthand for phrase only", () => {
		const result = parseConfig('{ "todo": "Work through TODOs." }', "test");
		expect(result.entries).toEqual([{ token: "todo", phrase: "Work through TODOs." }]);
	});

	it("skips bad entries, keeps the rest, reports errors", () => {
		const result = parseConfig(
			'{ "ok": "fine", "bad #": "x", "": "y", "empty-phrase": "", "num": 5, "obj": { "no": 1 } }',
			"test",
		);
		expect(result.entries).toEqual([{ token: "ok", phrase: "fine" }]);
		expect(result.errors).toHaveLength(5);
	});

	it("rejects non-object top level", () => {
		expect(parseConfig('["a"]', "test").errors).toHaveLength(1);
		expect(parseConfig('"str"', "test").errors).toHaveLength(1);
	});

	it("reports invalid JSON without throwing", () => {
		const result = parseConfig("{ nope", "test");
		expect(result.entries).toEqual([]);
		expect(result.errors[0]).toContain("invalid JSON");
	});
});

describe("resolveShortcuts", () => {
	const a: Shortcut = { token: "lapman", phrase: "builtin phrase", description: "b" };
	const aCustom: Shortcut = { token: "LAPMAN", phrase: "global phrase" };
	const b: Shortcut = { token: "ship", phrase: "commit" };

	it("later layers shadow earlier tokens case-insensitively", () => {
		expect(resolveShortcuts([a], [aCustom, b])).toEqual([
			{ token: "LAPMAN", phrase: "global phrase" },
			b,
		]);
	});

	it("preserves built-ins when later layers add nothing", () => {
		expect(resolveShortcuts([a, b], [])).toEqual([a, b]);
	});
});

describe("loadConfigFile", () => {
	const dir = join(tmpdir(), "lapman-test-config");
	const path = join(dir, "lapman.json");

	it("missing file is not an error", () => {
		rmSync(dir, { recursive: true, force: true });
		expect(loadConfigFile(path)).toEqual({ entries: [], errors: [] });
	});

	it("reads and parses an existing file", () => {
		mkdirSync(dir, { recursive: true });
		writeFileSync(path, '{ "from-disk": "disk phrase" }');
		try {
			expect(loadConfigFile(path).entries).toEqual([{ token: "from-disk", phrase: "disk phrase" }]);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
