import { describe, expect, it, vi } from "vitest";
import { Networks, type StellarToml } from "@stellar/stellar-sdk";
import {
  DEFAULT_TOML_TIMEOUT_MS,
  resolveToml,
  TomlResolutionError,
  type TomlResolver,
} from "../../src/probe/toml.js";

const toml: StellarToml.Api.StellarToml = {
  NETWORK_PASSPHRASE: Networks.TESTNET,
  SIGNING_KEY: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
};

describe("resolveToml", () => {
  it("resolves a toml via the injected resolver", async () => {
    const resolver = vi.fn<TomlResolver>(async () => toml);
    const resolution = await resolveToml("example.com", { resolver });

    expect(resolution.toml).toBe(toml);
    expect(resolution.url).toBe("https://example.com/.well-known/stellar.toml");
    expect(resolution.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("passes safe defaults to the resolver", async () => {
    const resolver = vi.fn<TomlResolver>(async () => toml);
    await resolveToml("example.com", { resolver });
    expect(resolver).toHaveBeenCalledWith("example.com", {
      allowHttp: false,
      timeout: DEFAULT_TOML_TIMEOUT_MS,
    });
  });

  it("passes through allowHttp and a custom timeout", async () => {
    const resolver = vi.fn<TomlResolver>(async () => toml);
    await resolveToml("example.com", { resolver, allowHttp: true, timeoutMs: 500 });
    expect(resolver).toHaveBeenCalledWith("example.com", { allowHttp: true, timeout: 500 });
  });

  it("classifies an oversized file as too-large", async () => {
    const resolver = vi.fn<TomlResolver>(async () => {
      throw new Error("stellar.toml file exceeds allowed size of 102400");
    });
    const error = await expectError(resolveToml("example.com", { resolver }));
    expect(error.reason).toBe("too-large");
    expect(error.domain).toBe("example.com");
  });

  it("classifies invalid TOML as invalid-toml", async () => {
    const resolver = vi.fn<TomlResolver>(async () => {
      throw new Error("stellar.toml is invalid - Parsing error on line 3, column 4: boom");
    });
    const error = await expectError(resolveToml("example.com", { resolver }));
    expect(error.reason).toBe("invalid-toml");
  });

  it("classifies timeouts as timeout", async () => {
    const resolver = vi.fn<TomlResolver>(async () => {
      throw new Error("timeout of 15000ms exceeded");
    });
    const error = await expectError(resolveToml("example.com", { resolver }));
    expect(error.reason).toBe("timeout");
  });

  it("classifies HTTP failures as unreachable and keeps the status code", async () => {
    const resolver = vi.fn<TomlResolver>(async () => {
      throw Object.assign(new Error("Request failed with status code 404"), {
        response: { status: 404 },
      });
    });
    const error = await expectError(resolveToml("example.com", { resolver }));
    expect(error.reason).toBe("unreachable");
    expect(error.statusCode).toBe(404);
  });

  it("keeps a network failure classified without a status code", async () => {
    const resolver = vi.fn<TomlResolver>(async () => {
      throw new Error("fetch failed: getaddrinfo ENOTFOUND example.com");
    });
    const error = await expectError(resolveToml("example.com", { resolver }));
    expect(error.reason).toBe("unreachable");
    expect(error.statusCode).toBeUndefined();
  });
});

async function expectError(promise: Promise<unknown>): Promise<TomlResolutionError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof TomlResolutionError) {
      return error;
    }
    throw error;
  }
  throw new Error("expected resolveToml to reject");
}