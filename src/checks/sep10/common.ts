import { Networks } from "@stellar/stellar-sdk";
import type { Env, Sep10Context } from "../../core.js";
import { tomlValue } from "../sep1/common.js";

/**
 * The WEB_AUTH_ENDPOINT from the toml, or undefined when absent or not a
 * string. SEP-10 §Authentication Endpoint: an organization indicates it
 * supports SEP-10 "by specifying WEB_AUTH_ENDPOINT in their stellar.toml
 * file."
 */
export function webAuthEndpoint(env: Env): string | undefined {
  const endpoint = tomlValue(env, "WEB_AUTH_ENDPOINT");
  return typeof endpoint === "string" && endpoint.length > 0 ? endpoint : undefined;
}

/**
 * The SIGNING_KEY from the toml — the SEP-10 Server Account — or undefined
 * when absent. SEP-10 §Abstract: "The SIGNING_KEY from the Home Domain is
 * the Server Account."
 */
export function signingKey(env: Env): string | undefined {
  const key = tomlValue(env, "SIGNING_KEY");
  return typeof key === "string" && key.length > 0 ? key : undefined;
}

/**
 * The network passphrase SEP-10 verification uses. Per the master build
 * prompt, prefer the toml's NETWORK_PASSPHRASE; when the toml does not
 * declare one, fall back to the SEP-10 convention — "use the Stellar
 * testnet passphrase" for testnet, the pubnet passphrase otherwise.
 */
export function resolveNetworkPassphrase(env: Env): string {
  const declared = tomlValue(env, "NETWORK_PASSPHRASE");
  if (typeof declared === "string" && declared.length > 0) {
    return declared;
  }
  return env.network === "testnet" ? Networks.TESTNET : Networks.PUBLIC;
}

/**
 * The challenge URL for a given account: the WEB_AUTH_ENDPOINT with the
 * account query parameter appended, preserving any query the endpoint
 * already carries. SEP-10 §Request: "GET <WEB_AUTH_ENDPOINT>" with an
 * `account` parameter.
 */
export function challengeUrl(endpoint: string, account: string): string {
  const url = new URL(endpoint);
  url.searchParams.set("account", account);
  return url.toString();
}

/** The hostname a challenge was requested from, normalized for comparisons. */
export function endpointHost(env: Env): string | undefined {
  const endpoint = env.sep10?.endpointUrl;
  if (endpoint === undefined) {
    return undefined;
  }
  try {
    return new URL(endpoint).hostname;
  } catch {
    return undefined;
  }
}

/** Access the shared SEP-10 context; callers require `sep10.challenge-returns-200`. */
export function sep10Context(env: Env): Sep10Context {
  if (env.sep10 === undefined) {
    throw new Error(
      "sep10 context is missing; this check must require sep10.challenge-returns-200",
    );
  }
  return env.sep10;
}