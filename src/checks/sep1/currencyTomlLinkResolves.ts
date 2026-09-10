import { parse } from "smol-toml";
import type { Check, CheckOutcome, Env, Evidence } from "../../core.js";
import { recordEvidence } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { currencyEntries } from "./common.js";

/**
 * SEP-1 §Currency Documentation: "Alternately, stellar.toml can link out to
 * a separate TOML file for each currency by specifying
 * toml=\"https://DOMAIN/.well-known/CURRENCY.toml\" as the currency's only
 * field." A currency that links out declares itself to be defined
 * elsewhere, so the linked file must actually exist and parse as TOML — a
 * dangling link makes the entry useless and fails. Entries without a toml
 * link are skipped; the per-field checks cover them. Fetches are plain GETs
 * through the rate-limited client, cached per run.
 */
export const currencyTomlLinkResolves: Check = {
  id: "sep1.currency-toml-link-resolves",
  sep: 1,
  title: "every toml= currency link resolves and parses",
  description:
    "For every [[CURRENCIES]] entry that links out via toml=, fetches the linked file and requires it to parse as TOML.",
  severity: "error",
  specRef: "SEP-1 §Currency Documentation, toml link",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const currencies = currencyEntries(env);
    const offenders: string[] = [];
    const evidence: Evidence[] = [];
    let linked = 0;
    for (const [index, entry] of currencies.entries()) {
      const link = entry.toml;
      if (link === undefined) {
        continue;
      }
      linked += 1;
      if (typeof link !== "string") {
        offenders.push(`entry ${index} toml link is not a string`);
        continue;
      }
      let url: URL;
      try {
        url = new URL(link);
      } catch {
        offenders.push(`entry ${index} toml link "${link}" is not a valid URL`);
        continue;
      }
      const response = await env.http.get(url.toString());
      evidence.push(recordEvidence("GET", response));
      if (response.status < 200 || response.status >= 300) {
        offenders.push(`entry ${index} toml link ${link} did not resolve (HTTP ${response.status})`);
        continue;
      }
      try {
        parse(response.body);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        offenders.push(`entry ${index} toml link ${link} is not valid TOML: ${detail}`);
      }
    }
    if (linked === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entry links out via toml=; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, toml link",
        evidence: [],
      };
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Broken currency TOML links: ${offenders.join("; ")}.`,
        specRef: "SEP-1 §Currency Documentation, toml link",
        evidence,
      };
    }
    return {
      status: "pass",
      message: `All ${linked} toml= links resolve and parse as TOML.`,
      specRef: "SEP-1 §Currency Documentation, toml link",
      evidence,
    };
  },
};

register(currencyTomlLinkResolves);