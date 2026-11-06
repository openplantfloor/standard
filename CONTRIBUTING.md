# Contributing

Thank you for working on the standard. The rules below keep every change checkable.

## Before you start

- Open an issue describing the change. Reference the record it touches.
- Read `GOVERNANCE.md` for scope, roles and how a change lands.

## Working on a change

```sh
npm ci
npm run check   # the gate CI runs
npm run site    # stages _site/ as the served site would be
```

- Schemas are JSON Schema draft-07, in canonical form: two-space indentation, UTF-8, a trailing newline, keys as authored. `npm run check` tells you when a file is not canonical.
- A schema's `$id` is its served URL: `https://schemas.openplantfloor.org/<path>`.
- A `$ref` never leaves `https://schemas.openplantfloor.org/`. Other standards are named by their identifiers, not referenced by `$ref`.
- Every example is listed in `examples/manifest.json` against the schema it validates with.
- Public text says what a definition is. It names no steward-internal system, path, ticket or work order.

## Versions

- Change a schema's content: bump its `version`. A published version never changes.

## Commits and pull requests

- Sign off every commit (`git commit -s`) to certify the Developer Certificate of Origin (https://developercertificate.org/).
- One pull request per change. The default branch takes squash merges only.
- CI must be green before merge.

## Reporting a security problem

See `SECURITY.md`.
