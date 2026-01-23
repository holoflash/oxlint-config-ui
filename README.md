# oxlint-rules-tui

A lightweight, dependency-free Node.js Terminal User Interface for browsing [oxlint](https://github.com/oxc-project/oxc) rules.

![screenshot](screenshot.png)

## Usage

Run the command in your terminal:

```bash
node tui.js < path to .oxlintrc.json >
```

If no path argument is provided, tries to read `.oxlintrc.json` in the running directory.