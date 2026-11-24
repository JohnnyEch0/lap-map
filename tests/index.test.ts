import { describe, expect, it } from "vitest";
import { REPLACEMENT, transformPrompt } from "../index";

describe("transformPrompt", () => {
	it("replaces lapmap", () => {
		expect(transformPrompt("please answer lapmap")).toBe(`please answer ${REPLACEMENT}`);
	});

	it("replaces lapman case-insensitively", () => {
		expect(transformPrompt("LAPMAN!")).toBe(`${REPLACEMENT}!`);
	});

	it("handles repeated occurrences in one prompt", () => {
		expect(transformPrompt("lapmap and LAPMAN")).toBe(`${REPLACEMENT} and ${REPLACEMENT}`);
	});

	it("does not match substrings inside larger words", () => {
		expect(transformPrompt("collapmanager")).toBeNull();
	});

	it("returns null for unmatched text", () => {
		expect(transformPrompt("hello world")).toBeNull();
	});

	it("returns null for empty text", () => {
		expect(transformPrompt("")).toBeNull();
	});

	it("is stateless across calls (no lastIndex leakage)", () => {
		// Regression: a shared /g regex used for .test() flips between match/no-match.
		for (let i = 0; i < 3; i++) {
			expect(transformPrompt("lapmap again")).toBe(`${REPLACEMENT} again`);
		}
	});
});
