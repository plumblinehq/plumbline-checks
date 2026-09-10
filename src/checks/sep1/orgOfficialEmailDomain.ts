import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { normalizedHost, tomlValue } from "./common.js";

/**
 * SEP-1 §Organization Documentation, ORG_OFFICIAL_EMAIL: "An email that
 * business partners such as wallets, exchanges, or anchors can use to contact
 * your organization. Must be hosted at your ORG_URL domain." The email's
 * domain must therefore match ORG_URL's host (www-prefix tolerated). When
 * either field is absent the comparison cannot be made, so the check skips;
 * an email with no usable domain, or a domain that differs from ORG_URL,
 * fails. This is a MUST in the spec, hence severity error.
 */
export const orgOfficialEmailDomain: Check = {
  id: "sep1.org-official-email-domain",
  sep: 1,
  title: "ORG_OFFICIAL_EMAIL is hosted at the ORG_URL domain",
  description:
    "If ORG_OFFICIAL_EMAIL and ORG_URL are both declared, requires the email's domain to match ORG_URL's domain, per SEP-1 §Organization Documentation.",
  severity: "error",
  specRef: "SEP-1 §Organization Documentation, ORG_OFFICIAL_EMAIL",
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
        specRef: "SEP-1 §Organization Documentation, ORG_OFFICIAL_EMAIL",
        evidence: [],
      };
    }
    const email = documentation.ORG_OFFICIAL_EMAIL;
    if (email === undefined) {
      return {
        status: "skip",
        message: "ORG_OFFICIAL_EMAIL is not declared; nothing to validate.",
        specRef: "SEP-1 §Organization Documentation, ORG_OFFICIAL_EMAIL",
        evidence: [],
      };
    }
    if (typeof email !== "string") {
      return {
        status: "fail",
        message: "ORG_OFFICIAL_EMAIL must be an email address hosted at the ORG_URL domain but is not a string.",
        specRef: "SEP-1 §Organization Documentation, ORG_OFFICIAL_EMAIL",
        evidence: [],
      };
    }
    const at = email.lastIndexOf("@");
    if (at <= 0 || at === email.length - 1) {
      return {
        status: "fail",
        message: `ORG_OFFICIAL_EMAIL "${email}" is not a valid email address.`,
        specRef: "SEP-1 §Organization Documentation, ORG_OFFICIAL_EMAIL",
        evidence: [],
      };
    }
    const orgUrl = documentation.ORG_URL;
    if (orgUrl === undefined) {
      return {
        status: "skip",
        message: "ORG_URL is not declared, so the email's required hosting domain cannot be determined.",
        specRef: "SEP-1 §Organization Documentation, ORG_OFFICIAL_EMAIL",
        evidence: [],
      };
    }
    if (typeof orgUrl !== "string") {
      return {
        status: "skip",
        message: "ORG_URL is not a string, so the email's required hosting domain cannot be determined.",
        specRef: "SEP-1 §Organization Documentation, ORG_OFFICIAL_EMAIL",
        evidence: [],
      };
    }
    let parsed: URL;
    try {
      parsed = new URL(orgUrl);
    } catch {
      return {
        status: "skip",
        message: "ORG_URL is not a valid URL, so the email's required hosting domain cannot be determined.",
        specRef: "SEP-1 §Organization Documentation, ORG_OFFICIAL_EMAIL",
        evidence: [],
      };
    }
    const emailDomain = normalizedHost(email.slice(at + 1));
    const orgDomain = normalizedHost(parsed.hostname);
    if (emailDomain === orgDomain) {
      return {
        status: "pass",
        message: `ORG_OFFICIAL_EMAIL is hosted at ${emailDomain}, the ORG_URL domain.`,
        specRef: "SEP-1 §Organization Documentation, ORG_OFFICIAL_EMAIL",
        evidence: [],
      };
    }
    return {
      status: "fail",
      message: `ORG_OFFICIAL_EMAIL is hosted at ${emailDomain} but ORG_URL is ${orgDomain}; SEP-1 requires them to match.`,
      specRef: "SEP-1 §Organization Documentation, ORG_OFFICIAL_EMAIL",
      evidence: [],
    };
  },
};

register(orgOfficialEmailDomain);