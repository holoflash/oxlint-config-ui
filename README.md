# oxlint-config-ui

Inspired by https://github.com/eslint/config-inspector, the goal is to build an interactive UI to simplify Oxlint configuration. The goal is to make exploring rules and settings convenient: read descriptions, toggle available options, and update your .oxlintrc.json file directly from the interface.
The idea came from a desire to be able to quickly play around with the various rules and settings, and see their effects immediately.

### TODO
- Ability to rewrite local .oxlintrc.json file
- Ability to toggle existing rules ("error", "warn" etc.)
- Investigate how to bring in all the available rules and their descriptions
- Add more TODO's

[How to contribute](./CONTRIBUTE.md)

# bun-react-template

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun dev
```

To lint

```bash
bun lint
```

This project was created using `bun init` in bun v1.3.0. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

