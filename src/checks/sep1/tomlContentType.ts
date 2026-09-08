import type { Check, CheckOutcome, Env } from "../../core.js";
import { recordEvidence } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { fetchToml } from "./common.js";

/**
 * SEP-1 §Specification: "It is also recommended to set a `text/plain` content
 * type so that browsers render the contents, rather than prompting for a
 * download." Recommended, not must — severity warning.
 */
export const tomlContentType: Check = {
  id: "sep1.toml-content-type",
  sep: 1,
  title: "stellar.toml is served as text/plain",
  description:
    "Recommends a text/plain content type on the stellar.toml response so browsers render the file instead of prompting a download.",
  severity: "warning",
  requires: [],
  async run(env: Env): Promise<CheckOutcome> {
    const response = await fetchToml(env);
    const evidence = [recordEvidence("GET", response, { inspectedHeaders: ["content-type"] })];
    const contentType = response.headers.get("content-type") ?? "";
    const mediaType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (mediaType === "text/plain") {
      return {
        status: "pass",
        message: "stellar.toml is served as text/plain.",
        specRef: "SEP-1 §Specification, content type",
        evidence,
      };
    }
    return {
      status: "fail",
      message: contentType
        ? `Content-Type is "${contentType}"; SEP-1 recommends text/plain so browsers render the file.`
        : "Content-Type is missing; SEP-1 recommends text/plain so browsers render the file.",
      specRef: "SEP-1 §Specification, content type",
      evidence,
    };
  },
};

register(tomlContentType);
