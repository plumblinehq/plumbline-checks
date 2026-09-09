import { StrKey } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { currencyIssuerOrContract } from "../../../src/checks/sep1/currencyIssuerOrContract.js";
import { makeEnv } from "../../helpers.js";

const VALID_ISSUER = "GBBHQ7H4V6RRORKYLHTCAWP6MOHNORRFJSDPXDFYDGJB2LPZUFPXUEW3";
const VALID_CONTRACT = StrKey.encodeContract(new Uint8Array(32).fill(7));

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.currency-issuer-or-contract", () => {
  it("passes when each entry declares exactly one valid identifier", async () => {
    const outcome = await currencyIssuerOrContract.run(
      envWithToml({ CURRENCIES: [{ code: "USD", issuer: VALID_ISSUER }, { code: "TOK", contract: VALID_CONTRACT }] }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Currency Documentation, issuer / contract");
  });

  it("fails when both issuer and contract are declared", async () => {
    const outcome = await currencyIssuerOrContract.run(
      envWithToml({ CURRENCIES: [{ code: "USD", issuer: VALID_ISSUER, contract: VALID_CONTRACT }] }),
    );
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("both issuer and contract");
  });

  it("fails when neither is declared", async () => {
    const outcome = await currencyIssuerOrContract.run(envWithToml({ CURRENCIES: [{ code: "USD" }] }));
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("neither issuer nor contract");
  });

  it("fails for an invalid issuer", async () => {
    const outcome = await currencyIssuerOrContract.run(
      envWithToml({ CURRENCIES: [{ code: "USD", issuer: "GABC" }] }),
    );
    expect(outcome.status).toBe("fail");
  });

  it("fails for an invalid contract", async () => {
    const outcome = await currencyIssuerOrContract.run(
      envWithToml({ CURRENCIES: [{ code: "TOK", contract: "CABC" }] }),
    );
    expect(outcome.status).toBe("fail");
  });

  it("skips when no [[CURRENCIES]] entries are declared", async () => {
    const outcome = await currencyIssuerOrContract.run(envWithToml({}));
    expect(outcome.status).toBe("skip");
  });
});