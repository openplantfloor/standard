# Governance

Open Plant Floor is an open standard for the plant floor. This file says who stewards it, how it changes, and how stewardship moves.

## Steward of record

LuhTech Holdings LLC stewards the standard today. The steward holds the `openplantfloor` GitHub organisation, the `openplantfloor.org` domain and this repository, and reviews every change (see `.github/CODEOWNERS`).

Stewardship is designed to be handed on. The standard carries nothing that belongs to the steward: no credential, no private dependency, no reference to the steward's other systems. A transfer is a transfer of the organisation and the domain; the repository, its history, its served paths and its licence do not change.

## Roles

- **Steward.** Owns the organisation, approves releases, holds the domain.
- **Maintainers.** Review and merge changes. The `maintainers` team of the `openplantfloor` organisation, named in `.github/CODEOWNERS`; the steward sets its membership.
- **Working group.** Anyone who proposes a change by issue or pull request.

## What is in scope

The records of the plant floor: what equipment can do, how long its work takes, the jobs a shop is asked for and returns, and, in later versions, the custody and logistics of what it makes and the runs that simulate it. Each record names the published standards it relates to (ISA-95 and its B2MM job order and response, MTConnect, OPC UA machine-tool companion specifications) by identifier.

Not in scope: any tool, platform or product; how any one party plans, schedules, prices or decides.

## How a change lands

1. Open an issue stating the change and why. A correction to a definition, a crosswalk or a status row is a change.
2. Open a pull request. Commits carry a Developer Certificate of Origin sign-off (`git commit -s`).
3. CI must pass: canonical form, `$id` equals the served URL, closure under `https://schemas.openplantfloor.org/`, every schema compiles, every example validates, public text clean, published versions immutable.
4. A maintainer reviews. The default branch takes squash merges only, linear history, no force pushes.

## Versions

- A **schema** carries a semantic version. A version, once published, never changes: new content is a new version, and every published version stays served at `v/{version}/{path}`.
- A **release** is a git tag `vX.Y.Z` on the default branch. The served site is rebuilt from the default branch on every merge.

## Licence, name and mark

The schemas and examples are licensed under the Apache License, Version 2.0 (see `LICENSE` and `NOTICE`). The name "Open Plant Floor" is held by the steward of record and transfers with stewardship. Anyone may say that a tool or a process implements Open Plant Floor, naming the schema versions it implements; no one may use the name to state or suggest that the steward endorses or certifies a product, a firm or a shop.

## Transfer of stewardship

When a standards body or consortium takes the standard on:

1. The incoming steward is added as an owner of the `openplantfloor` GitHub organisation; the outgoing steward removes itself.
2. The `openplantfloor.org` registration and DNS move to the incoming steward.
3. The incoming steward sets the `maintainers` team's membership. This file and `NOTICE` are updated in one pull request that names the date of transfer; `CODEOWNERS` does not change.
4. Nothing else changes: `$id`s, served paths, versions and the licence stay as they are.
