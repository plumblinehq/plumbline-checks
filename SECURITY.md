# Security

Plumbline is read-only by design: it issues only `GET`, `HEAD` and `OPTIONS`
requests to third-party anchors and never submits signed transactions. That
keeps its attack surface small, but security is still taken seriously.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository:
**Security → Report a vulnerability**. Do not open a public issue for a
security vulnerability.

Reports are acknowledged within 48 hours. Sensitive fix details are coordinated
privately before any public disclosure.

## Scope

- The checks library and CLI (this repo)
- Anything that executes untrusted input, notably TOML resolution and XDR
  decoding of third-party challenge responses

## Notes for contributors

- Evidence recorded by checks is truncated to 2 KB and passed through a
  redactor before it is ever persisted or emitted.
- No secrets in evidence, no secrets in logs.