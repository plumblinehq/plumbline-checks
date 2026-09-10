import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { tomlValue } from "./common.js";

/**
 * SEP-1 §General Information, VERSION: "The version of SEP-1 your
 * stellar.toml adheres to. This helps parsers know which fields to expect."
 * The field is optional but the spec urges completeness ("You should complete
 * as much of this as you can"), so an absent VERSION is a warning, never an
 * error: parsers that need it degrade gracefully by assuming the current
 * version.
 */
export const versionPresent: Check = {
  id: "sep1.version-present",
  sep: 1,
  title: "VERSION is declared",
  description:
    "Requires the global VERSION field, which tells parsers which SEP-1 version the file adheres to.",
  severity: "warning",
  specRef: "SEP-1 §General Information, VERSION",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const version = tomlValue(env, "VERSION");
    if (version === undefined) {
      return {
        status: "fail",
        message:
          'VERSION is not declared; SEP-1 §General Information describes it as "The version of SEP-1 your stellar.toml adheres to", which parsers use to know which fields to expect.',
        specRef: "SEP-1 §General Information, VERSION",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `VERSION is declared (${typeof version === "string" ? `"${version}"` : "non-string value"}).`,
      specRef: "SEP-1 §General Information, VERSION",
      evidence: [],
    };
  },
};

register(versionPresent);