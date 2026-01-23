# oxlint-tui

A lightweight, dependency-free Node.js Terminal User Interface (TUI) for browsing, toggling and visualizing [oxlint](https://github.com/oxc-project/oxc) rules and the number of warnings/errors they produce when toggled ON.

![oxlint-tui-demo](https://github.com/user-attachments/assets/cefd05a6-8bda-4622-8adf-008402f856b4)

It automatically loads your local configuration to show you the status of the rules toggled in your project and allows you to toggle them by selecting a rule in the Rules pane and pressing <kbd>1</kbd>, <kbd>2</kbd>, or <kbd>3</kbd>. The config file is modified in real-time.

Pressing <kbd>r</kbd> will lint the project using "oxlint". Pressing <kbd>t</kbd> will lint include the oxlint-tsgolint package and lint the project using "oxlint --type-aware". The results are presented directly in the interface.

**NOTE**: At the moment, comments will be erased from your configuration file when adding or toggling rules.

![screenshot](https://raw.githubusercontent.com/holoflash/oxlint-tui/refs/heads/main/screenshot.png)

## Why?

Configuring linters often involves jumping between your editor, a massive JSON file, and web documentation. `oxlint-tui` tries to make the process easier by giving you an **interactive dashboard** right in your terminal.

## Features

* **Config Aware**: provides information about the rules used in your project by loading `.oxlintrc.json`.
* **Details**: View category, scope, fix, default and type-aware rule parameters at a glance.
* **View Docs**: Press <kbd>ENTER</kbd> on any rule to open its official documentation in your browser.
* **Zero Dependencies**: Written in pure Node.js without any heavy TUI libraries.

## Usage

### Quick Start (via npx)

Run it directly in your project folder (where your `.oxlintrc.json` is located):

```bash
npx oxlint-tui
```

### Custom Config Path

If your configuration file is located elsewhere or named differently:

```bash
npx oxlint-tui ./configs/oxlint.json
```

### Global Install

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
| **→** / **l** | Move focus Right (Categories <-> Rules) ||
| **1** |  Set selected rule to "off" |
| **2** |  Set selected rule to "warn" |
| **3** |  Set selected rule to "error" |
| **x** |  Run "oxlint" with the selected rule |
| **r** |  Run "oxlint with all enabled rules |
| **Enter** | Open Rule Documentation in Browser |
| **q** / **Esc** | Quit |

## Requirements

* Node.js >= 16
* `oxlint` (The tool runs `npx oxlint --rules --format=json` internally to fetch definitions)

## Roadmap

The goal is to build this into a tool that not only reads the information provided by the oxlint CLI and your configuration file -  but also allows to fully customize the configuration. Oxlint provides a lot more flexibility than just toggling rules on/off, so making this fully functional is going to require more work.

If you're willing and able, please feel free to [contribute to this project](https://github.com/holoflash/oxlint-tui/blob/main/CONTRIBUTING.md).

## License

MIT
