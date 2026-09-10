import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { sep10Context, signingKey } from "./common.js";

/**
 * SEP-10 §Authentication flow: "The Client verifies that if the transaction
 * has other operations they are Manage Data operations and that their
 * source account is set to: The Client Domain Account if the Manage Data
 * operation key is set to client_domain; Otherwise, the Server Account."
 * The client domain account lives on the client's own toml, which a
 * read-only scan of the anchor cannot resolve, so client_domain operations
 * are exempt here — exactly the carve-out the catalogue describes. Every
 * other additional operation must be a Manage Data operation sourced from
 * the server account.
 */
export const challengeOtherOpsSource: Check = {
  id: "sep10.challenge-other-ops-source",
  sep: 10,
  title: "additional operations are sourced from the server account",
  description:
    "Requires every operation after the first to be a Manage Data operation sourced from the SIGNING_KEY, except client_domain operations.",
  severity: "error",
  specRef: "SEP-10 §Authentication flow",
  requires: ["sep10.challenge-has-operations"],
  async run(env: Env): Promise<CheckOutcome> {
    const transaction = sep10Context(env).transaction;
    if (transaction === undefined) {
      return {
        status: "skip",
        message: "No decoded challenge transaction is available.",
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    const serverAccount = signingKey(env);
    const offenders: string[] = [];
    for (const [index, op] of transaction.operations.entries()) {
      if (index === 0) {
        continue;
      }
      if (op.type !== "manageData") {
        offenders.push(`operation ${index} is ${op.type}, not Manage Data`);
        continue;
      }
      if (op.name === "client_domain") {
        continue;
      }
      if (serverAccount !== undefined && op.source !== serverAccount) {
        offenders.push(
          `operation ${index} ("${op.name}") is sourced from ${op.source ?? "(none)"}, not the SIGNING_KEY (${serverAccount})`,
        );
      }
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Additional operations not sourced from the server account: ${offenders.join("; ")}.`,
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    const additional = transaction.operations.length - 1;
    return {
      status: "pass",
      message:
        additional === 0
          ? "The challenge has no additional operations to validate."
          : `All ${additional} additional operation${additional === 1 ? " is" : "s are"} sourced as SEP-10 requires.`,
      specRef: "SEP-10 §Authentication flow",
      evidence: [],
    };
  },
};

register(challengeOtherOpsSource);