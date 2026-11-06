# Open Plant Floor standard

An open standard for the plant floor: what a machine can do, how long its work takes, and the jobs a shop is asked for and returns. This repository is the standard's definition, as JSON Schema (draft-07).

- **Served:** every schema at its `$id` under `https://schemas.openplantfloor.org/`, and [`index.json`](https://schemas.openplantfloor.org/index.json) listing them.
- **Licence:** Apache License 2.0 (`LICENSE`, `NOTICE`).
- **Governance:** `GOVERNANCE.md`. Contributions: `CONTRIBUTING.md`.
- **Status:** draft. No version 1.0.0 schema has been released yet.

## What is here

| Path | What it is |
|---|---|
| `standard/equipment-capability.schema.json` | A machine or cell and what it can do: processes, materials, size envelope, force or power, and the parameters a job is matched against. |
| `standard/process-timing.schema.json` | How long an operation takes on a machine: cycle time at a low, base and high case, setup and changeover, each with its evidence grade. |
| `standard/job-order.schema.json` | Work asked of the plant floor: operations in order, quantity, the work's parameters, when it is due. |
| `standard/job-response.schema.json` | What the plant floor returned: per operation, the equipment, the quantity made and scrapped, the time taken. |
| `standard/common.schema.json` | The definitions the others share: identifiers, processes, parameters, quantities, evidence grades, sources. |
| `examples/` | An example of each record, listed in `examples/manifest.json` against the schema it validates with. |
| `scripts/` | The gate (`npm run check`), the served-site build (`npm run site`) and the served check (`npm run served`). |

## How the records fit

A shop describes its machines as equipment capability. Work arrives as a job order, whose operations carry the parameters of the work; an operation goes to a machine whose capability accepts those parameters. Process timing says how long the operation takes there, at a stated evidence grade. The job response records what was made and how long it took, and that measured time raises the timing's grade from an estimate to a measurement.

## What is not here

A scheduler, a simulator or a manufacturing execution system. Any one party's way of planning, pricing or deciding. The standard names the published standards it relates to (ISA-95, MTConnect, OPC UA) by their identifiers; it does not reference or republish them.

## Using the standard

- **Latest:** fetch a schema from its `$id`.
- **Pinned:** fetch `https://schemas.openplantfloor.org/v/{version}/{path}` for one exact version; those bytes never change.
- **Vendored:** copy this repository at a commit or a release tag.

## Working on it

```sh
npm ci
npm run check
npm run site
```

The gate holds: canonical form, `$id` equals the served URL, closure under `https://schemas.openplantfloor.org/`, every schema compiles, every example validates, public text clean, published versions immutable.
