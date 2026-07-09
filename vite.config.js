import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const src = (file) => fileURLToPath(new URL(`./src/${file}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "next/link": src("pascal/next-link.jsx"),
      "next/image": src("pascal/next-image.jsx")
    }
  }
});
