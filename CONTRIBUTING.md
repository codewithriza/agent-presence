# Contributing

Issues and pull requests are welcome. For bugs, include OS, Node version, tool name and steps to reproduce. Remove private paths, prompts and credentials from logs.

1. Fork and clone the repo.
2. Use Node.js 22+; no runtime dependencies are needed.
3. Run `npm test`.
4. Make a focused change and add behavior tests where useful.
5. Run `npm test` and `npm pack --dry-run --ignore-scripts`.
6. Open a pull request explaining the behavior and how you verified it.

Provider names and images live in `src/providers.js`. Prefer vendor-hosted image URLs, record attribution in `assets/SOURCES.md`, and distinguish branding support from real lifecycle integration.

Good first contributions: Windows named-pipe tests, stale-lock recovery, multi-publisher arbitration, official lifecycle hooks for more agents, or installation diagnostics. Never infer public task descriptions from private prompts by default.

CI configuration is provided in `docs/ci-example.yml`. A maintainer with GitHub workflow-write permissions can copy it to `.github/workflows/test.yml` to enable the Linux/macOS Node 22/24 matrix. Until then, checks run locally.
