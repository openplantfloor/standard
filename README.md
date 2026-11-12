# Open Plant Floor standard

An open standard for the plant floor: what a machine can do, how long its work takes, and the jobs a shop is asked for and returns. This repository is the standard's definition, as JSON Schema (draft-07).

- **Served:** every schema at its `$id` under `https://schemas.openplantfloor.org/`, and [`index.json`](https://schemas.openplantfloor.org/index.json) listing them.
- **Licence:** Apache License 2.0 (`LICENSE`, `NOTICE`).
- **Governance:** `GOVERNANCE.md`. Contributions: `CONTRIBUTING.md`.
- **Status:** draft. No version 1.0.0 schema has been released yet.

## What is here

| Path | What it is |
|---|---|
| `standard/equipment-capability.schema.json` | A machine or cell and what it can do: processes, materials, size envelope, force or power, and the parameters a job is matched against. A shared definition carries a version; a machine or built unit names the definition or configuration it is an instance of. |
| `standard/configuration.schema.json` | A versioned configuration of a shop or a built unit: a base's interfaces (power, water, drainage, air and filtration, gas, extraction, data, controls, fire suppression, structure, lifting), mass, envelope and lift points; a refit's fitted equipment by shared definition, its layout and line flows. |
| `standard/process-timing.schema.json` | How long an operation takes on a machine: cycle time at a low, base and high case, setup and changeover, each with its evidence grade. |
| `standard/cell-performance-requirement.schema.json` | What a robot cell must achieve before it is chosen: part mix, takt and cycle, payload with tooling, reach as poses, ISO 9283 characteristics, availability and OEE, reliability, changeover, safeguarding, interfaces, and acceptance stages with their criteria. |
| `standard/simulation-study.schema.json` | A simulation study: its purpose, scope, model (format, file, owner, licence) and the verification and validation of each phase result. |
| `standard/simulation-run.schema.json` | One run of a study: scenario, engine, inputs, warm-up, run length, replications and random streams, and its results as KPI values with confidence intervals and per-station shares. |
| `standard/line-flow.schema.json` | How a line flows: its stations in order with the timing each runs and how many of each go into one unit, the buffer after each, shared machines, what it takes from another line per unit, its release rule, and each station's breakdown and repair after VDI 3423. One record is one layout; lines of one kind may follow a pattern line flow. |
| `standard/simulation-run-trace.schema.json` | One replication of a run as it happened: per station, each busy, blocked, starved, down and setup interval in seconds from the run's start -- what a layout view or animation replays. |
| `standard/placement.schema.json` | Where equipment stands: a floor or cell frame and each machine's position and yaw in it, as lengths and angles. One placement is one layout. |
| `standard/kpi-definition.schema.json` and `standard/kpi-value.schema.json` | A key performance indicator after ISO 22400-2 (formula, elements, unit, range, trend, scope level), and one measured, simulated or estimated value of it. |
| `standard/comparison.schema.json` | A simulated figure against a measured one for one metric under stated conditions: error, ratio, the rule it is held to and its verdict. |
| `standard/job-order.schema.json` | Work asked of the plant floor: operations in order, quantity, the work's parameters, when it is due. |
| `standard/job-response.schema.json` | What the plant floor returned: per operation, the equipment, the quantity made and scrapped, the time taken. |
| `standard/common.schema.json` | The definitions the others share: identifiers, processes, parameters, quantities, evidence grades, sources. |
| `standard/extensions/` | One schema per equipment class -- robot, cell, laser-source, press-brake, tube-bender, plate-roll, machining-center, turning-center, saw, measuring-machine, welding, air-supply, gas-supply -- each naming the processes it applies to. |
| `standard/standard-edition.schema.json` | A published standard the fields align to: its edition, status, access, and the fields that use it. |
| `editions/` | One edition record per published standard the fields align to, served at `https://schemas.openplantfloor.org/editions/`. |
| `examples/` | An example of each record, listed in `examples/manifest.json` against the schema it validates with. |
| `scripts/` | The gate (`npm run check`), the served-site build (`npm run site`) and the served check (`npm run served`). |

## How the records fit

A shop describes its machines as equipment capability. Work arrives as a job order, whose operations carry the parameters of the work; an operation goes to a machine whose capability accepts those parameters. Process timing says how long the operation takes there, at a stated evidence grade. The job response records what was made, the material each operation consumed and produced by lot and mass, the energy it used and how long it took; that measured time raises the timing's grade from an estimate to a measurement. Every unit is a UN/CEFACT Recommendation 20 code. Every process carries its DIN 8580 main group, and every machine its automation level, from a manual bench to a robot cell, and its place in the ISA-95 equipment hierarchy.

## Baseline and extensions

Equipment capability is the baseline every machine shares: its identity, processes, size, utilities, meters, classifications, accuracy and the standards it maps to. What a class of machine states beyond that -- a robot's payload, reach and joints, a press brake's back gauge and crowning, a compressor's free air delivery -- is an extension, a schema of its own under `standard/extensions/`, named in the record's `extensions`. A new class of equipment is a new extension, so the baseline stays stable as the standard grows, the way an OPC UA companion specification builds on a base type and an Asset Administration Shell carries submodels. Every new figure is a quantity, measure or rate with a UN/CEFACT Recommendation 20 code; no unit is added to a property name.

## Standards the fields align to

Each published standard a field follows -- ISO 9946 and ISO 9283 for robots, ISO 230-2 for machine tool positioning, ISO 10360 for coordinate measuring systems, IEC 60825-1 for laser classes, ISO 6909 for press brakes, ISO 4063 and IEC 60974-1 for welding, ISO 1217 and ISO 8573-1 for compressed air, the OPC UA companion specifications, MTConnect, ECLASS, ETIM, the IEC Common Data Dictionary and the IDTA submodel templates -- has an edition record under [`editions/`](https://schemas.openplantfloor.org/index.json): its publisher, edition and date, status, how it can be read and under what licence, the fields that use it, and when and where that was checked. A field's `standardRef` or `alignment` names the record by its URL. The standard names these by identifier and edition; it does not reproduce them.

## What is not here

A scheduler, a simulator or a manufacturing execution system (the standard records a simulation's study, runs and results, not the simulator). Any one party's way of planning, pricing or deciding. The standard names the published standards it relates to (UN/CEFACT Recommendation 20, DIN 8580, ISA-95, MTConnect, OPC UA) by their identifiers; it does not reference or republish them.

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
