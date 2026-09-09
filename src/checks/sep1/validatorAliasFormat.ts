import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { tomlValue } from "./common.js";

/** The exact regex SEP-1 states for ALIAS. */
const ALIAS_PATTERN = /^[a-z0-9-]{2,16}$/;

/**
 * SEP-1 §Validator Information, ALIAS: "A name for display in stellar-core
 * configs that conforms to ^[a-z0-9-]{2,16}$". The spec states the pattern
 * as a description rather than MUST/SHOULD, so a non-conforming alias is a
 * warning. Entries without an alias are skipped — their presence is the
 * concern of sep1.validator-fields-present (info).
 */
export const validatorAliasFormat: Check = {
  id: "sep1.validator-alias-format",
  sep: 1,
  title: "validator ALIAS matches ^[a-z0-9-]{2,16}$",
  description:
    "If a [[VALIDATORS]] entry declares ALIAS, requires it to match the pattern SEP-1 states for stellar-core configs.",
  severity: "warning",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const validators = tomlValue(env, "VALIDATORS");
    if (!Array.isArray(validators) || validators.length === 0) {
      return {
        status: "skip",
        message: "No [[VALIDATORS]] entries are declared; nothing to validate.",
        specRef: "SEP-1 §Validator Information, ALIAS",
        evidence: [],
      };
    }
    const offenders: string[] = [];
    let checked = 0;
    validators.forEach((entry, index) => {
      const alias = entry.ALIAS;
      if (alias === undefined) {
        return;
      }
      checked += 1;
      if (typeof alias !== "string" || !ALIAS_PATTERN.test(alias)) {
        offenders.push(`entry ${index} ALIAS "${String(alias)}" does not match ^[a-z0-9-]{2,16}$`);
      }
    });
    if (checked === 0) {
      return {
        status: "skip",
        message: "No [[VALIDATORS]] entry declares an ALIAS; nothing to validate.",
        specRef: "SEP-1 §Validator Information, ALIAS",
        evidence: [],
      };
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Non-conforming validator aliases: ${offenders.join("; ")}.`,
        specRef: "SEP-1 §Validator Information, ALIAS",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `All ${checked} declared validator aliases match ^[a-z0-9-]{2,16}$.`,
      specRef: "SEP-1 §Validator Information, ALIAS",
      evidence: [],
    };
  },
};

register(validatorAliasFormat);