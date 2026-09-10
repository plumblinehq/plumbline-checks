import type { Check, CheckOutcome, Env } from "../../core.js";
import { recordEvidence, truncateToBytes } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { fetchToml } from "./common.js";

/**
 * SEP-1 §Specification: "stellar.toml can have a maximum file size of 100KB."
 * A stated maximum, so severity error. The limit is measured on the body in
 * bytes; the client caps reads at 1 MiB, well above the limit, so an
 * over-limit file is still fully observed here.
 */
export const TOML_MAX_BYTES = 100 * 1024;

export const tomlSize: Check = {
  id: "sep1.toml-size",
  sep: 1,
  title: "stellar.toml is within the 100KB maximum file size",
  description:
    "Measures the stellar.toml body in bytes and requires it to be at most 100KB, the SEP-1 maximum file size.",
  severity: "error",
  specRef: "SEP-1 §Specification, max file size",
  requires: ["sep1.toml-reachable"],
  async run(env: Env): Promise<CheckOutcome> {
    const response = await fetchToml(env);
    const sizeBytes = new TextEncoder().encode(response.body).length;
    const evidence = [
      recordEvidence("GET", response, {
        inspectedHeaders: ["content-length"],
      }),
    ];
    if (sizeBytes <= TOML_MAX_BYTES) {
      return {
        status: "pass",
        message: `stellar.toml is ${sizeBytes} bytes, within the 100KB maximum.`,
        specRef: "SEP-1 §Specification, max file size",
        evidence,
      };
    }
    return {
      status: "fail",
      message: `stellar.toml is ${sizeBytes} bytes; SEP-1 sets a maximum file size of ${TOML_MAX_BYTES} bytes (100KB).`,
      specRef: "SEP-1 §Specification, max file size",
      evidence: [
        {
          method: "GET",
          url: response.url,
          statusCode: response.status,
          body: truncateToBytes(
            `observed ${sizeBytes} bytes; first ${EVIDENCE_SNIPPET_BYTES} bytes of the file:\n${response.body}`,
            2048,
          ),
        },
      ],
    };
  },
};

register(tomlSize);

const EVIDENCE_SNIPPET_BYTES = 512;
