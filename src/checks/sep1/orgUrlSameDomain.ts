import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { normalizedHost, tomlValue } from "./common.js";

/**
 * SEP-1 §Organization Documentation, ORG_URL: "Your stellar.toml must be
 * hosted on the same domain." The toml is hosted at
 * https://<home domain>/.well-known/stellar.toml, so ORG_URL's host must be
 * the same registrable domain as the home domain (www-prefix tolerated, see
 * normalizedHost). An absent field is a skip; a declared value that cannot
 * be a URL at all cannot be hosted on any domain, which fails the
 * requirement outright.
 */
export const orgUrlSameDomain: Check = {
  id: "sep1.org-url-same-domain",
  sep: 1,
  title: "the stellar.toml is hosted on the ORG_URL domain",
  description:
    "If ORG_URL is declared, requires the home domain hosting the stellar.toml to be the same domain, per SEP-1 §Organization Documentation.",
  severity: "error",
  specRef: "SEP-1 §Organization Documentation, ORG_URL",
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
        message: "ORG_URL must be a URL hosted on the home domain but is not a string.",
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
        message: `ORG_URL "${orgUrl}" is not a valid URL, so the stellar.toml cannot be hosted on its domain.`,
        specRef: "SEP-1 §Organization Documentation, ORG_URL",
        evidence: [],
      };
    }
    if (normalizedHost(parsed.hostname) === normalizedHost(env.homeDomain)) {
      return {
        status: "pass",
        message: `ORG_URL (${parsed.hostname}) is on the same domain as the home domain (${env.homeDomain}).`,
        specRef: "SEP-1 §Organization Documentation, ORG_URL",
        evidence: [],
      };
    }
    return {
      status: "fail",
      message: `ORG_URL is hosted at ${parsed.hostname} but the stellar.toml is served from ${env.homeDomain}; SEP-1 requires them to be the same domain.`,
      specRef: "SEP-1 §Organization Documentation, ORG_URL",
      evidence: [],
    };
  },
};

register(orgUrlSameDomain);