import { describe, expect, it } from "vitest";
import { networkPassphraseConsistent } from "../../../src/checks/sep10/networkPassphraseConsistent.js";
import { NETWORK_PASSPHRASE } from "../../fixtures/sep10/challenge.js";
import { envWithSep10 } from "./helpers.js";

describe("sep10.network-passphrase-consistent", () => {
  it("passes when the response matches the toml", async () => {
    const env = envWithSep10({ json: { transaction: "AAAA", network_passphrase: NETWORK_PASSPHRASE } });
    const outcome = await networkPassphraseConsistent.run(env);
    expect(outcome.status).toBe("pass");
  });

  it("fails when the response disagrees with the toml", async () => {
    const env = envWithSep10({
      json: { transaction: "AAAA", network_passphrase: "Public Global Stellar Network ; September 2015" },
    });
    const outcome = await networkPassphraseConsistent.run(env);
    expect(outcome.status).toBe("fail");
    expect(networkPassphraseConsistent.severity).toBe("error");
    expect(outcome.message).toContain(NETWORK_PASSPHRASE);
  });

  it("fails when the toml passphrase is absent and the response disagrees with the run network", async () => {
    const env = envWithSep10(
      { json: { transaction: "AAAA", network_passphrase: "Public Global Stellar Network ; September 2015" } },
      { NETWORK_PASSPHRASE: undefined },
    );
    env.network = "testnet";
    const outcome = await networkPassphraseConsistent.run(env);
    expect(outcome.status).toBe("fail");
  });

  it("skips when the response omits network_passphrase", async () => {
    const env = envWithSep10({ json: { transaction: "AAAA" } });
    const outcome = await networkPassphraseConsistent.run(env);
    expect(outcome.status).toBe("skip");
  });
});