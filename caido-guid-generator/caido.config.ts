import { defineConfig } from "@caido-community/dev";

export default defineConfig({
  id: "guid-generator",
  name: "GUID Generator",
  description: "Adds a footer button that generates a GUID and copies it to the clipboard.",
  version: "1.0.1",
  author: {
    name: "return",
  },
  plugins: [
    {
      kind: "frontend",
      id: "guid-generator-frontend",
      name: "GUID Generator",
      root: "packages/frontend",
    },
  ],
});
