import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { currencyEntries } from "./common.js";

/**
 * SEP-1 §Specification: "You should complete as much of this as you can",
 * and wallets and exchanges decide which tokens to support from the
 * completeness of the file. [[CURRENCIES]] is not required — issuers with no
 * tokens have nothing to declare — but an anchor that exists to issue tokens
 * and declares none is giving wallets nothing to list, so an absent or empty
 * list is a warning, never an error.
 */
export const currenciesPresent: Check = {
  id: "sep1.currencies-present",
  sep: 1,
  title: "at least one [[CURRENCIES]] entry is declared",
  description:
    "Requires the [[CURRENCIES]] list to contain at least one entry, per the completeness guidance of SEP-1 §Specification.",
  severity: "warning",
  specRef: "SEP-1 §Specification, Currency Documentation",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const currencies = currencyEntries(env);
    if (currencies.length === 0) {
      return {
        status: "fail",
        message:
          "No [[CURRENCIES]] entries are declared; wallets and exchanges decide which tokens to support based on the completeness of the file.",
        specRef: "SEP-1 §Specification, Currency Documentation",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `${currencies.length} [[CURRENCIES]] entr${currencies.length === 1 ? "y is" : "ies are"} declared.`,
      specRef: "SEP-1 §Specification, Currency Documentation",
      evidence: [],
    };
  },
};

register(currenciesPresent);