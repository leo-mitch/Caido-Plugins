import { defineConfig } from "@caido-community/dev";

export default defineConfig({
  id: "replay-bulk-delete",
  name: "Replay Bulk Delete",
  description: "Select multiple Replay sessions in a collection and delete them in one click.",
  version: "1.0.1",
  author: {
    name: "return",
  },
  plugins: [
    {
      kind: "frontend",
      id: "replay-bulk-delete-frontend",
      name: "Replay Bulk Delete",
      root: "packages/frontend",
    },
  ],
});
