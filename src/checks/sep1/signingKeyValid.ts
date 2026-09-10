import { StrKey } from "@stellar/stellar-sdk";
import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { tomlValue } from "./common.js";

/**
 * SEP-1 §General Information, SIGNING_KEY: requirement "Stellar public key",
 * described as "The signing key is used for SEP-3 (deprecated) and SEP-10 /
 * SEP-45 Authentication Protocols". Wallets verify SEP-10 challenge
 * signatures against this exact key, so a malformed value is an error.
 * Absent is a skip: the field is optional, and SEP-10 checks skip when the
 * anchor does not declare web auth at all.
 */
export const signingKeyValid: Check = {
  id: "sep1.signing-key-valid",
  sep: 1,
  title: "SIGNING_KEY is a valid Stellar public key",
  description:
    "If SIGNING_KEY is declared, requires it to be a valid G... ed25519 strkey, checksum included.",
  severity: "error",
  specRef: "SEP-1 §General Information, SIGNING_KEY",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const signingKey = tomlValue(env, "SIGNING_KEY");
    if (signingKey === undefined) {
      return {
        status: "skip",
        message: "SIGNING_KEY is not declared; nothing to validate.",
        specRef: "SEP-1 §General Information, SIGNING_KEY",
        evidence: [],
      };
    }
    if (StrKey.isValidEd25519PublicKey(signingKey)) {
      return {
        status: "pass",
        message: "SIGNING_KEY is a valid Stellar public key (G...).",
        specRef: "SEP-1 §General Information, SIGNING_KEY",
        evidence: [],
      };
    }
    return {
      status: "fail",
      message:
        'SIGNING_KEY is not a valid Stellar public key: it must be a "G..." strkey with a valid checksum.',
      specRef: "SEP-1 §General Information, SIGNING_KEY",
      evidence: [],
    };
  },
};

register(signingKeyValid);
