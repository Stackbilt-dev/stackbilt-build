# Changelog

All notable changes to this project are documented in this file.

The format is based on Keep a Changelog and follows Semantic Versioning.

## [0.3.0] - 2026-06-12

### Changed
- **`stackbilt run` is now offline-first** — `buildScaffold()` from `@stackbilt/scaffold-core` is the default path; zero network, zero credentials required. Pass `--gateway` to opt into the Stackbilt gateway for cloud classification.
- `--persist` flag: POST the scaffold to the platform (`/api/flows`) to save it to the user's account.
- `--oracle` flag (requires `--persist`): request LLM polish on the persisted scaffold.
- Removed implicit gateway routing from API key presence — gateway is now always explicit opt-in.

### Added
- **`stackbilt classify <description>`** — zero-cost intent classification using the local scaffold-core engine. Prints pattern, confidence, traits, and tier-2 recommendation to stdout. No API key required.
- `localScaffoldToResult()` adapter — maps `LocalScaffoldResult` → `ScaffoldResult` with canonical role normalization (`entry→scaffold`, `adf→governance`, `readme→doc`).
- `.gitignore` — `node_modules/`, `dist/`, `*.tsbuildinfo`, `.charter/`.

Closes stackbilt-build#4 (offline-first run), stackbilt-build#3 (classify command)

## [0.1.0] - 2026-05-23

Initial release — commercial surface extracted from `@stackbilt/cli` per [RFC #112](https://github.com/Stackbilt-dev/charter/issues/112).

### Added

- `stackbilt login` — API key management for Stackbilt Engine
- `stackbilt architect` — generate a tech stack from a project description
- `stackbilt run` — architect + scaffold in one step
- `stackbilt scaffold` — write scaffold files from the last build
