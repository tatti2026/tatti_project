import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss as any,
        autoprefixer as any,
      ],
    },
  },
  server: {
    port: 5173,
    allowedHosts: [
      ".up.railway.app",
      ".railway.app",
      "localhost",
      "127.0.0.1",
    ],
    hmr: {
      overlay: true,
    },
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: [
      ".up.railway.app",
      ".railway.app",
      "localhost",
      "127.0.0.1",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
});
