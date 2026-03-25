# Contributing to Nemotron Baseten Provider

Thank you for your interest in contributing! This project relies on **Bun** and **Biome** to maintain blazing fast execution, strict formatting, and safety.

## Getting Started

1. **Fork the repository** and clone it locally.
2. Ensure you have [Bun](https://bun.sh) installed.
3. Install dependencies:
   ```bash
   bun install
   ```
4. To test your proxy locally, pass your Baseten API key to the dev server:
   ```bash
   BASETEN_API_KEY=your_key bun run src/cli.ts
   ```

## Workflow & Quality Gates

This repo uses **Biome** as its formatter and linter.
Before opening a PR, ensure that your code strictly passes our quality checks.

```bash
# Format your changes
bun run format

# Run the linter
bun run lint

# Run unit tests natively via bun:test
bun run test
```

## Pull Request Guidelines
- All PRs must pass the `.github/workflows/quality.yml` checks (Biome lint + Bun test).
- Include tests for any new parser rules (e.g., if Nemotron adopts a new XML block style).
- Ensure your commit messages are descriptive.

*Building OpenCode together! ✨*
