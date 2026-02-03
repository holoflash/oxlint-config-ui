# Contributing to oxlint-tui

Thank you for your interest in contributing!

## How to Contribute

1. **Fork the repository**
   - Click the "Fork" button at the top right of this repo's GitHub page.

2. **Clone your fork**
   - `git clone https://github.com/<your-username>/oxlint-config-ui.git`
   - `cd oxlint-tui`

3. **Create a new branch**
   - `git checkout -b your-feature-or-fix`

4. **Setup and workflow**
   - Run `npm install` to install dependencies. This will also set up our git hooks (we use [Husky](https://typicode.github.io/husky/)). If you ever notice hooks are not working, run `npx husky install` manually.
   - Run `npm run gen` to generate rule descriptions for local development.
   - Use `npm run lint` regularly to follow our best practices.
   - Make sure to run `npm run format` before you commit.
   - Before each commit, a pre-commit hook will automatically run `npm run format-check`, `npm run type-check`, and `npm run lint`. Your commit will be blocked if any of these checks fail.
   - Make sure to run `npm run build-run` and confirm that the built version is working as expected.

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
