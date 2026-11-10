# Changelog

## 0.12.0

Additions only; every 0.11.0 record validates unchanged.

- `standard/line-flow` 0.1.0: how a production line flows. Its stations in order, each a machine or cell with the process timing it runs, how many work in parallel, what each passes on and how many of those go into one unit of the line; the buffer after each station; the machines it shares with another line; what it takes from another line for each unit (for example 40 parts a kit); the rule that releases work into it; and each station's mean time between failures and to repair, on operating or calendar time, after VDI 3423. One record is one layout; an alternative layout is another record. The check refuses stations out of sequence (a gap or a repeat), a buffer of no capacity, a shared machine no station runs, a feed from a line no line flow describes, and a repair time without a time between failures.
- Examples: a cut line and a kitting line fed 40 parts a kit from it.

## 0.11.0

Additions only; every 0.10.1 record validates unchanged.

- `standard/simulation-run-trace` 0.1.0: the event trace of one replication of a simulation run -- per station, each busy, blocked, starved, down and setup interval as a start and an end in seconds (SEC) from the run's start, with the warm-up's end and the horizon. The check refuses an interval that ends before it starts, a station's intervals out of order or overlapping, and an interval after the horizon.
- `standard/placement` 0.1.0: a floor or cell frame, its origin and extent as lengths, and each piece of equipment's position (the common position) and yaw in it. The check refuses a placement naming no equipment and a machine placed twice.
- Examples: a two-station line's trace and its placement.

## 0.10.1

First publication from this repository. The standard's schemas and their versions:

- `standard/cell-performance-requirement` 0.3.0: Cell Performance Requirement
- `standard/common` 0.7.1: Open Plant Floor common definitions
- `standard/comparison` 0.1.0: Comparison
- `standard/equipment-capability` 0.8.0: Equipment capability
- `standard/extensions/air-supply` 0.1.0: Air Supply
- `standard/extensions/cell` 0.2.0: Cell
- `standard/extensions/gas-supply` 0.1.0: Gas Supply
- `standard/extensions/laser-source` 0.1.0: Laser Source
- `standard/extensions/machining-center` 0.1.0: Machining Center
- `standard/extensions/measuring-machine` 0.1.0: Measuring Machine
- `standard/extensions/plate-roll` 0.1.0: Plate Roll
- `standard/extensions/press-brake` 0.1.0: Press Brake
- `standard/extensions/robot` 0.2.0: Robot
- `standard/extensions/saw` 0.1.0: Saw
- `standard/extensions/tube-bender` 0.1.0: Tube Bender
- `standard/extensions/turning-center` 0.1.0: Turning Center
- `standard/extensions/welding` 0.1.0: Welding
- `standard/job-order` 0.3.0: Job order
- `standard/job-response` 0.4.0: Job response
- `standard/kpi-definition` 0.1.0: KPI Definition
- `standard/kpi-value` 0.1.0: KPI Value
- `standard/process-timing` 0.3.1: Process timing
- `standard/simulation-run` 0.1.0: Simulation Run
- `standard/simulation-study` 0.1.0: Simulation Study
- `standard/standard-edition` 0.1.0: Standard Edition
