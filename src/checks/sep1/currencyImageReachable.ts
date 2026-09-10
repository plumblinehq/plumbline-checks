import type { Check, CheckOutcome, Env, Evidence } from "../../core.js";
import { recordEvidence } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { currencyEntries, isTomlLink } from "./common.js";

/**
 * SEP-1 §Currency Documentation, image: "URL to a PNG image on a transparent
 * background representing token." The spec states the field as a URL without
 * MUST/SHOULD language, so an image that does not resolve is a warning.
 * Absent is a skip. Only reachability is asserted — the catalogue does not
 * require the content-type check here that sep1.org-logo-reachable makes.
 */
export const currencyImageReachable: Check = {
  id: "sep1.currency-image-reachable",
  sep: 1,
  title: "currency image resolves",
  description:
    "For every inline [[CURRENCIES]] entry that declares image, fetches it and requires a 2xx response.",
  severity: "warning",
  specRef: "SEP-1 §Currency Documentation, image",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const currencies = currencyEntries(env);
    if (currencies.length === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entries are declared; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, image",
        evidence: [],
      };
    }
    const offenders: string[] = [];
    const evidence: Evidence[] = [];
    let checked = 0;
    for (const [index, entry] of currencies.entries()) {
      if (isTomlLink(entry)) {
        continue;
      }
      const image = entry.image;
      if (image === undefined) {
        continue;
      }
      checked += 1;
      if (typeof image !== "string") {
        offenders.push(`entry ${index} image is not a string`);
        continue;
      }
      let url: URL;
      try {
        url = new URL(image);
      } catch {
        offenders.push(`entry ${index} image "${image}" is not a valid URL`);
        continue;
      }
      const response = await env.http.get(url.toString());
      evidence.push(recordEvidence("GET", response));
      if (response.status < 200 || response.status >= 300) {
        offenders.push(`entry ${index} image ${url.toString()} did not resolve (HTTP ${response.status})`);
      }
    }
    if (checked === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entry declares an image; nothing to validate.",
        specRef: "SEP-1 §Currency Documentation, image",
        evidence: [],
      };
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Unreachable currency images: ${offenders.join("; ")}.`,
        specRef: "SEP-1 §Currency Documentation, image",
        evidence,
      };
    }
    return {
      status: "pass",
      message: `All ${checked} declared currency images resolve.`,
      specRef: "SEP-1 §Currency Documentation, image",
      evidence,
    };
  },
};

register(currencyImageReachable);