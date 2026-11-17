# GUID Generator

A Caido plugin that adds a **GUID** button to the footer (next to Logs / Commands).
Click it to generate a GUID and copy it to your clipboard.

Also available from the command palette as **Generate GUIDv4**.

## Build

```sh
npm install
npm run build
```

Install `dist/plugin_package.zip` in Caido via **Plugins → Install Package**.

## Settings

Open **GUID Generator** from the Plugins section of the sidebar to choose:

- **Type:** v4 (random, default), v7 (time-ordered), v1 (time-based), or Nil
- **Format:** hyphens, uppercase, `{braces}`

Settings are saved and used by the footer button and the command palette entry.
