import { defineConfig } from "vite";

// Keep root deployment as the default. For repository-subpath hosting,
// set VITE_BASE_PATH at build time and update absolute public asset paths
// if the deployment target does not serve the site from its domain root.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  build: {
    sourcemap: false,
    reportCompressedSize: true,
  },
});
