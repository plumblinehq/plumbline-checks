import type { Check } from "./core.js";

/**
 * The check registry. Check modules register themselves once at import time;
 * nothing else ever touches this map directly.
 */
const registry = new Map<string, Check>();

/** Register a check. Throws on a duplicate id — a duplicate is a bug. */
export function register(check: Check): void {
  if (registry.has(check.id)) {
    throw new Error(`a check with id "${check.id}" is already registered`);
  }
  registry.set(check.id, check);
}

/** All registered checks, sorted by id so output is deterministic. */
export function all(): Check[] {
  return [...registry.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function get(checkId: string): Check | undefined {
  return registry.get(checkId);
}

/** The checks enforcing the given SEPs. */
export function forSEPs(seps: number[]): Check[] {
  const wanted = new Set(seps);
  return all().filter((check) => wanted.has(check.sep));
}