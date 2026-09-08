import { StrKey } from "@stellar/stellar-sdk";
import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { tomlValue } from "./common.js";

/**
 * SEP-1 §General Information, WEB_AUTH_CONTRACT_ID: requirement "Stellar
 * contract ID", described as "The web authentication contract ID for SEP-45
 * Web Authentication". Clients invoke this exact contract for SEP-45 auth,
 * so a malformed value is an error. Absent is a skip: SEP-45 is optional and
 * the field is only meaningful alongside WEB_AUTH_FOR_CONTRACTS_ENDPOINT.
 */
export const webAuthContractIdValid: Check = {
  id: "sep1.web-auth-contract-id-valid",
  sep: 1,
  title: "WEB_AUTH_CONTRACT_ID is a valid contract ID",
  description:
    "If WEB_AUTH_CONTRACT_ID is declared, requires it to be a valid C... contract strkey, checksum included.",
  severity: "error",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const contractId = tomlValue(env, "WEB_AUTH_CONTRACT_ID");
    if (contractId === undefined) {
      return {
        status: "skip",
        message: "WEB_AUTH_CONTRACT_ID is not declared; nothing to validate.",
        specRef: "SEP-1 §General Information, WEB_AUTH_CONTRACT_ID",
        evidence: [],
      };
    }
    if (typeof contractId !== "string" || !StrKey.isValidContract(contractId)) {
      return {
        status: "fail",
        message:
          'WEB_AUTH_CONTRACT_ID is not a valid Stellar contract ID: it must be a "C..." strkey with a valid checksum.',
        specRef: "SEP-1 §General Information, WEB_AUTH_CONTRACT_ID",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: "WEB_AUTH_CONTRACT_ID is a valid contract ID (C...).",
      specRef: "SEP-1 §General Information, WEB_AUTH_CONTRACT_ID",
      evidence: [],
    };
  },
};

register(webAuthContractIdValid);
