import { describe, expect, it } from "vitest";
import { challengeDecodes } from "../../../src/checks/sep10/challengeDecodes.js";
import { buildChallenge } from "../../fixtures/sep10/challenge.js";
import { CLIENT_ACCOUNT, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-decodes", () => {
  it("passes for a decodable envelope and stores the transaction", async () => {
    const envelope = buildChallenge({ clientAccount: CLIENT_ACCOUNT });
    const env = envWithSep10({ json: { transaction: envelope } });
    const outcome = await challengeDecodes.run(env);
    expect(outcome.status).toBe("pass");
    expect(env.sep10?.transaction?.sequence).toBe("0");
  });

  it("fails for a body that is not base64 XDR", async () => {
    const env = envWithSep10({ json: { transaction: "not-xdr!!!" } });
    const outcome = await challengeDecodes.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("not decodable");
  });

  it("fails for a body that is not a string", async () => {
    const env = envWithSep10({ json: { transaction: 42 } });
    const outcome = await challengeDecodes.run(env);
    expect(outcome.status).toBe("skip");
  });
});