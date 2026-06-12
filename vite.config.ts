import { defineConfig } from "vite";
// @ts-expect-error - IDE TS server moduleResolution mismatch
import react from "@vitejs/plugin-react";
// @ts-expect-error - IDE TS server moduleResolution mismatch
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: {
        entry: "src/server.ts",
      },
      spa: {
        enabled: true,
      },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
