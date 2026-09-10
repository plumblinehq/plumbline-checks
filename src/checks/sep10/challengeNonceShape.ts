import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { sep10Context } from "./common.js";

/**
 * SEP-10 §Response (Success): the first operation's value "must be 64 bytes
 * long. It contains a 48 byte cryptographic-quality random string encoded
 * using base64 (for a total of 64 bytes after encoding)." The randomness
 * cannot be checked mechanically, but the byte length and the base64
 * round-trip to 48 bytes can: 48 bytes of base64 encode to exactly 64
 * characters with no padding, so a 64-byte value that decodes to 48 bytes
 * satisfies the shape.
 */
export const challengeNonceShape: Check = {
  id: "sep10.challenge-nonce-shape",
  sep: 10,
  title: "the first operation's value is a 64-byte nonce",
  description:
    "Requires the first Manage Data operation's value to be 64 bytes that base64-decode to 48 bytes, per SEP-10 §Response (Success).",
  severity: "error",
  specRef: "SEP-10 §Response (Success)",
  requires: ["sep10.challenge-first-op-manage-data"],
  async run(env: Env): Promise<CheckOutcome> {
    const first = sep10Context(env).transaction?.operations[0];
    if (first === undefined || first.type !== "manageData") {
      return {
        status: "skip",
        message: "No first Manage Data operation is available.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    const value = first.value;
    if (value === undefined) {
      return {
        status: "fail",
        message: "The first Manage Data operation has no value; SEP-10 requires a 64-byte nonce.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    if (value.length !== 64) {
      return {
        status: "fail",
        message: `The nonce value is ${value.length} bytes; SEP-10 requires exactly 64.`,
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    const ascii = new TextDecoder().decode(value);
    const decodedBytes = Buffer.from(ascii, "base64").length;
    if (decodedBytes !== 48) {
      return {
        status: "fail",
        message: `The nonce value does not base64-decode to 48 bytes (got ${decodedBytes}); SEP-10 requires a 48-byte random string encoded as base64.`,
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: "The first operation's value is a 64-byte base64-encoded 48-byte nonce.",
      specRef: "SEP-10 §Response (Success)",
      evidence: [],
    };
  },
};

register(challengeNonceShape);