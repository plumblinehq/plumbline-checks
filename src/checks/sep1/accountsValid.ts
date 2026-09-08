import { StrKey } from "@stellar/stellar-sdk";
import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { tomlValue } from "./common.js";

/**
 * SEP-1 §General Information, ACCOUNTS: requirement "list of `G...` strings",
 * described as "A list of Stellar accounts that are controlled by this
 * domain." One malformed account among valid ones poisons the list's whole
 * purpose — proving domain control — so any malformed entry fails the check,
 * naming its index. Absent or empty is a skip.
 */
export const accountsValid: Check = {
  id: "sep1.accounts-valid",
  sep: 1,
  title: "every ACCOUNTS entry is a valid Stellar account",
  description:
    "If ACCOUNTS is declared, requires every entry to be a valid G... ed25519 strkey, checksum included.",
  severity: "error",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const accounts = tomlValue(env, "ACCOUNTS");
    if (accounts === undefined) {
      return {
        status: "skip",
        message: "ACCOUNTS is not declared; nothing to validate.",
        specRef: "SEP-1 §General Information, ACCOUNTS",
        evidence: [],
      };
    }
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return {
        status: "fail",
        message: 'ACCOUNTS must be a non-empty list of "G..." strings.',
        specRef: "SEP-1 §General Information, ACCOUNTS",
        evidence: [],
      };
    }
    const offenders: string[] = [];
    accounts.forEach((account, index) => {
      if (typeof account !== "string" || !StrKey.isValidEd25519PublicKey(account)) {
        offenders.push(
          typeof account === "string"
            ? `entry ${index} (${account.slice(0, 8)}...) is not a valid "G..." strkey`
            : `entry ${index} is not a string`,
        );
      }
    });
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `ACCOUNTS contains invalid entries: ${offenders.join("; ")}.`,
        specRef: "SEP-1 §General Information, ACCOUNTS",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `All ${accounts.length} ACCOUNTS entries are valid Stellar accounts.`,
      specRef: "SEP-1 §General Information, ACCOUNTS",
      evidence: [],
    };
  },
};

register(accountsValid);
