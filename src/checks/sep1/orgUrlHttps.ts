import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { tomlValue } from "./common.js";

/**
 * SEP-1 §Organization Documentation, ORG_URL: Requirements column "uses
 * https://", described as "Your organization's official URL". A declared
 * ORG_URL that is not an https URL (or not a URL at all) fails; an absent
 * field is a skip — it cannot violate a requirement it does not make.
 * Schemes are case-insensitive per RFC 3986, so the protocol is compared
 * after normalization.
 */
export const orgUrlHttps: Check = {
  id: "sep1.org-url-https",
  sep: 1,
  title: "ORG_URL uses https://",
  description:
    "If ORG_URL is declared, requires it to be an https:// URL, per the Requirements column of SEP-1 §Organization Documentation.",
  severity: "error",
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
        specRef: "SEP-1 §Organization Documentation, ORG_URL",
        evidence: [],
      };
    }
    const orgUrl = documentation.ORG_URL;
    if (orgUrl === undefined) {
      return {
        status: "skip",
        message: "ORG_URL is not declared; nothing to validate.",
        specRef: "SEP-1 §Organization Documentation, ORG_URL",
        evidence: [],
      };
    }
    if (typeof orgUrl !== "string") {
      return {
        status: "fail",
        message: "ORG_URL must be an https:// URL but is not a string.",
        specRef: "SEP-1 §Organization Documentation, ORG_URL",
        evidence: [],
      };
    }
    let parsed: URL;
    try {
      parsed = new URL(orgUrl);
    } catch {
      return {
        status: "fail",
        message: `ORG_URL "${orgUrl}" is not a valid URL; SEP-1 requires it to use https://.`,
        specRef: "SEP-1 §Organization Documentation, ORG_URL",
        evidence: [],
      };
    }
    if (parsed.protocol === "https:") {
      return {
        status: "pass",
        message: "ORG_URL uses https://.",
        specRef: "SEP-1 §Organization Documentation, ORG_URL",
        evidence: [],
      };
    }
    return {
      status: "fail",
      message: `ORG_URL "${orgUrl}" uses ${parsed.protocol}//; SEP-1 requires https://.`,
      specRef: "SEP-1 §Organization Documentation, ORG_URL",
      evidence: [],
    };
  },
};

register(orgUrlHttps);