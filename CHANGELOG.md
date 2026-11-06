# Changelog

## Unreleased

- **`standard/equipment-capability` 0.2.0.** Adds `identification` (whether the model is stated, or the candidate models a description matches, each with a confidence), `physical` (footprint, height, weight, service clearance: what layout needs), `utilities` (electrical, compressed air, gases) and `provenance` (per-figure evidence grade and source).
- **`standard/common` 0.2.0.** A source may carry the URL it is published at.

## 0.1.0 (2026-11-06)

- **New: `standard/equipment-capability` 0.1.0 (draft).** A machine or cell and what it can do: processes, materials and thickness, shapes, work envelope, power, force, axes, automation, and the input and output parameters a job is matched against.
- **New: `standard/process-timing` 0.1.0 (draft).** Cycle time per unit at low, base and high, setup and changeover, the conditions it holds for, with an evidence grade (L0 estimate, L1 published benchmark, L2 quote or listing, L3 contracted or measured).
- **New: `standard/job-order` 0.1.0 and `standard/job-response` 0.1.0 (draft).** Work asked of the plant floor and what it returned.
- **New: `standard/common` 0.1.0.** Shared definitions.
- **Repository.** Gate (`npm run check`), served-site build (`npm run site`), served check, GitHub Pages deploy, governance and contribution files, Apache-2.0 licence.
