/**
 * lapman config — user-defined token → phrase mappings (issue #1).
 *
 * Global config: `<agent-dir>/lapman.json`.
 * Project config: `<cwd>/<config-dir>/lapman.json`, honored only for
 * trusted projects. Project entries shadow global ones, which shadow
 * the built-ins.
 *
 * File shape — a JSON object keyed by token:
 *
 * ```json
 * {
 *   "ship": { "phrase": "Commit, push, open PR.", "description": "finish" },
 *   "todo": "Work through TODOs in order."
 * }
 * ```
 *
 * A string value is shorthand for `{ "phrase": ... }`.
 */
import { readFileSync } from "node:fs";
import type { Shortcut } from "./index";

export interface ConfigParseResult {
	entries: Shortcut[];
	/** Non-fatal problems: bad entries are skipped, the rest still loads. */
	errors: string[];
}

/** Tokens may not contain whitespace or `#`; matching stays case-insensitive. */
export function isValidToken(token: string): boolean {
	return token.length > 0 && !/[\s#]/.test(token);
}

/** Parses raw JSON text into shortcuts. Malformed entries are skipped, not fatal. */
export function parseConfig(text: string, source: string): ConfigParseResult {
	const entries: Shortcut[] = [];
	const errors: string[] = [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (err) {
		return { entries, errors: [`${source}: invalid JSON (${message(err)})`] };
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return { entries, errors: [`${source}: expected a JSON object of token → phrase mappings`] };
	}
	for (const [token, value] of Object.entries(parsed)) {
		if (!isValidToken(token)) {
			errors.push(`${source}: token "${token}" skipped (empty, whitespace, or #)`);
			continue;
		}
		const entry = toShortcut(value);
		if (!entry) {
			errors.push(`${source}: token "${token}" skipped (needs a non-empty string phrase)`);
			continue;
		}
		entries.push({ token, ...entry });
	}
	return { entries, errors };
}

function message(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

function toShortcut(value: unknown): Pick<Shortcut, "phrase" | "description"> | undefined {
	if (typeof value === "string") {
		return value ? { phrase: value } : undefined;
	}
	if (typeof value !== "object" || value === null) return undefined;
	const { phrase, description } = value as { phrase?: unknown; description?: unknown };
	if (typeof phrase !== "string" || !phrase) return undefined;
	if (description !== undefined && typeof description !== "string") return undefined;
	return description ? { phrase, description } : { phrase };
}

/** Reads and parses a config file; missing files are not an error. */
export function loadConfigFile(path: string): ConfigParseResult {
	let text: string;
	try {
		text = readFileSync(path, "utf8");
	} catch {
		return { entries: [], errors: [] };
	}
	return parseConfig(text, path);
}

/**
 * Layers shortcut sources: later entries shadow earlier ones with the same
 * token (case-insensitive, mirroring menu matching). Built-ins first, then
 * global config, then project config.
 */
export function resolveShortcuts(...layers: Shortcut[][]): Shortcut[] {
	const byToken = new Map<string, Shortcut>();
	for (const layer of layers) {
		for (const entry of layer) {
			byToken.set(entry.token.toLowerCase(), entry);
		}
	}
	return [...byToken.values()];
}
