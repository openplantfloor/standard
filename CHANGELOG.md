# Changelog

## Unreleased

- **Energy endpoints.** `standard/common` 0.4.0 adds `meter` (meterId, `protocol` -- mtconnect, opc-ua-ecm for OPC 34100, green-button for NAESB ESPI, modbus, manual -- the `dataItem` read, `scope` machine, cell or facility, and an optional `endpoint`) and an optional `interval` on `energy`. `standard/equipment-capability` 0.5.0 lists a machine's `meters`; `standard/job-response` 0.4.0 lets an operation's energy carry its interval. The gate refuses a meter with no protocol and an interval that ends before it starts.
- **`standard/equipment-capability` 0.4.0.** `axes` says what the axes are: `machineAxes` (the machine's own controlled axes) and `externalAxes` (each with its `kind` -- linear-track, gantry, rotary-positioner, tilt-rotate-positioner, turntable, other -- `count`, `travel` as a quantity, and whether it is `coordinated`). A 6-axis arm on a linear track and a 7-joint arm are told apart. 0.3.0's integer `axes` is replaced.
- **Units: UN/CEFACT Recommendation 20 codes.** `standard/common` 0.3.0 adds `uom`, a Recommendation 20 (revision 11e) common code (MMT, KGM, KWH, H87 ...). Parameters, quantities and process-timing output carry `uom` in place of 0.2.0's unit symbol; a categorical parameter carries `values` and no unit; a range needs a unit.
- **Material and energy.** `standard/job-order` 0.3.0: an operation's `materials` (what, lot, quantity, mass). `standard/job-response` 0.3.0: per operation, material `consumed` and `produced` by lot and mass (KGM or TNE), and `energy` (KWH or MWH, metered or estimated). `standard/process-timing` 0.3.0: `output` (what one cycle produces, as a quantity) replaces `unit` and `unitsPerCycle`, and `energyPerCycle` is added.
- **Classification.** Each process carries its DIN 8580:2022-12 main group (`processGroup`; the standard assigns one group to every process but other; measure, kit and pack are not manufacturing processes). `standard/equipment-capability` 0.3.0 adds `automationLevel` (mechanical and, when stated, cognitive, on the seven-step reference scales of Frohm et al. 2008), `isa95Level` (work center or work unit in the IEC 62264-1 equipment hierarchy) and `alignments` (OPC UA companion specifications, MTConnect and other standards a machine maps to, named by identifier).
- **Gate.** Proves every process but other has exactly one group, and that a unit symbol, a range without a unit, a mismatched group and an automation level out of range are refused.

- **`standard/equipment-capability` 0.2.0.** Adds `identification` (whether the model is stated, or the candidate models a description matches, each with a confidence), `physical` (footprint, height, weight, service clearance: what layout needs), `utilities` (electrical, compressed air, gases) and `provenance` (per-figure evidence grade and source).
- **`standard/common` 0.2.0.** A source may carry the URL it is published at.

## 0.1.0 (2026-11-06)

- **New: `standard/equipment-capability` 0.1.0 (draft).** A machine or cell and what it can do: processes, materials and thickness, shapes, work envelope, power, force, axes, automation, and the input and output parameters a job is matched against.
- **New: `standard/process-timing` 0.1.0 (draft).** Cycle time per unit at low, base and high, setup and changeover, the conditions it holds for, with an evidence grade (L0 estimate, L1 published benchmark, L2 quote or listing, L3 contracted or measured).
- **New: `standard/job-order` 0.1.0 and `standard/job-response` 0.1.0 (draft).** Work asked of the plant floor and what it returned.
- **New: `standard/common` 0.1.0.** Shared definitions.
- **Repository.** Gate (`npm run check`), served-site build (`npm run site`), served check, GitHub Pages deploy, governance and contribution files, Apache-2.0 licence.
