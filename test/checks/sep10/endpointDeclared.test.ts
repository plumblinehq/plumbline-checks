import { describe, expect, it } from "vitest";
import { endpointDeclared } from "../../../src/checks/sep10/endpointDeclared.js";
import { envWithSep10 } from "./helpers.js";

describe("sep10.endpoint-declared", () => {
  it("passes when WEB_AUTH_ENDPOINT and SIGNING_KEY are declared", async () => {
    const outcome = await endpointDeclared.run(envWithSep10());
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Authentication Endpoint");
  });

  it("fails when SIGNING_KEY is missing", async () => {
    const outcome = await endpointDeclared.run(envWithSep10({}, { SIGNING_KEY: undefined }));
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("SIGNING_KEY");
  });

  it("fails when WEB_AUTH_ENDPOINT is missing", async () => {
    const outcome = await endpointDeclared.run(envWithSep10({}, { WEB_AUTH_ENDPOINT: undefined }));
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("WEB_AUTH_ENDPOINT");
  });

  it("reports at info severity", () => {
    expect(endpointDeclared.severity).toBe("info");
  });

  it("ignores a SIGNING_KEY that is not a string", async () => {
    const outcome = await endpointDeclared.run(envWithSep10({}, { SIGNING_KEY: 42 }));
    expect(outcome.status).toBe("fail");
  });
});