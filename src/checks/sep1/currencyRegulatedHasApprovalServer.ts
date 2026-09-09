import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { currencyEntries, isTomlLink } from "./common.js";

/**
 * SEP-8 §SEP-1 stellar.toml: regulated is "a boolean indicating whether or
 * not this is a regulated asset", and approval_server is "the URL of an
 * approval service that signs validated transactions". SEP-8's discovery
 * mechanism is literally "checking for an approval server via SEP-1
 * stellar.toml": a wallet detects that an asset is regulated from the
 * approval server. An asset declared regulated with no approval_server
 * therefore cannot be transacted under SEP-8 at all — the mechanism is
 * inoperative. The catalogue grades this error on that reading; the spec
 * sentence itself is descriptive rather than a literal MUST, so this is
 * where the project leans on the catalogue.
 */
export const currencyRegulatedHasApprovalServer: Check = {
  id: "sep1.currency-regulated-has-approval-server",
  sep: 1,
  title: "a regulated currency declares an approval_server",
  description:
    "If a [[CURRENCIES]] entry declares regulated = true, requires it to also declare approval_server, per SEP-8 §SEP-1 stellar.toml.",
  severity: "error",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const currencies = currencyEntries(env);
    if (currencies.length === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entries are declared; nothing to validate.",
        specRef: "SEP-8 §SEP-1 stellar.toml, regulated / approval_server",
        evidence: [],
      };
    }
    const offenders: string[] = [];
    let checked = 0;
    currencies.forEach((entry, index) => {
      if (isTomlLink(entry)) {
        return;
      }
      if (entry.regulated !== true) {
        return;
      }
      checked += 1;
      const approvalServer = entry.approval_server;
      if (approvalServer === undefined || typeof approvalServer !== "string" || approvalServer.trim() === "") {
        offenders.push(`entry ${index} is regulated but declares no approval_server`);
      }
    });
    if (checked === 0) {
      return {
        status: "skip",
        message: "No [[CURRENCIES]] entry declares regulated = true; nothing to validate.",
        specRef: "SEP-8 §SEP-1 stellar.toml, regulated / approval_server",
        evidence: [],
      };
    }
    if (offenders.length > 0) {
      return {
        status: "fail",
        message: `Regulated assets without an approval server: ${offenders.join("; ")}.`,
        specRef: "SEP-8 §SEP-1 stellar.toml, regulated / approval_server",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `All ${checked} regulated entr${checked === 1 ? "y" : "ies"} declare${checked === 1 ? "s" : ""} an approval_server.`,
      specRef: "SEP-8 §SEP-1 stellar.toml, regulated / approval_server",
      evidence: [],
    };
  },
};

register(currencyRegulatedHasApprovalServer);