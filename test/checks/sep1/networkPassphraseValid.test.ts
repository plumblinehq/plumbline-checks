import { Networks, type StellarToml } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { networkPassphraseValid } from "../../../src/checks/sep1/networkPassphraseValid.js";
import { makeEnv } from "../../helpers.js";

// A record, not the SDK type: these tests deliberately feed invalid values.
function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as StellarToml.Api.StellarToml;
  return env;
}

describe("sep1.network-passphrase-valid", () => {
  it("passes for the pubnet passphrase", async () => {
    const outcome = await networkPassphraseValid.run(
      envWithToml({ NETWORK_PASSPHRASE: Networks.PUBLIC }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §General Information, NETWORK_PASSPHRASE");
  });

  it("passes for the testnet passphrase", async () => {
    const outcome = await networkPassphraseValid.run(
      envWithToml({ NETWORK_PASSPHRASE: Networks.TESTNET }),
    );
    expect(outcome.status).toBe("pass");
  });

  it("fails for an unknown passphrase", async () => {
    const outcome = await networkPassphraseValid.run(
      envWithToml({ NETWORK_PASSPHRASE: "Not A Real Network ; January 2020" }),
    );
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("Not A Real Network ; January 2020");
  });

  it("skips when the field is absent", async () => {
    const outcome = await networkPassphraseValid.run(envWithToml({}));
    expect(outcome.status).toBe("skip");
    expect(outcome.message).toContain("not declared");
  });
});
