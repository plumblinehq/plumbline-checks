import type { Env, HttpResponse } from "../../core.js";

/**
 * The SEP-1 defined location of the stellar.toml for a home domain:
 * "Given the domain DOMAIN, the stellar.toml will be searched for at
 * https://DOMAIN/.well-known/stellar.toml."
 */
export function tomlUrl(homeDomain: string): string {
  return `https://${homeDomain}/.well-known/stellar.toml`;
}

/**
 * Fetch the anchor's stellar.toml through the run's rate-limited client. The
 * response is cached per run, so every SEP-1 fetch-level check inspects the
 * same single request.
 */
export function fetchToml(env: Env): Promise<HttpResponse> {
  return env.http.get(tomlUrl(env.homeDomain));
}
