import type { Check, CheckOutcome, Env } from "../../core.js";
import { recordEvidence } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { tomlValue } from "./common.js";

/**
 * SEP-1 §Organization Documentation, ORG_LOGO: "A PNG image of your
 * organization's logo on a transparent background." The spec states the
 * field as a URL without MUST/SHOULD language, so a logo that does not
 * resolve, or resolves to something that is not a PNG, is a warning. Absent
 * is a skip. The fetch is a plain GET through the rate-limited client.
 */
export const orgLogoReachable: Check = {
  id: "sep1.org-logo-reachable",
  sep: 1,
  title: "ORG_LOGO resolves and is a PNG",
  description:
    "If ORG_LOGO is declared, fetches it and requires a 2xx response with an image/png content type.",
  severity: "warning",
  specRef: "SEP-1 §Organization Documentation, ORG_LOGO",
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
        specRef: "SEP-1 §Organization Documentation, ORG_LOGO",
        evidence: [],
      };
    }
    const logo = documentation.ORG_LOGO;
    if (logo === undefined) {
      return {
        status: "skip",
        message: "ORG_LOGO is not declared; nothing to validate.",
        specRef: "SEP-1 §Organization Documentation, ORG_LOGO",
        evidence: [],
      };
    }
    if (typeof logo !== "string") {
      return {
        status: "fail",
        message: "ORG_LOGO must be a URL to a PNG image but is not a string.",
        specRef: "SEP-1 §Organization Documentation, ORG_LOGO",
        evidence: [],
      };
    }
    let url: URL;
    try {
      url = new URL(logo);
    } catch {
      return {
        status: "fail",
        message: `ORG_LOGO "${logo}" is not a valid URL.`,
        specRef: "SEP-1 §Organization Documentation, ORG_LOGO",
        evidence: [],
      };
    }
    const response = await env.http.get(url.toString());
    const evidence = [recordEvidence("GET", response, { inspectedHeaders: ["content-type"] })];
    if (response.status < 200 || response.status >= 300) {
      return {
        status: "fail",
        message: `ORG_LOGO ${url.toString()} did not resolve (HTTP ${response.status}).`,
        specRef: "SEP-1 §Organization Documentation, ORG_LOGO",
        evidence,
      };
    }
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("image/png")) {
      return {
        status: "fail",
        message: `ORG_LOGO ${url.toString()} is not a PNG image (content-type: ${contentType || "missing"}).`,
        specRef: "SEP-1 §Organization Documentation, ORG_LOGO",
        evidence,
      };
    }
    return {
      status: "pass",
      message: `ORG_LOGO ${url.toString()} resolves and is served as a PNG.`,
      specRef: "SEP-1 §Organization Documentation, ORG_LOGO",
      evidence,
    };
  },
};

register(orgLogoReachable);