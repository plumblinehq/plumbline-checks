import type { Check, CheckOutcome, Env } from "../../core.js";
import { recordEvidence } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { fetchToml, tomlUrl } from "./common.js";

/**
 * SEP-1 §Specification: "Given the domain DOMAIN, the stellar.toml will be
 * searched for at https://DOMAIN/.well-known/stellar.toml." An anchor whose
 * file is missing or not served there cannot be checked further.
 *
 * Redirects are followed (the client default), matching what a real client
 * does; the final URL is recorded in the evidence.
 */
export const tomlReachable: Check = {
  id: "sep1.toml-reachable",
  sep: 1,
  title: "stellar.toml is reachable",
  description:
    "Fetches https://<home domain>/.well-known/stellar.toml and requires a 2xx response at the SEP-1 defined location.",
  severity: "error",
  requires: [],
  async run(env: Env): Promise<CheckOutcome> {
    const response = await fetchToml(env);
    const evidence = [recordEvidence("GET", response)];
    const url = tomlUrl(env.homeDomain);
    if (response.status >= 200 && response.status < 300) {
      return {
        status: "pass",
        message: `stellar.toml is served at ${url} (HTTP ${response.status}).`,
        specRef: "SEP-1 §Specification",
        evidence,
      };
    }
    return {
      status: "fail",
      message: `GET ${url} returned HTTP ${response.status} ${response.statusText}; SEP-1 §Specification defines the stellar.toml at https://<domain>/.well-known/stellar.toml.`,
      specRef: "SEP-1 §Specification",
      evidence,
    };
  },
};

register(tomlReachable);
