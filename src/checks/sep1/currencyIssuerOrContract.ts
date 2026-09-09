import { StrKey } from "@stellar/stellar-sdk";
import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { currencyEntries, isTomlLink } from "./common.js";

/**
 * SEP-1 §Currency Documentation: issuer — "Required for tokens that are
 * Stellar Assets. Omitted if the token is not a Stellar asset" — and
 * contract — "Required for tokens that are not Stellar Assets. Omitted if
 * the token is a Stellar Asset." Every token is exactly one of the two, so
 * every inline entry must declare exactly one, and the declared value must
 * be the right kind of strkey (G... for issuer, C... for contract). The SDK
 * does not model the contract key, so it is read through the index
 * signature.
 */
export const currencyIssuerOrContract: Check = {
  id: "sep1.currency-issuer-or-contract",
  sep: 1,
  title: "currency declares exactly one of issuer or contract",
  description:
    "Requires every inline [[CURRENCIES]] entry to declare exactly one of issuer (a valid G... public key) or contract (a valid C... contract id), per SEP-1 §Currency Documentation.",
  severity: "error",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const currencies = currencyEntries(env);
    if (currencies.length === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entries are declared; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, issuer / contract",
        evidence: [],
      };
    }
    const offenders: string[] = [];
    let checked = 0;
    currencies.forEach((entry, index) => {
      if (isTomlLink(entry)) {
        return;
      }
      checked += 1;
      const issuer = entry.issuer;
      const contract = entry.contract;
      const hasIssuer = issuer !== undefined;
      const hasContract = contract !== undefined;
      if (hasIssuer && hasContract) {
        offenders.push(`entry ${index} declares both issuer and contract; exactly one is required`);
      } else if (!hasIssuer && !hasContract) {
        offenders.push(`entry ${index} declares neither issuer nor contract; exactly one is required`);
      } else if (hasIssuer) {
        if (typeof issuer !== "string" || !StrKey.isValidEd25519PublicKey(issuer)) {
          offenders.push(`entry ${index} issuer is not a valid "G..." public key`);
        }
      } else if (typeof contract !== "string" || !StrKey.isValidContract(contract)) {
        offenders.push(`entry ${index} contract is not a valid "C..." contract id`);
      }
    });
    if (checked === 0) {
      return {
        status: "skip",
        message: "Every [[CURRENCIES]] entry links out to a TOML file; nothing to validate here.",
        specRef: "SEP-1 §Currency Documentation, issuer / contract",
        evidence: [],
      };
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Invalid currency issuers/contracts: ${offenders.join("; ")}.`,
        specRef: "SEP-1 §Currency Documentation, issuer / contract",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `All ${checked} inline currency entries declare exactly one of issuer or contract.`,
      specRef: "SEP-1 §Currency Documentation, issuer / contract",
      evidence: [],
    };
  },
};

register(currencyIssuerOrContract);