import { describe, expect, it } from "vitest";
import { currencyRegulatedHasApprovalServer } from "../../../src/checks/sep1/currencyRegulatedHasApprovalServer.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.currency-regulated-has-approval-server", () => {
  it("passes when a regulated entry declares an approval_server", async () => {
    const outcome = await currencyRegulatedHasApprovalServer.run(
      envWithToml({
        CURRENCIES: [{ regulated: true, approval_server: "https://approvals.example.com" }],
      }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-8 §SEP-1 stellar.toml, regulated / approval_server");
  });

  it("fails when a regulated entry declares no approval_server", async () => {
    const outcome = await currencyRegulatedHasApprovalServer.run(
      envWithToml({ CURRENCIES: [{ regulated: true }] }),
    );
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("no approval_server");
  });

  it("passes when regulated is explicitly false", async () => {
    const outcome = await currencyRegulatedHasApprovalServer.run(
      envWithToml({ CURRENCIES: [{ regulated: false }] }),
    );
    expect(outcome.status).toBe("skip");
  });

  it("skips when no entry is regulated", async () => {
    const outcome = await currencyRegulatedHasApprovalServer.run(
      envWithToml({ CURRENCIES: [{ code: "USD" }] }),
    );
    expect(outcome.status).toBe("skip");
  });
});