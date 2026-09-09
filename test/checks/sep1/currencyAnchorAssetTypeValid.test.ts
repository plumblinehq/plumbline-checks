import { describe, expect, it } from "vitest";
import { currencyAnchorAssetTypeValid } from "../../../src/checks/sep1/currencyAnchorAssetTypeValid.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.currency-anchor-asset-type-valid", () => {
  it("passes for each of the eight enumerated types", async () => {
    for (const anchorAssetType of ["fiat", "crypto", "nft", "stock", "bond", "commodity", "realestate", "other"]) {
      const outcome = await currencyAnchorAssetTypeValid.run(
        envWithToml({ CURRENCIES: [{ anchor_asset_type: anchorAssetType }] }),
      );
      expect(outcome.status).toBe("pass");
    }
  });

  it("fails for a type outside the enumerated set", async () => {
    const outcome = await currencyAnchorAssetTypeValid.run(
      envWithToml({ CURRENCIES: [{ anchor_asset_type: "commodities" }] }),
    );
    expect(outcome.status).toBe("fail");
  });

  it("skips when no entry declares anchor_asset_type", async () => {
    const outcome = await currencyAnchorAssetTypeValid.run(envWithToml({ CURRENCIES: [{ code: "USD" }] }));
    expect(outcome.status).toBe("skip");
  });
});