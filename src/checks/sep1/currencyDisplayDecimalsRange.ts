import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { currencyEntries, isTomlLink } from "./common.js";

/**
 * SEP-1 §Currency Documentation, display_decimals: "int (0 to 7). Preference
 * for number of decimals to show when a client displays currency balance."
 * The spec fixes the range, so a declared value outside it fails. Absent is
 * a skip: the field is optional.
 */
export const currencyDisplayDecimalsRange: Check = {
  id: "sep1.currency-display-decimals-range",
  sep: 1,
  title: "display_decimals is an integer from 0 to 7",
  description:
    "If a [[CURRENCIES]] entry declares display_decimals, requires it to be an integer in the 0..7 range SEP-1 specifies.",
  severity: "error",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const currencies = currencyEntries(env);
    if (currencies.length === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entries are declared; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, display_decimals",
        evidence: [],
      };
    }
    const offenders: string[] = [];
    let checked = 0;
    currencies.forEach((entry, index) => {
      if (isTomlLink(entry)) {
        return;
      }
      const decimals = entry.display_decimals;
      if (decimals === undefined) {
        return;
      }
      checked += 1;
      if (typeof decimals !== "number" || !Number.isInteger(decimals) || decimals < 0 || decimals > 7) {
        offenders.push(`entry ${index} display_decimals "${String(decimals)}" is not an integer from 0 to 7`);
      }
    });
    if (checked === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entry declares display_decimals; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, display_decimals",
        evidence: [],
      };
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Invalid display_decimals values: ${offenders.join("; ")}.`,
        specRef: "SEP-1 §Currency Documentation, display_decimals",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `All ${checked} declared display_decimals values are integers from 0 to 7.`,
      specRef: "SEP-1 §Currency Documentation, display_decimals",
      evidence: [],
    };
  },
};

register(currencyDisplayDecimalsRange);