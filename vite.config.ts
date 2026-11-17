import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    /* Só no desenvolvimento: com VITE_PANORAMA_DEV=1, o Panorama local (porta 4821)
       aparece em /panorama-dev/ para testar dados antes de publicá-los. */
    proxy: {
      "/panorama-dev": { target: "http://127.0.0.1:4821", rewrite: (path) => path.replace(/^\/panorama-dev/, "") },
    },
  },
});
