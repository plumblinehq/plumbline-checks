import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { currencyEntries, isTomlLink } from "./common.js";

/**
 * SEP-1 §Currency Documentation, name: "string (<= 20 char). A short name
 * for the token." The length cap is explicit, so a declared name longer than
 * 20 characters fails. Absent is a skip: the field is optional.
 */
export const currencyNameLength: Check = {
  id: "sep1.currency-name-length",
  sep: 1,
  title: "currency name is at most 20 characters",
  description:
    "If a [[CURRENCIES]] entry declares name, requires it to be a string of at most 20 characters, per SEP-1 §Currency Documentation.",
  severity: "error",
  specRef: "SEP-1 §Currency Documentation, name",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const currencies = currencyEntries(env);
    if (currencies.length === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entries are declared; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, name",
        evidence: [],
      };
    }
    const offenders: string[] = [];
    let checked = 0;
    currencies.forEach((entry, index) => {
      if (isTomlLink(entry)) {
        return;
      }
      const name = entry.name;
      if (name === undefined) {
        return;
      }
      checked += 1;
      if (typeof name !== "string" || name.length > 20) {
        offenders.push(`entry ${index} name "${String(name)}" is not a string of at most 20 characters`);
      }
    });
    if (checked === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entry declares a name; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, name",
        evidence: [],
      };
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Invalid currency names: ${offenders.join("; ")}.`,
        specRef: "SEP-1 §Currency Documentation, name",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `All ${checked} declared currency names are at most 20 characters.`,
      specRef: "SEP-1 §Currency Documentation, name",
      evidence: [],
    };
  },
};

register(currencyNameLength);