import { parse } from "smol-toml";
import type { StellarToml } from "@stellar/stellar-sdk";
import type { Check, CheckOutcome, Env } from "../../core.js";
import { recordEvidence, truncateToBytes } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { fetchToml } from "./common.js";

/**
 * SEP-1 §Specification: "stellar.toml is in TOML file format." A file that is
 * not valid TOML cannot support any field-level check, so this is severity
 * error and populates `env.toml` as a side effect of passing — the runner
 * then skips every dependent check, naming this one as the failed
 * prerequisite.
 *
 * Parsing uses smol-toml, the same parser the SDK's StellarToml resolver
 * uses. The parsed value is typed with the SDK's StellarToml shape; the
 * field-level checks are what validate that fields are well-formed.
 */
export const tomlParses: Check = {
  id: "sep1.toml-parses",
  sep: 1,
  title: "stellar.toml is valid TOML",
  description:
    "Parses the stellar.toml body as TOML; on success the parsed file is made available to the rest of the run.",
  severity: "error",
  specRef: "SEP-1 §Specification, TOML format",
  requires: ["sep1.toml-reachable"],
  async run(env: Env): Promise<CheckOutcome> {
    const response = await fetchToml(env);
    const evidence = [recordEvidence("GET", response)];
    if (response.status < 200 || response.status >= 300) {
      return {
        status: "skip",
        message: `stellar.toml was not reachable (HTTP ${response.status}), so it could not be parsed.`,
        specRef: "SEP-1 §Specification, TOML format",
        evidence,
      };
    }
    try {
      const toml = parse(response.body) as StellarToml.Api.StellarToml;
      env.toml = toml;
      return {
        status: "pass",
        message: "stellar.toml parses as TOML.",
        specRef: "SEP-1 §Specification, TOML format",
        evidence,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: "fail",
        message: `stellar.toml is not valid TOML: ${message}`,
        specRef: "SEP-1 §Specification, TOML format",
        evidence: [
          {
            method: "GET",
            url: response.url,
            statusCode: response.status,
            body: truncateToBytes(response.body, 2048),
          },
        ],
      };
    }
  },
};

register(tomlParses);
