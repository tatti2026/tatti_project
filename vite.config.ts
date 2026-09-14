import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
// Fix for Vite 8 / Rolldown / sucrase bug that misparses CSS custom property
// percentage values (e.g. `222 37% 18%`) as JavaScript syntax.
// Explicitly import PostCSS plugins and declare them in the css.postcss block
// so Vite uses its own PostCSS pipeline instead of the broken sucrase path.
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
    hmr: {
      overlay: true,
    },
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
