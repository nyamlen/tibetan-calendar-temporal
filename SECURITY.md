# Security policy

## Reporting a vulnerability

Report a vulnerability privately, through GitHub's [private vulnerability reporting](https://github.com/nyamlen/tibetan-calendar-temporal/security/advisories/new).
Do not open a public issue for it.

The report reaches the maintainer alone.
If it is confirmed, the fix and an advisory are published together.

## Supported versions

Fixes go to the latest release only, as a new release on the latest major version.

| Version | Receives fixes |
| --- | --- |
| Latest 1.x release | Yes |
| Earlier 1.x releases | No: upgrade to the latest |
| 0.0.1 | No: a placeholder that exports nothing |

## What counts

The package is pure computation: it makes no network requests, reads no files and evaluates no code.
A vulnerability is therefore one of these:

- an input to an export that makes it hang, or consume memory or time out of proportion to the request;
- an input that changes what later calls return, for example by mutating a shipped configuration or a cache;
- a problem in how the package is built or published, such as a release whose provenance does not match this repository.

A wrong date, a wrong name or an uncoded error is a bug, not a vulnerability: report it as an [issue](https://github.com/nyamlen/tibetan-calendar-temporal/issues).
