import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { currencyEntries, isTomlLink } from "./common.js";

/** The three mutually exclusive issuance policy fields. */
const POLICY_FIELDS = ["fixed_number", "max_number", "is_unlimited"] as const;

/**
 * SEP-1 §Currency Documentation: "fixed_number, max_number, and
 * is_unlimited are mutually exclusive issuance policies. Include exactly one
 * of those fields." Together with "exclude any that don't apply", an entry
 * that declares no policy is fine (skip), but an entry that declares more
 * than one is self-contradictory and fails.
 */
export const currencyIssuancePolicyExclusive: Check = {
  id: "sep1.currency-issuance-policy-exclusive",
  sep: 1,
  title: "exactly one issuance policy is declared",
  description:
    "Requires each [[CURRENCIES]] entry to declare at most one of fixed_number, max_number, is_unlimited, per SEP-1 §Currency Documentation.",
  severity: "error",
  specRef: "SEP-1 §Currency Documentation, fixed_number / max_number / is_unlimited",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const currencies = currencyEntries(env);
    if (currencies.length === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entries are declared; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, fixed_number / max_number / is_unlimited",
        evidence: [],
      };
    }
    const offenders: string[] = [];
    let checked = 0;
    currencies.forEach((entry, index) => {
      if (isTomlLink(entry)) {
        return;
      }
      const declared = POLICY_FIELDS.filter((field) => entry[field] !== undefined);
      if (declared.length === 0) {
        return;
      }
      checked += 1;
      if (declared.length > 1) {
        offenders.push(`entry ${index} declares ${declared.join(", ")}; exactly one issuance policy is required`);
      }
    });
    if (checked === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entry declares an issuance policy; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, fixed_number / max_number / is_unlimited",
        evidence: [],
      };
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Conflicting issuance policies: ${offenders.join("; ")}.`,
        specRef: "SEP-1 §Currency Documentation, fixed_number / max_number / is_unlimited",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `All ${checked} issuance policy declarations are exclusive.`,
      specRef: "SEP-1 §Currency Documentation, fixed_number / max_number / is_unlimited",
      evidence: [],
    };
  },
};

register(currencyIssuancePolicyExclusive);