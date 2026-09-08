import { StrKey } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { webAuthContractIdValid } from "../../../src/checks/sep1/webAuthContractIdValid.js";
import { makeEnv } from "../../helpers.js";

// A record, not the SDK type: these tests deliberately feed invalid values.
function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.web-auth-contract-id-valid", () => {
  it("passes for a valid C... strkey", async () => {
    const contractId = StrKey.encodeContract(new Uint8Array(32).fill(7));
    const outcome = await webAuthContractIdValid.run(
      envWithToml({ WEB_AUTH_CONTRACT_ID: contractId }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.message).toContain("valid contract ID");
  });

  it("fails for a value with a broken checksum", async () => {
    const contractId = StrKey.encodeContract(new Uint8Array(32).fill(7));
    const corrupted = `${contractId.slice(0, -1)}A`;
    const outcome = await webAuthContractIdValid.run(
      envWithToml({ WEB_AUTH_CONTRACT_ID: corrupted }),
    );
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("not a valid Stellar contract ID");
  });

  it("fails for a G... key that is not a contract id", async () => {
    const outcome = await webAuthContractIdValid.run(
      envWithToml({
        WEB_AUTH_CONTRACT_ID: "GBBHQ7H4V6RRORKYLHTCAWP6MOHNORRFJSDPXDFYDGJB2LPZUFPXUEW3",
      }),
    );
    expect(outcome.status).toBe("fail");
  });

  it("fails for a non-string value", async () => {
    const outcome = await webAuthContractIdValid.run(envWithToml({ WEB_AUTH_CONTRACT_ID: 42 }));
    expect(outcome.status).toBe("fail");
  });

  it("skips when the field is absent", async () => {
    const outcome = await webAuthContractIdValid.run(envWithToml({}));
    expect(outcome.status).toBe("skip");
    expect(outcome.message).toContain("not declared");
  });
});
