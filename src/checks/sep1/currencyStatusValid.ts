import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { currencyEntries, isTomlLink } from "./common.js";

/** The values SEP-1 enumerates for status. */
const VALID_STATUSES: ReadonlySet<string> = new Set(["live", "dead", "test", "private"]);

/**
 * SEP-1 §Currency Documentation, status: "One of live, dead, test, or
 * private." The spec enumerates the allowed values, so a declared status
 * outside the set fails. The field is optional ("exclude any that don't
 * apply"), so an absent status is not an error: entries without one are
 * skipped.
 */
export const currencyStatusValid: Check = {
  id: "sep1.currency-status-valid",
  sep: 1,
  title: "currency status is one of live, dead, test, private",
  description:
    "If a [[CURRENCIES]] entry declares status, requires it to be one of the four values SEP-1 enumerates.",
  severity: "error",
  specRef: "SEP-1 §Currency Documentation, status",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const currencies = currencyEntries(env);
    if (currencies.length === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entries are declared; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, status",
        evidence: [],
      };
    }
    const offenders: string[] = [];
    let checked = 0;
    currencies.forEach((entry, index) => {
      if (isTomlLink(entry)) {
        return;
      }
      const status = entry.status;
      if (status === undefined) {
        return;
      }
      checked += 1;
      if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
        offenders.push(`entry ${index} status "${String(status)}" is not one of live, dead, test, private`);
      }
    });
    if (checked === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entry declares a status; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, status",
        evidence: [],
      };
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Invalid currency statuses: ${offenders.join("; ")}.`,
        specRef: "SEP-1 §Currency Documentation, status",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `All ${checked} declared status values are one of live, dead, test, private.`,
      specRef: "SEP-1 §Currency Documentation, status",
      evidence: [],
    };
  },
};

register(currencyStatusValid);