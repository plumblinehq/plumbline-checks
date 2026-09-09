import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { tomlValue } from "./common.js";

/**
 * SEP-1 §Specification: "Many Stellar apps, including important wallets and
 * exchanges, make decisions on which tokens to support based on the
 * completeness of their Account Information and Documentation sections." The
 * [DOCUMENTATION] table is optional but its absence forfeits exactly the
 * completeness wallets decide on, so this is a warning, never an error.
 */
export const documentationPresent: Check = {
  id: "sep1.documentation-present",
  sep: 1,
  title: "a [DOCUMENTATION] table is declared",
  description:
    "Requires the [DOCUMENTATION] table, which carries the organization's identity and contact fields.",
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
        status: "fail",
        message:
          "No [DOCUMENTATION] table is declared; SEP-1 notes that wallets and exchanges decide which tokens to support based on the completeness of the Documentation section.",
        specRef: "SEP-1 §Specification, Organization Documentation",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: "A [DOCUMENTATION] table is declared.",
      specRef: "SEP-1 §Specification, Organization Documentation",
      evidence: [],
    };
  },
};

register(documentationPresent);