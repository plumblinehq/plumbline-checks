import { Networks } from "@stellar/stellar-sdk";
import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { tomlValue } from "./common.js";

/** The network passphrases the SDK knows, as a set of strings. */
const KNOWN_PASSPHRASES: ReadonlySet<string> = new Set([
  Networks.PUBLIC,
  Networks.TESTNET,
  Networks.FUTURENET,
  Networks.SANDBOX,
  Networks.STANDALONE,
]);

/**
 * SEP-1 §General Information, NETWORK_PASSPHRASE: "The passphrase for the
 * specific Stellar network this infrastructure operates on." A declared
 * passphrase naming a network nobody operates is worse than useful — clients
 * would verify SEP-10 challenges against the wrong network data. So a present
 * but unknown passphrase is an error, while an absent field is a skip: the
 * field is optional, and the architecture catalogue treats an unknown value as
 * "does not match a known network" (error) but never invents an obligation
 * where the spec declares none.
 */
export const networkPassphraseValid: Check = {
  id: "sep1.network-passphrase-valid",
  sep: 1,
  title: "NETWORK_PASSPHRASE matches a known network",
  description:
    "If NETWORK_PASSPHRASE is declared, requires it to match a known Stellar network passphrase.",
  severity: "error",
  specRef: "SEP-1 §General Information, NETWORK_PASSPHRASE",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const passphrase = tomlValue(env, "NETWORK_PASSPHRASE");
    if (passphrase === undefined) {
      return {
        status: "skip",
        message: "NETWORK_PASSPHRASE is not declared; nothing to validate.",
        specRef: "SEP-1 §General Information, NETWORK_PASSPHRASE",
        evidence: [],
      };
    }
    if (KNOWN_PASSPHRASES.has(passphrase)) {
      return {
        status: "pass",
        message: "NETWORK_PASSPHRASE matches a known Stellar network.",
        specRef: "SEP-1 §General Information, NETWORK_PASSPHRASE",
        evidence: [],
      };
    }
    return {
      status: "fail",
      message: `NETWORK_PASSPHRASE "${passphrase}" does not match a known Stellar network passphrase.`,
      specRef: "SEP-1 §General Information, NETWORK_PASSPHRASE",
      evidence: [],
    };
  },
};

register(networkPassphraseValid);
