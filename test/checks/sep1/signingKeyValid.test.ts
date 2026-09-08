import { describe, expect, it } from "vitest";
import { signingKeyValid } from "../../../src/checks/sep1/signingKeyValid.js";
import { makeEnv } from "../../helpers.js";

const VALID_KEY = "GBBHQ7H4V6RRORKYLHTCAWP6MOHNORRFJSDPXDFYDGJB2LPZUFPXUEW3";

// A record, not the SDK type: these tests deliberately feed invalid values.
function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.signing-key-valid", () => {
  it("passes for a valid G... strkey", async () => {
    const outcome = await signingKeyValid.run(envWithToml({ SIGNING_KEY: VALID_KEY }));
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §General Information, SIGNING_KEY");
  });

  it("fails when the checksum is wrong", async () => {
    const corrupted = `${VALID_KEY.slice(0, -1)}4`;
    const outcome = await signingKeyValid.run(envWithToml({ SIGNING_KEY: corrupted }));
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("not a valid Stellar public key");
  });

  it("fails for a non-G prefix", async () => {
    const outcome = await signingKeyValid.run(
      envWithToml({ SIGNING_KEY: "SBSHUF2PW6G73BTHP3P4NJV2LUISTR4FMEUHOZJTKVSOONQXN2OLVG6S" }),
    );
    expect(outcome.status).toBe("fail");
  });

  it("fails for a too-short value", async () => {
    const outcome = await signingKeyValid.run(envWithToml({ SIGNING_KEY: "GABC" }));
    expect(outcome.status).toBe("fail");
  });

  it("skips when SIGNING_KEY is absent", async () => {
    const outcome = await signingKeyValid.run(envWithToml({}));
    expect(outcome.status).toBe("skip");
    expect(outcome.message).toContain("not declared");
  });
});
