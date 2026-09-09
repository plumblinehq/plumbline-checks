import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { tomlValue } from "./common.js";

/**
 * E.164 numbers are at most 15 digits including the country code, start with
 * a "+" and a non-zero country code, and contain no spaces or separators.
 */
const E164 = /^\+[1-9][0-9]{1,14}$/;

/**
 * SEP-1 §Organization Documentation, ORG_PHONE_NUMBER: "Your organization's
 * phone number in E.164 format, e.g. +14155552671." The spec states the
 * format as a description rather than a MUST or SHOULD, so a value that does
 * not conform is a warning, never an error. Absent is a skip: the field is
 * optional.
 */
export const orgPhoneE164: Check = {
  id: "sep1.org-phone-e164",
  sep: 1,
  title: "ORG_PHONE_NUMBER is E.164 formatted",
  description:
    "If ORG_PHONE_NUMBER is declared, requires it to match the E.164 format the spec describes, e.g. +14155552671.",
  severity: "warning",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const documentation = tomlValue(env, "DOCUMENTATION");
    if (
      documentation === undefined ||
      documentation === null ||
      typeof documentation !== "object" ||
      Array.isArray(documentation)
    ) {
      return {
        status: "skip",
        message: "No [DOCUMENTATION] table is declared; nothing to validate.",
        specRef: "SEP-1 §Organization Documentation, ORG_PHONE_NUMBER",
        evidence: [],
      };
    }
    const phone = documentation.ORG_PHONE_NUMBER;
    if (phone === undefined) {
      return {
        status: "skip",
        message: "ORG_PHONE_NUMBER is not declared; nothing to validate.",
        specRef: "SEP-1 §Organization Documentation, ORG_PHONE_NUMBER",
        evidence: [],
      };
    }
    if (typeof phone !== "string" || !E164.test(phone)) {
      return {
        status: "fail",
        message: `ORG_PHONE_NUMBER "${phone}" is not in E.164 format (e.g. +14155552671).`,
        specRef: "SEP-1 §Organization Documentation, ORG_PHONE_NUMBER",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: "ORG_PHONE_NUMBER is in E.164 format.",
      specRef: "SEP-1 §Organization Documentation, ORG_PHONE_NUMBER",
      evidence: [],
    };
  },
};

register(orgPhoneE164);