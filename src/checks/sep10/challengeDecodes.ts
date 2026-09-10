import { FeeBumpTransaction, TransactionBuilder } from "@stellar/stellar-sdk";
import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { resolveNetworkPassphrase, sep10Context } from "./common.js";

/**
 * SEP-10 §Response (Success): the `transaction` field is "an XDR-encoded
 * Stellar transaction". This decodes it via the SDK and publishes the parsed
 * {@link Transaction} to `env.sep10.transaction` for every later check.
 * The network passphrase affects only the signature hash, not decoding, so
 * decoding uses the resolved passphrase per the documented precedence (toml
 * NETWORK_PASSPHRASE, else the run's network). A fee-bump envelope decodes
 * as a FeeBumpTransaction, which SEP-10 does not use for challenges, so
 * that fails.
 */
export const challengeDecodes: Check = {
  id: "sep10.challenge-decodes",
  sep: 10,
  title: "the challenge transaction decodes as XDR",
  description:
    "Decodes the response's transaction field as a base64 Stellar transaction envelope via the SDK.",
  severity: "error",
  specRef: "SEP-10 §Response (Success)",
  requires: ["sep10.challenge-json-shape"],
  async run(env: Env): Promise<CheckOutcome> {
    const context = sep10Context(env);
    const encoded = context.json?.transaction;
    if (typeof encoded !== "string") {
      return {
        status: "skip",
        message: "No transaction field to decode.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    const passphrase = resolveNetworkPassphrase(env);
    let transaction;
    try {
      transaction = TransactionBuilder.fromXdr(encoded, passphrase);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return {
        status: "fail",
        message: `The challenge transaction is not decodable XDR: ${detail}`,
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    if (transaction instanceof FeeBumpTransaction) {
      return {
        status: "fail",
        message: "The challenge decoded as a fee-bump transaction; SEP-10 challenges are plain Stellar transactions.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    context.transaction = transaction;
    return {
      status: "pass",
      message: "The challenge transaction decodes as a Stellar transaction envelope.",
      specRef: "SEP-10 §Response (Success)",
      evidence: [],
    };
  },
};

register(challengeDecodes);