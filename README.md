# plumbline-checks

SEP conformance checks for Stellar anchors, as a TypeScript library and CLI.
Plumbline continuously checks whether public Stellar anchors conform to the
Stellar Ecosystem Proposals they claim to implement — read-only, against the
unauthenticated surface only.

## Relationship to SDF anchor-tests

The Stellar Development Foundation maintains
[`@stellar/anchor-tests`](https://github.com/stellar/stellar-anchor-tests) and
hosts it at anchor-validator.stellar.org. SEP-1 itself points at it under
"Testing → Tools".

**Plumbline is not a replacement for it and is never presented as one.**

| | SDF anchor-tests | Plumbline |
|---|---|---|
| Who runs it | The anchor operator, on their own anchor | Plumbline, across the whole ecosystem |
| When | On demand, at integration time | On a schedule, continuously |
| Scope | Full flows including authenticated deposit/withdrawal | Read-only, unauthenticated surface only |
| Output | Pass/fail for one run | Time series, regression detection, public directory |

## Hard boundaries

These are guard conditions, not preferences:

1. **Read-only.** Plumbline issues only `GET`, `HEAD` and `OPTIONS` requests to
   third-party anchors. It never `POST`s.
2. **SEP-10 challenges are fetched and verified, never signed and never
   submitted.** Verification is pure client-side work over the returned XDR.
3. **No deposit or withdrawal flows against third-party anchors. Ever.**
4. **No funded accounts.** SEP-10 checks generate an ephemeral keypair only to
   supply the `account` query parameter; nothing is ever signed with it.
5. **Politeness by default.** One request in flight per host, minimum 2s between
   requests to the same host, jittered scheduling, a `User-Agent` carrying a
   contact URL, and a documented opt-out (in `plumbline-server`). Any anchor
   that asks to be removed is removed.
6. **No secrets in evidence.** Response bodies stored as evidence are truncated
   to 2 KB and passed through a redactor before persistence.

Anything requiring authentication is out of scope by design and reports as
`skip`, never as a failure.

## Package layout

- `src/core.ts` — the vocabulary: `Status`, `Severity`, `Evidence`, `Result`,
  `Env`, and the `Check` interface.
- `src/probe/` — the machinery checks run on: a rate-limited HTTP client, a
  per-run artifact cache, an evidence recorder (truncation + redaction).
- `src/checks/` — the conformance checks, one file per check, one commit per
  check. Each file registers itself; `src/checks/index.ts` imports them all.
- `src/registry.ts` and `src/runner.ts` — check registration and the
  dependency-ordered runner with per-check and per-run timeouts.

### Shipped checks

**SEP-1** (Stellar Info File, v2.7.0) — the full catalogue of 30 checks:

- **File fetch level** (one cached request per run): `sep1.toml-reachable`,
  `sep1.toml-cors`, `sep1.toml-content-type`, `sep1.toml-size`,
  `sep1.toml-parses`.
- **General information**: `sep1.version-present`,
  `sep1.network-passphrase-valid`, `sep1.endpoints-https`,
  `sep1.signing-key-valid`, `sep1.accounts-valid`,
  `sep1.web-auth-contract-id-valid`.
- **Organization documentation**: `sep1.documentation-present`,
  `sep1.org-url-https`, `sep1.org-url-same-domain`,
  `sep1.org-official-email-domain`, `sep1.org-phone-e164`,
  `sep1.org-logo-reachable`.
- **Currencies**: `sep1.currencies-present`, `sep1.currency-code-length`,
  `sep1.currency-issuer-or-contract`, `sep1.currency-status-valid`,
  `sep1.currency-display-decimals-range`, `sep1.currency-name-length`,
  `sep1.currency-issuance-policy-exclusive`,
  `sep1.currency-anchor-asset-type-valid`,
  `sep1.currency-regulated-has-approval-server`,
  `sep1.currency-toml-link-resolves`, `sep1.currency-image-reachable`.
- **Validators**: `sep1.validator-alias-format`,
  `sep1.validator-fields-present`.

`sep1.toml-reachable` fetches the file once per run; `sep1.toml-cors`,
`sep1.toml-content-type` and `sep1.toml-size` inspect that same cached
response, and `sep1.toml-parses` parses it and publishes the parsed file as
`env.toml` for every later check. A check that depends on the parse skips —
naming the failed prerequisite — when the file is unreachable or unparseable.

### CLI

```
plumbline run --home-domain testanchor.stellar.org --seps 1 --json
plumbline checks list [--sep 1]
```

The exit code is 0 unless an `error`-severity check failed.

## Development

- `npm install` — install dependencies
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript strict, no emit
- `npm test` — Vitest
- `npm run build` — tsup, emits ESM + CJS + types into `dist/`

CI runs `lint`, `typecheck`, `test` and `build` on every push and pull request,
on Node 24 (active LTS) and 26. Tests never touch the network: HTTP is stubbed
at the probe boundary.

## License

Apache-2.0