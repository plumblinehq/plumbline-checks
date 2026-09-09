#!/usr/bin/env node
import { consoleLogger, type Env, type Network } from "./core.js";
import { run } from "./runner.js";
import { all } from "./registry.js";
import { RateLimitedHttpClient } from "./probe/http.js";
import "./checks/index.js";

interface ParsedArgs {
  command: "run" | "checks";
  subcommand: string;
  homeDomain?: string;
  seps?: number[];
  network: Network;
  json: boolean;
  sepFilter?: number;
}

const USAGE = `plumbline — SEP conformance checks for Stellar anchors

Usage:
  plumbline run --home-domain DOMAIN [--seps 1,10] [--network pubnet|testnet] [--json]
  plumbline checks list [--sep 10]

Exit code is 0 unless an error-severity check failed.`;

function fail(message: string): never {
  console.error(message);
  console.error(USAGE);
  process.exit(2);
}

function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0] ?? "";
  if (command !== "run" && command !== "checks") {
    fail(`unknown command "${command}"`);
  }
  const args: ParsedArgs = { command, subcommand: "", network: "pubnet", json: false };
  let flagStart = 1;
  if (command === "checks") {
    args.subcommand = argv[1] ?? "";
    if (args.subcommand !== "list") {
      fail(`unknown subcommand "${args.subcommand}"`);
    }
    flagStart = 2;
  }
  for (let i = flagStart; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = (): string => {
      const next = argv[i + 1];
      if (next === undefined) {
        fail(`flag ${flag} requires a value`);
      }
      i += 1;
      return next;
    };
    switch (flag) {
      case "--home-domain":
        args.homeDomain = value();
        break;
      case "--seps": {
        const raw = value();
        args.seps = raw
          .split(",")
          .map((part) => Number.parseInt(part.trim(), 10))
          .filter((n) => Number.isInteger(n));
        if (args.seps.length === 0) {
          fail(`--seps expects a comma-separated list of integers, got "${raw}"`);
        }
        break;
      }
      case "--network": {
        const network = value();
        if (network !== "pubnet" && network !== "testnet") {
          fail(`--network must be pubnet or testnet, got "${network}"`);
        }
        args.network = network;
        break;
      }
      case "--sep": {
        const sep = Number.parseInt(value(), 10);
        if (!Number.isInteger(sep)) {
          fail("--sep expects an integer");
        }
        args.sepFilter = sep;
        break;
      }
      case "--json":
        args.json = true;
        break;
      case "--help":
      case "-h":
        console.log(USAGE);
        process.exit(0);
        break;
      default:
        fail(`unknown flag "${flag}"`);
    }
  }
  return args;
}

/** Accept a bare hostname or a URL; either way the toml lives at https://host/. */
function normalizeHomeDomain(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") {
    fail("--home-domain must not be empty");
  }
  if (/^[a-z0-9.-]+$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  try {
    return new URL(trimmed).hostname;
  } catch {
    fail(`--home-domain "${raw}" is neither a hostname nor a URL`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "checks") {
    const checks = args.sepFilter === undefined ? all() : all().filter((c) => c.sep === args.sepFilter);
    for (const check of checks) {
      console.log(`${check.id}\tsep-${check.sep}\t${check.severity}\t${check.title}`);
    }
    return;
  }

  if (args.homeDomain === undefined) {
    fail("run requires --home-domain");
  }
  const env: Env = {
    homeDomain: normalizeHomeDomain(args.homeDomain),
    network: args.network,
    http: new RateLimitedHttpClient(),
    now: () => new Date(),
    logger: consoleLogger,
  };
  const results = await run(env, { seps: args.seps });
  if (args.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const result of results) {
      console.log(
        `${result.status.padEnd(5)}\t${result.severity.padEnd(7)}\t${result.checkId}\t${result.message}`,
      );
    }
  }
  // Exit non-zero only when an error-severity check failed. A Plumbline
  // error or a timed-out run is our failure, not the anchor's, and exits 0.
  const failed = results.some((result) => result.severity === "error" && result.status === "fail");
  process.exit(failed ? 1 : 0);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
});