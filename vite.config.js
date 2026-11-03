import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
 
// Merge the `server.proxy` block into your existing vite.config.ts.
// The API key stays on the dev server and is never shipped to the browser.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "") // loads AIRLY_API_KEY (no VITE_ prefix on purpose)
 
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      proxy: {
        "/airly": {
          target: "https://airapi.airly.eu",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/airly/, ""),
          headers: { apikey: env.AIRLY_API_KEY ?? "" },
        },
      },
    },
  }
})
 