import type { StellarToml } from "@stellar/stellar-sdk";
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

/**
 * A field from the parsed stellar.toml, absent-safe. Field-level checks read
 * the file through this helper, which the runner makes safe to call: they
 * declare `sep1.toml-parses` in `requires`, so `env.toml` is always set when
 * they run.
 */
export function tomlValue<K extends keyof StellarToml.Api.StellarToml>(
  env: Env,
  field: K,
): StellarToml.Api.StellarToml[K] | undefined {
  return env.toml?.[field];
}

/**
 * Normalize a hostname for same-domain comparisons: lowercase, drop a
 * trailing dot (the fully-qualified form), and drop one leading "www."
 * label. SEP-1's own sample pairs ORG_URL="https://www.domain.com" with an
 * email at "domain.com", so a bare label comparison would flag the spec's
 * own example; the requirement means the registrable domain, and "www." is
 * the one label the sample tolerates.
 */
export function normalizedHost(host: string): string {
  let h = host.trim().toLowerCase();
  if (h.endsWith(".")) {
    h = h.slice(0, -1);
  }
  if (h.startsWith("www.")) {
    h = h.slice(4);
  }
  return h;
}

/**
 * The [[CURRENCIES]] entries declared in the toml, or [] when none.
 * Entries that link out via toml="..." defer their fields to the linked
 * file, so per-field checks skip them; sep1.currency-toml-link-resolves
 * validates those instead.
 */
export function currencyEntries(env: Env): StellarToml.Api.Currency[] {
  const currencies = tomlValue(env, "CURRENCIES");
  if (!Array.isArray(currencies)) {
    return [];
  }
  return currencies;
}

/**
 * True when a currency entry defers to a linked file via toml="...", the
 * "currency's only field" form SEP-1 describes. The SDK's Currency type does
 * not model the toml key, but its index signature carries it.
 */
export function isTomlLink(entry: StellarToml.Api.Currency): boolean {
  return entry.toml !== undefined;
}