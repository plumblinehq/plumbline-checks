import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { tomlValue } from "./common.js";

/**
 * SEP-1 §Validator Information: PUBLIC_KEY — "The Stellar account associated
 * with the node" — and HOST — "The IP:port or domain:port peers can use to
 * connect to the node". A validator entry without either field is unusable
 * by network peers, but SEP-1 states the fields as descriptions with no
 * MUST/SHOULD language, so this is an info-level observation, not a
 * failure of the anchor.
 */
export const validatorFieldsPresent: Check = {
  id: "sep1.validator-fields-present",
  sep: 1,
  title: "every [[VALIDATORS]] entry has PUBLIC_KEY and HOST",
  description:
    "For each [[VALIDATORS]] entry, reports whether PUBLIC_KEY and HOST are declared.",
  severity: "info",
  specRef: "SEP-1 §Validator Information, PUBLIC_KEY / HOST",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const validators = tomlValue(env, "VALIDATORS");
    if (!Array.isArray(validators) || validators.length === 0) {
      return {
        status: "skip",
        message: "No [[VALIDATORS]] entries are declared; nothing to validate.",
        specRef: "SEP-1 §Validator Information, PUBLIC_KEY / HOST",
        evidence: [],
      };
    }
    const offenders: string[] = [];
    validators.forEach((entry, index) => {
      const missing: string[] = [];
      if (entry.PUBLIC_KEY === undefined) {
        missing.push("PUBLIC_KEY");
      }
      if (entry.HOST === undefined) {
        missing.push("HOST");
      }
      if (missing.length > 0) {
        offenders.push(`entry ${index} is missing ${missing.join(" and ")}`);
      }
    });
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Validator entries missing required fields: ${offenders.join("; ")}.`,
        specRef: "SEP-1 §Validator Information, PUBLIC_KEY / HOST",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `All ${validators.length} validator entr${validators.length === 1 ? "y" : "ies"} declare${validators.length === 1 ? "s" : ""} PUBLIC_KEY and HOST.`,
      specRef: "SEP-1 §Validator Information, PUBLIC_KEY / HOST",
      evidence: [],
    };
  },
};

register(validatorFieldsPresent);