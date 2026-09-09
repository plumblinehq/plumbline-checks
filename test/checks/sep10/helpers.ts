import { Keypair, TransactionBuilder, type Transaction } from "@stellar/stellar-sdk";
import type { Env, HttpResponse, Sep10Context } from "../../../src/core.js";
import { makeEnv } from "../../helpers.js";
import {
  NETWORK_PASSPHRASE,
  SIGNING_KEY,
  buildChallenge,
} from "../../fixtures/sep10/challenge.js";

export const CLIENT_ACCOUNT = Keypair.random().publicKey();
export const AUTH_ENDPOINT = "https://example.com/auth";

export function responseOf(overrides: Partial<HttpResponse> = {}): HttpResponse {
  return {
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    body: "",
    url: AUTH_ENDPOINT,
    ...overrides,
  };
}

/** Decode a built challenge envelope into the SDK Transaction checks operate on. */
export function decodedChallenge(
  options: Partial<Parameters<typeof buildChallenge>[0]> = {},
): Transaction {
  const envelope = buildChallenge({
    ...options,
    clientAccount: options.clientAccount ?? CLIENT_ACCOUNT,
  });
  // The fixture never builds fee-bumps; fromXdr's union is narrowed by the
  // challenge-decodes check in production.
  return TransactionBuilder.fromXdr(envelope, NETWORK_PASSPHRASE) as Transaction;
}

/**
 * An Env whose toml declares web auth for the test home domain and whose
 * SEP-10 context is already populated, so decode-level checks can be tested
 * without the fetch layer.
 */
export function envWithSep10(
  overrides: Partial<Sep10Context> = {},
  toml: Record<string, unknown> = {},
): Env {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = {
    NETWORK_PASSPHRASE,
    SIGNING_KEY,
    WEB_AUTH_ENDPOINT: AUTH_ENDPOINT,
    ...toml,
  } as never;
  env.sep10 = {
    account: CLIENT_ACCOUNT,
    endpointUrl: AUTH_ENDPOINT,
    response: responseOf(),
    ...overrides,
  };
  return env;
}