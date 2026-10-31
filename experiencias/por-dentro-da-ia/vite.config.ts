import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "/observatorio-ia/por-dentro-da-ia/",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        home: `${root}index.html`,
        transformers: `${root}transformers/index.html`,
        "redes-neurais": `${root}redes-neurais/index.html`,
      },
    },
  },
});
