import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { currencyEntries, isTomlLink } from "./common.js";

/** The values SEP-1 enumerates for anchor_asset_type. */
const VALID_TYPES: ReadonlySet<string> = new Set([
  "fiat",
  "crypto",
  "nft",
  "stock",
  "bond",
  "commodity",
  "realestate",
  "other",
]);

/**
 * SEP-1 §Currency Documentation, anchor_asset_type: "Can be fiat, crypto,
 * nft, stock, bond, commodity, realestate, or other." The spec enumerates
 * the allowed values, so a declared type outside the set fails. Absent is a
 * skip: the field is optional.
 */
export const currencyAnchorAssetTypeValid: Check = {
  id: "sep1.currency-anchor-asset-type-valid",
  sep: 1,
  title: "anchor_asset_type is one of the SEP-1 enumerated values",
  description:
    "If a [[CURRENCIES]] entry declares anchor_asset_type, requires it to be one of the eight values SEP-1 enumerates.",
  severity: "error",
  specRef: "SEP-1 §Currency Documentation, anchor_asset_type",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const currencies = currencyEntries(env);
    if (currencies.length === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entries are declared; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, anchor_asset_type",
        evidence: [],
      };
    }
    const offenders: string[] = [];
    let checked = 0;
    currencies.forEach((entry, index) => {
      if (isTomlLink(entry)) {
        return;
      }
      const assetType = entry.anchor_asset_type;
      if (assetType === undefined) {
        return;
      }
      checked += 1;
      if (typeof assetType !== "string" || !VALID_TYPES.has(assetType)) {
        offenders.push(
          `entry ${index} anchor_asset_type "${String(assetType)}" is not one of fiat, crypto, nft, stock, bond, commodity, realestate, other`,
        );
      }
    });
    if (checked === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entry declares anchor_asset_type; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, anchor_asset_type",
        evidence: [],
      };
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Invalid anchor_asset_type values: ${offenders.join("; ")}.`,
        specRef: "SEP-1 §Currency Documentation, anchor_asset_type",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `All ${checked} declared anchor_asset_type values are within the SEP-1 set.`,
      specRef: "SEP-1 §Currency Documentation, anchor_asset_type",
      evidence: [],
    };
  },
};

register(currencyAnchorAssetTypeValid);