import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { currencyEntries, isTomlLink } from "./common.js";

/**
 * SEP-1 §Currency Documentation, code: "string (<= 12 char). Token code.
 * Required." A currency entry that links out via toml="..." defers its
 * fields to the linked file and is skipped here — sep1.currency-toml-link-
 * resolves validates those. Missing, non-string, or over-long codes fail;
 * the field is required for every inline entry.
 */
export const currencyCodeLength: Check = {
  id: "sep1.currency-code-length",
  sep: 1,
  title: "currency code is at most 12 characters",
  description:
    "Requires every inline [[CURRENCIES]] entry to declare a code of at most 12 characters, per SEP-1 §Currency Documentation.",
  severity: "error",
  specRef: "SEP-1 §Currency Documentation, code",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const currencies = currencyEntries(env);
    if (currencies.length === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entries are declared; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, code",
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
      const code = entry.code;
      if (code === undefined) {
        offenders.push(`entry ${index} declares no code`);
      } else if (typeof code !== "string") {
        offenders.push(`entry ${index} code is not a string`);
      } else if (code.length > 12) {
        offenders.push(`entry ${index} code "${code}" is ${code.length} characters (max 12)`);
      }
    });
    if (checked === 0) {
      return {
        status: "skip",
        message: "Every [[CURRENCIES]] entry links out to a TOML file; nothing to validate here.",
        specRef: "SEP-1 §Currency Documentation, code",
        evidence: [],
      };
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Invalid currency codes: ${offenders.join("; ")}.`,
        specRef: "SEP-1 §Currency Documentation, code",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `All ${checked} inline currency entries declare a code of at most 12 characters.`,
      specRef: "SEP-1 §Currency Documentation, code",
      evidence: [],
    };
  },
};

register(currencyCodeLength);