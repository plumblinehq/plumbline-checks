import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { tomlValue } from "./common.js";

/**
 * The server endpoint fields from SEP-1 §General Information. The
 * Requirements column says "uses `https://`" for each of these. AUTH_SERVER
 * is deprecated but still listed with the same requirement, so a legacy
 * deployment declaring it is held to the same standard.
 */
const ENDPOINT_FIELDS = [
  "FEDERATION_SERVER",
  "AUTH_SERVER",
  "TRANSFER_SERVER",
  "TRANSFER_SERVER_SEP0024",
  "KYC_SERVER",
  "WEB_AUTH_ENDPOINT",
  "WEB_AUTH_FOR_CONTRACTS_ENDPOINT",
  "HORIZON_URL",
  "DIRECT_PAYMENT_SERVER",
  "ANCHOR_QUOTE_SERVER",
] as const;

/**
 * SEP-1 §General Information: every server endpoint field "uses `https://`".
 * A field that is not declared cannot violate the requirement, so absent
 * fields are skipped; a declared value that is not an https URL (including a
 * value that is not a URL at all) fails. URL schemes are case-insensitive
 * (RFC 3986), so the protocol is compared after normalization, not by string
 * prefix.
 */
export const endpointsHttps: Check = {
  id: "sep1.endpoints-https",
  sep: 1,
  title: "declared endpoints use https://",
  description:
    "Requires every declared server endpoint field to be an https:// URL, per the Requirements column of SEP-1 §General Information.",
  severity: "error",
  specRef: "SEP-1 §General Information (Requirements: uses https://)",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const offenders: string[] = [];
    let declared = 0;
    for (const field of ENDPOINT_FIELDS) {
      const value = tomlValue(env, field);
      if (value === undefined) {
        continue;
      }
      declared += 1;
      if (typeof value !== "string") {
        offenders.push(`${field} (not a string)`);
        continue;
      }
      try {
        if (new URL(value).protocol !== "https:") {
          offenders.push(`${field}="${value}"`);
        }
      } catch {
        offenders.push(`${field}="${value}" (not a valid URL)`);
      }
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `SEP-1 requires server endpoints to use https://; found: ${offenders.join(", ")}.`,
        specRef: "SEP-1 §General Information (Requirements: uses https://)",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message:
        declared === 0
          ? "No server endpoint fields are declared, so there is nothing to check."
          : `All ${declared} declared server endpoint fields use https://.`,
      specRef: "SEP-1 §General Information (Requirements: uses https://)",
      evidence: [],
    };
  },
};

register(endpointsHttps);
