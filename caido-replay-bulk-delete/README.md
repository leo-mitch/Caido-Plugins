# Replay Bulk Delete

A Caido plugin for deleting many Replay sessions at once.

## Usage

1. Open the **Replay** tab and click **Bulk Delete** in the Replay top bar
   (or run **Replay: Bulk delete sessions** from the command palette).
2. Pick a collection (it defaults to the collection of the session you have open).
3. Tick the sessions you want to remove:
   - click a row to toggle it
   - **click and drag** over rows to tick (or untick) every row you pass over
   - **Shift+click** to select a range
   - **Select all** selects every session shown (it respects the filter box)
4. Click **Delete Selected**, then click again within 4 seconds to confirm.

The selected sessions are deleted permanently, and any open tabs for them are closed.

## Build

```sh
npm install
npm run build
```

In Caido, go to **Plugins → Install Package** and pick `dist/plugin_package.zip`.
