/**
 * The checks version, the single source of truth for the provenance
 * `plumbline-server` records on every run as `checks_lib_version`. A grade
 * change across runs could mean the anchor broke or that Plumbline changed;
 * without this recorded per run, every historical comparison is
 * untrustworthy. The test suite asserts this matches package.json so it
 * cannot drift.
 */
export const VERSION = "0.2.2";
