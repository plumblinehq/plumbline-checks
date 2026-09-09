import { describe, expect, it } from "vitest";
import { networkPassphraseReturned } from "../../../src/checks/sep10/networkPassphraseReturned.js";
import { NETWORK_PASSPHRASE } from "../../fixtures/sep10/challenge.js";
import { envWithSep10 } from "./helpers.js";

describe("sep10.network-passphrase-returned", () => {
  it("passes when the response declares network_passphrase", async () => {
    const env = envWithSep10({ json: { transaction: "AAAA", network_passphrase: NETWORK_PASSPHRASE } });
    const outcome = await networkPassphraseReturned.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Response (Success)");
  });

  it("fails when the response omits it", async () => {
    const env = envWithSep10({ json: { transaction: "AAAA" } });
    const outcome = await networkPassphraseReturned.run(env);
    expect(outcome.status).toBe("fail");
    expect(networkPassphraseReturned.severity).toBe("warning");
  });
});