# Contributing to oxlint-tui

Thank you for your interest in contributing!

## Prerequisites

This project uses [Vite+](https://viteplus.dev/) (`vp`) as its unified toolchain. You need to install `vp` globally before getting started.

### Install `vp`

**macOS / Linux:**

```sh
curl -fsSL https://vite.plus | bash
```

**Windows:**

```sh
irm https://vite.plus/ps1 | iex
```

After installation, open a new shell and verify by running:

```sh
vp help
```

> For more details, see the [Vite+ Getting Started guide](https://viteplus.dev/guide/).

## How to Contribute

1. **Fork the repository**
   - Click the "Fork" button at the top right of this repo's GitHub page.

2. **Clone your fork**
   - `git clone https://github.com/<your-username>/oxlint-config-ui.git`
   - `cd oxlint-tui`

3. **Create a new branch**
   - `git checkout -b your-feature-or-fix`

4. **Setup and workflow**
   - Run `vp install` to install dependencies. This will also set up our git hooks via [Vite+ commit hooks](https://viteplus.dev/guide/commit-hooks) (`.vite-hooks`).
   - Run `vp run gen` to generate rule descriptions for local development.
   - Use `vp lint` regularly to follow our best practices.
   - Before each commit, a pre-commit hook will automatically run `vp staged`. Your commit will be blocked if any checks fail.
   - Make sure to run `vp run build-run` and confirm that the built version is working as expected.

5. **Commit and push your changes**
   - `git add .`
   - Follow [conventional commit rules](https://www.conventionalcommits.org/en/v1.0.0/) for naming commits where applicable
   - `git commit -m "feat: Describe your change"`
   - `git push origin your-feature-or-fix`

6. **Open a Pull Request**
   - Go to your fork on GitHub and click "Compare & pull request".
   - Describe what you have done and submit PR for review.

## Questions or Suggestions?

- Feel free to suggest new features or improvements by [creating an issue](https://github.com/holoflash/oxlint-tui/issues).
