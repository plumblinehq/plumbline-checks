import type { HttpResponse } from "../core.js";

/**
 * A per-run cache of HTTP artifacts, keyed by `"METHOD url"`.
 *
 * Entries must be treated as immutable: the same response object is handed to
 * every caller that asks for the same key within a run.
 */
export interface ArtifactCache {
  get(key: string): HttpResponse | undefined;
  set(key: string, response: HttpResponse): void;
  /** Number of entries currently held. */
  size(): number;
}

/** In-memory artifact cache for a single run. */
export class InMemoryArtifactCache implements ArtifactCache {
  private readonly store = new Map<string, HttpResponse>();

  get(key: string): HttpResponse | undefined {
    return this.store.get(key);
  }

  set(key: string, response: HttpResponse): void {
    this.store.set(key, response);
  }

  size(): number {
    return this.store.size;
  }
}