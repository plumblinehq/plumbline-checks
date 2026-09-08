import { consoleLogger, type Check, type Env, type Logger, type Result } from "./core.js";
import { all } from "./registry.js";

export const DEFAULT_RUN_TIMEOUT_MS = 5 * 60 * 1000;
export const DEFAULT_CHECK_TIMEOUT_MS = 15 * 1000;

export interface RunOptions {
  /** Restrict the run to checks enforcing these SEPs. */
  seps?: number[];
  /** Per-run wall-clock timeout, ms. Default 5 minutes. */
  timeoutMs?: number;
  /** Per-check timeout, ms. Default 15 seconds. */
  checkTimeoutMs?: number;
  logger?: Logger;
}

/**
 * Run the registered checks (optionally for a set of SEPs) against an anchor.
 *
 * Checks run in dependency order: a check's `requires` always run first, even
 * when they belong to a SEP outside the requested set (so SEP-10 checks pull
 * in `sep1.toml-parses`). A dependent whose prerequisite did not `pass` is
 * skipped with a message naming the prerequisite. A check that times out or
 * throws is reported as a Plumbline `error`, never as an anchor failure.
 */
export async function run(env: Env, options: RunOptions = {}): Promise<Result[]> {
  const logger = options.logger ?? env.logger ?? consoleLogger;
  const runTimeoutMs = options.timeoutMs ?? DEFAULT_RUN_TIMEOUT_MS;
  const checkTimeoutMs = options.checkTimeoutMs ?? DEFAULT_CHECK_TIMEOUT_MS;
  const deadline = Date.now() + runTimeoutMs;

  const ordered = selectChecks(options.seps, logger);
  const results: Result[] = [];
  const byId = new Map<string, Result>();

  for (const check of ordered) {
    if (Date.now() > deadline) {
      const result = aborted(check, `run exceeded its ${runTimeoutMs}ms timeout`);
      results.push(result);
      byId.set(check.id, result);
      continue;
    }
    const failedPrerequisite = check.requires.find((requiredId) => {
      const previous = byId.get(requiredId);
      return previous === undefined || previous.status !== "pass";
    });
    if (failedPrerequisite !== undefined) {
      const result = skipped(check, `prerequisite "${failedPrerequisite}" did not pass`);
      results.push(result);
      byId.set(check.id, result);
      continue;
    }
    const result = await runCheck(check, env, checkTimeoutMs, logger);
    results.push(result);
    byId.set(check.id, result);
  }
  return results;
}

async function runCheck(check: Check, env: Env, timeoutMs: number, logger: Logger): Promise<Result> {
  const startedAt = Date.now();
  const base = {
    checkId: check.id,
    sep: check.sep,
    title: check.title,
    severity: check.severity,
  };
  try {
    const outcome = await withTimeout(
      check.run(env),
      timeoutMs,
      `${check.id} exceeded its ${timeoutMs}ms timeout`,
    );
    return { ...base, ...outcome, durationMs: Date.now() - startedAt };
  } catch (error) {
    logger.error(`check ${check.id} failed to run:`, error);
    return {
      ...base,
      status: "error",
      message: `Plumbline failed to run this check: ${error instanceof Error ? error.message : String(error)}`,
      specRef: "",
      evidence: [],
      durationMs: Date.now() - startedAt,
    };
  }
}

/**
 * Select the checks for a run, closing over prerequisites so required checks
 * are included even outside the requested SEPs, then order them topologically
 * (prerequisites first) with a deterministic tiebreak by id.
 */
function selectChecks(seps: number[] | undefined, logger: Logger): Check[] {
  const available = new Map(all().map((check) => [check.id, check]));
  const wanted =
    seps !== undefined && seps.length > 0
      ? all().filter((check) => seps.includes(check.sep))
      : all();

  const selected = new Map<string, Check>();
  const collect = (check: Check): void => {
    if (selected.has(check.id)) {
      return;
    }
    selected.set(check.id, check);
    for (const requiredId of check.requires) {
      const required = available.get(requiredId);
      if (required === undefined) {
        logger.warn(`check ${check.id} requires unknown check "${requiredId}"`);
        continue;
      }
      collect(required);
    }
  };
  for (const check of wanted) {
    collect(check);
  }

  const ordered: Check[] = [];
  const state = new Map<string, "visiting" | "done">();
  const visit = (check: Check): void => {
    const current = state.get(check.id);
    if (current === "done") {
      return;
    }
    if (current === "visiting") {
      throw new Error(`cycle in check requirements involving "${check.id}"`);
    }
    state.set(check.id, "visiting");
    for (const requiredId of check.requires) {
      const required = selected.get(requiredId);
      if (required !== undefined) {
        visit(required);
      }
    }
    state.set(check.id, "done");
    ordered.push(check);
  };
  for (const check of [...selected.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    visit(check);
  }
  return ordered;
}

function skipped(check: Check, reason: string): Result {
  return {
    checkId: check.id,
    sep: check.sep,
    title: check.title,
    severity: check.severity,
    status: "skip",
    message: `Skipped: ${reason}`,
    specRef: "",
    evidence: [],
    durationMs: 0,
  };
}

function aborted(check: Check, reason: string): Result {
  return {
    checkId: check.id,
    sep: check.sep,
    title: check.title,
    severity: check.severity,
    status: "error",
    message: `Aborted: ${reason}`,
    specRef: "",
    evidence: [],
    durationMs: 0,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}