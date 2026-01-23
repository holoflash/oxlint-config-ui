# oxlint-tui

A lightweight, dependency-free Node.js Terminal User Interface (TUI) for browsing and visualizing [oxlint](https://github.com/oxc-project/oxc) rules.

It automatically loads your local configuration to show you the status of the rules toggled in your project.

![screenshot](https://raw.githubusercontent.com/holoflash/oxlint-config-ui/refs/heads/main/screenshot.png)

## Why?

Configuring linters often involves jumping between your editor, a massive JSON file, and web documentation. `oxlint-tui` tries to make the process easier by giving you an **interactive dashboard** right in your terminal.

## Features

* **Config Aware**: provides information about the rules used in your project by loading `.oxlintrc.json`.
* **Details**: View category, scope, fix, default and type-aware rule parameters at a glance.
* **View Docs**: Press <kbd>ENTER</kbd> on any rule to open its official documentation in your browser.
* **Zero Dependencies**: Written in pure Node.js without any heavy TUI libraries.

## Usage

### 🚀 Quick Start (via npx)

Run it directly in your project folder (where your `.oxlintrc.json` is located):

```bash
npx oxlint-tui
```

### 📂 Custom Config Path

If your configuration file is located elsewhere or named differently:

```bash
npx oxlint-tui ./configs/oxlint.json
```

### 📦 Global Install

If you use oxlint frequently, you can install it globally:

```bash
npm install -g oxlint-tui

oxlint-tui
```

## Keyboard Controls

| Key | Action |
| :--- | :--- |
| **↑** / **k** | Move selection Up |
| **↓** / **j** | Move selection Down |
| **←** / **h** | Move focus Left (Categories <-> Rules) |
| **→** / **l** | Move focus Right (Categories <-> Rules) |
| **Enter** | Open Rule Documentation in Browser |
| **q** / **Esc** | Quit |

## Requirements

* Node.js >= 16
* `oxlint` (The tool runs `npx oxlint --rules --format=json` internally to fetch definitions)

## Roadmap

The goal is to build this into a tool that not only reads the information provided by the oxlint CLI and your configuration file -  but also allows to create the configuration. Oxlint provides a lot more flexibility than just toggling rules on/off, so making this fully functional is going to require more work.

If you're willing and able, please feel free to contribute to this project and help expanding it.

## License

MIT