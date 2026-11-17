import type { Caido } from "@caido/sdk-frontend";

import { openBulkDeleteModal } from "./modal";

const COMMAND_ID = "replay-bulk-delete.open";
// ReplaySlot is exported as a value by the SDK types but not at runtime, so use the raw slot id.
const REPLAY_TOPBAR = "topbar";

export const init = (sdk: Caido) => {
  const open = () => openBulkDeleteModal(sdk);

  sdk.commands.register(COMMAND_ID, {
    name: "Replay: Bulk delete sessions",
    run: open,
  });
  sdk.commandPalette.register(COMMAND_ID);

  sdk.replay.addToSlot(REPLAY_TOPBAR, {
    type: "Button",
    label: "Bulk Delete",
    icon: "fas fa-trash-can",
    onClick: open,
  });
};
