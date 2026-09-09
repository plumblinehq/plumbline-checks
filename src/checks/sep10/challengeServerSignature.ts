import { Keypair } from "@stellar/stellar-sdk";
import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { resolveNetworkPassphrase, sep10Context, signingKey } from "./common.js";

/**
 * SEP-10 §Authentication flow: "The Client verifies that the transaction is
 * signed by the Server Account obtained through discovery flow." The
 * signature is over the transaction hash for the declared network — the
 * toml's NETWORK_PASSPHRASE, falling back to the run's network per the
 * SEP-10 convention. Any one valid signature by the SIGNING_KEY passes.
 */
export const challengeServerSignature: Check = {
  id: "sep10.challenge-server-signature",
  sep: 10,
  title: "the challenge is signed by the SIGNING_KEY",
  description:
    "Verifies that the decoded challenge envelope carries a valid signature by the toml's SIGNING_KEY over the transaction hash for the declared network.",
  severity: "error",
  requires: ["sep10.challenge-decodes"],
  async run(env: Env): Promise<CheckOutcome> {
    const serverAccount = signingKey(env);
    if (serverAccount === undefined) {
      return {
        status: "skip",
        message: "SIGNING_KEY is not declared; nothing to validate.",
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    const transaction = sep10Context(env).transaction;
    if (transaction === undefined) {
      return {
        status: "skip",
        message: "No decoded challenge transaction is available.",
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    const hash = transaction.hash();
    const serverKey = Keypair.fromPublicKey(serverAccount);
    let verified = false;
    for (const decorated of transaction.signatures) {
      try {
        if (serverKey.verify(hash, decorated.signature)) {
          verified = true;
          break;
        }
      } catch {
        // A malformed signature is not a signature by the server account.
        continue;
      }
    }
    if (verified) {
      return {
        status: "pass",
        message: `The challenge carries a valid signature by the SIGNING_KEY (${serverAccount}) over the transaction hash for ${resolveNetworkPassphrase(env)}.`,
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    return {
      status: "fail",
      message: `No signature on the challenge verifies against the SIGNING_KEY (${serverAccount}) for the ${resolveNetworkPassphrase(env)} network.`,
      specRef: "SEP-10 §Authentication flow",
      evidence: [],
    };
  },
};

register(challengeServerSignature);