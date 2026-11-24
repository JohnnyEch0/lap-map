/**
 * lap-map — replaces LAPMAP/lapman (case-insensitive) in your prompts with
 * "in as little words as possible, as much as necessary".
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export const REPLACEMENT = "in as little words as possible, as much as necessary";

/** Non-global test pattern (a global regex would carry `lastIndex` state between calls). */
const MATCHES = /\blap(map|man)\b/i;
/** Fresh regex per call — never reuse a global regex across invocations. */
const replaceAll = (text: string) => text.replace(/\blap(map|man)\b/gi, REPLACEMENT);

/** Returns transformed text, or null if nothing to do. Exported for testing. */
export function transformPrompt(text: string): string | null {
	if (!MATCHES.test(text)) return null;
	return replaceAll(text);
}

export default function (pi: ExtensionAPI) {
	pi.on("input", async (event) => {
		if (event.source === "extension") return { action: "continue" };
		if (event.text.includes("@")) {
			// don't touch @-file mentions; let pi resolve them first
			return { action: "continue" };
		}
		const text = transformPrompt(event.text);
		if (text === null) return { action: "continue" };
		return { action: "transform", text };
	});
}
