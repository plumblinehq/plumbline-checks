import type { Check, CheckOutcome, Env } from "../../core.js";
import { recordEvidence } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { fetchToml } from "./common.js";

/**
 * SEP-1 §Specification: "You must enable CORS on the stellar.toml so people
 * can access this file from other sites. The following HTTP header must be set
 * for an HTTP response for /.well-known/stellar.toml file request:
 * Access-Control-Allow-Origin: *". MUST, so severity error.
 */
export const tomlCors: Check = {
  id: "sep1.toml-cors",
  sep: 1,
  title: "stellar.toml sets Access-Control-Allow-Origin: *",
  description:
    "Requires the Access-Control-Allow-Origin header on the stellar.toml response to be *, as the SEP-1 specification must-sets CORS for the file.",
  severity: "error",
  requires: [],
  async run(env: Env): Promise<CheckOutcome> {
    const response = await fetchToml(env);
    const evidence = [recordEvidence("GET", response, { inspectedHeaders: ["access-control-allow-origin"] })];
    const value = response.headers.get("access-control-allow-origin");
    if (value === "*") {
      return {
        status: "pass",
        message: "Access-Control-Allow-Origin: * is set on the stellar.toml response.",
        specRef: "SEP-1 §Specification, CORS",
        evidence,
      };
    }
    return {
      status: "fail",
      message: value
        ? `Access-Control-Allow-Origin is "${value}"; SEP-1 requires it to be "*".`
        : `Access-Control-Allow-Origin is missing; SEP-1 requires CORS on the stellar.toml response.`,
      specRef: "SEP-1 §Specification, CORS",
      evidence,
    };
  },
};

register(tomlCors);
