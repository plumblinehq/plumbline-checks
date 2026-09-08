# Contributing

Thanks for considering a contribution to Plumbline.

Plumbline is three repositories in the `plumblinehq` org:

- **plumbline-checks** — the SEP conformance checks, as a library and CLI
- **plumbline-server** — scheduler, Postgres store, HTTP API
- **plumbline-web** — the public directory

This repo is `plumbline-checks`: pure check logic and nothing else. No
database, no scheduler, no server. Its only I/O is outbound HTTP.

## Ground rules

- TypeScript in strict mode. No ORM, DI framework, component library or UI kit.
- A conformance check is never written from memory. The spec clause must exist
  in the SEP text, and the check's `specRef` must point at real text.
- Plumbline is read-only against third-party anchors: only `GET`, `HEAD` and
  `OPTIONS` requests. SEP-10 challenges are fetched and verified, but never
  signed and never submitted to a token endpoint.
- One commit per logical unit, Conventional Commits style. A check plus its
  fixture plus its test is one commit.
- Never commit a red build. CI must be green on the default branch.

## Development

Everything runs through npm; the lockfile is committed.

- `npm install` — install dependencies
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript strict, no emit
- `npm test` — Vitest
- `npm run build` — tsup, emits ESM + CJS + types into `dist/`

- Tests must never touch the network — HTTP is stubbed at the probe boundary
  (inject a fake resolver / fetch implementation). The single documented
  exception is the integration test against `testanchor.stellar.org`, and it is
  opt-in.
- Every check ships with fixtures under `test/fixtures/`: at least one passing
  and one failing case. A check does not merge without both.

## Pull requests

Every PR runs lint, typecheck, tests and build on push. A red build blocks the
merge.

## Reporting bugs

Use the issue templates. If the bug is in a conformance check, include the
`specRef` and quote the spec text it enforces.