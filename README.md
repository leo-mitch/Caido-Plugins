# Caido-Plugins
personal caido plugins

| Plugin | Description |
| --- | --- |
| [caido-guid-generator](caido-guid-generator) | Footer button and command that generate a GUID (v4/v7/v1/Nil) and copy it to the clipboard. |
| [caido-replay-bulk-delete](caido-replay-bulk-delete) | Select multiple Replay sessions in a collection (click, Shift+click, or click-and-drag) and delete them all at once. |

## Build a plugin

```sh
cd <plugin-folder>
npm install
npm run build
```

In Caido, go to **Plugins → Install Package** and pick `dist/plugin_package.zip`.
